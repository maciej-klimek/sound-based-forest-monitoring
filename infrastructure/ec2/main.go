package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	awsConfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/sqs"

	"github.com/maciej-klimek/sound-based-forest-monitoring/infrastructure/ec2/config"
	"github.com/maciej-klimek/sound-based-forest-monitoring/infrastructure/ec2/handlers"
	processor "github.com/maciej-klimek/sound-based-forest-monitoring/infrastructure/ec2/processor"
	"github.com/maciej-klimek/sound-based-forest-monitoring/infrastructure/ec2/queue"
	"github.com/maciej-klimek/sound-based-forest-monitoring/infrastructure/ec2/repository"
)

func main() {
	ctx, cancel := signalContext()
	defer cancel()

	if err := config.Load(); err != nil {
		log.Fatal(err)
	}

	awsCfg, err := awsConfig.LoadDefaultConfig(ctx, awsConfig.WithRegion(config.AppConfig.AWS.Region))
	if err != nil {
		log.Fatal(err)
	}

	logger := log.New(os.Stdout, "", log.LstdFlags|log.Lmicroseconds)

	sqsCli := sqs.NewFromConfig(awsCfg)
	ddbCli := dynamodb.NewFromConfig(awsCfg)

	repo := repository.NewAlertsRepo(ddbCli, config.AppConfig.AWS.AlertsTable)

	// tu narazie ustawiasz ttl dla kazdego alertu
	mem := processor.NewMemory(2 * time.Minute)
	h := handlers.NewHandler(repo, mem, logger)

	consumer := queue.NewConsumer(sqsCli, config.AppConfig.AWS.SQSURL, h.HandleEnvelope, logger)

	logger.Printf("worker online; queue=%s table=%s", config.AppConfig.AWS.SQSURL, config.AppConfig.AWS.AlertsTable)
	consumer.Run(ctx)
}

func signalContext() (context.Context, context.CancelFunc) {
	ctx, cancel := context.WithCancel(context.Background())
	ch := make(chan os.Signal, 1)
	signal.Notify(ch, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		<-ch
		cancel()
	}()
	return ctx, cancel
}

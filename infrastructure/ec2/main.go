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
	"github.com/maciej-klimek/sound-based-forest-monitoring/infrastructure/ec2/router"
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

	repo := repository.NewRepo(ddbCli, config.AppConfig.AWS.AlertsTable, config.AppConfig.AWS.DevicesTable)

	// tu narazie ustawiasz ttl dla kazdego alertu
	mem := processor.NewMemory(2 * time.Minute)
	h := handlers.NewHandler(repo, mem, logger)

	go func() {
		ticker := time.NewTicker(10 * time.Second)
		defer ticker.Stop()
		for range ticker.C {
			h.CleanOldSources(5 * time.Minute)
		}
	}()

	r := router.SetupRouter(h)
	go func() {
		port := ":8080"
		logger.Printf("HTTP server listening on %s", port)
		if err := r.Run(port); err != nil {
			logger.Fatalf("HTTP server error: %v", err)
		}
	}()
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

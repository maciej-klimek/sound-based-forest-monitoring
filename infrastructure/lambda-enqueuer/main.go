package main

import (
	"context"
	"encoding/json"
	"log"
	"os"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/sqs"
)

type msg struct {
	DeviceID string `json:"deviceId"`
	TS       string `json:"ts"`
}

var (
	sqsCli   *sqs.Client
	queueURL string
)

func init() {
	cfg, err := config.LoadDefaultConfig(context.Background())
	if err != nil {
		panic(err)
	}
	sqsCli = sqs.NewFromConfig(cfg)

	queueURL = os.Getenv("QUEUE_URL")
	if queueURL == "" {
		panic("missing QUEUE_URL")
	}
}

func handler(ctx context.Context, e events.DynamoDBEvent) error {
	for _, r := range e.Records {
		if r.EventName != "INSERT" {
			continue
		}
		ni := r.Change.NewImage
		dev := ni["deviceId"].String()
		ts := ni["ts"].String()
		s3k := ni["s3Key"].String()
		if dev == "" || ts == "" || s3k == "" {
			log.Printf("skip record with missing fields: deviceId=%q ts=%q s3Key=%q", dev, ts, s3k)
			continue
		}

		b, _ := json.Marshal(msg{DeviceID: dev, TS: ts})
		_, err := sqsCli.SendMessage(ctx, &sqs.SendMessageInput{
			QueueUrl:       &queueURL,
			MessageBody:    awsString(string(b)),
			MessageGroupId: awsString(dev),
		})
		if err != nil {
			return err
		}
	}
	return nil
}

func awsString(s string) *string { return &s }

func main() { lambda.Start(handler) }

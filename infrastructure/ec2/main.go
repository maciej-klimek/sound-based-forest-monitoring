package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
	"github.com/aws/aws-sdk-go-v2/service/sqs"
)

type envelope struct {
	DeviceID string `json:"deviceId"`
	TS       string `json:"ts"`
	S3Key    string `json:"s3Key"`
}

func main() {
	ctx := context.Background()

	queueURL := os.Getenv("QUEUE_URL")
	alertsTable := os.Getenv("ALERTS_TABLE")
	if queueURL == "" || alertsTable == "" {
		log.Fatalf("missing QUEUE_URL or ALERTS_TABLE")
	}

	cfg, err := config.LoadDefaultConfig(ctx)
	if err != nil {
		log.Fatal(err)
	}

	sqsCli := sqs.NewFromConfig(cfg)
	ddb := dynamodb.NewFromConfig(cfg)

	log.Printf("worker online; queue=%s table=%s", queueURL, alertsTable)

	for {
		out, err := sqsCli.ReceiveMessage(ctx, &sqs.ReceiveMessageInput{
			QueueUrl:            &queueURL,
			MaxNumberOfMessages: 1,
			WaitTimeSeconds:     20,
			VisibilityTimeout:   60,
		})
		if err != nil {
			log.Printf("receive error: %v", err)
			time.Sleep(2 * time.Second)
			continue
		}
		if len(out.Messages) == 0 {
			continue
		}

		for _, m := range out.Messages {
			var env envelope
			if err := json.Unmarshal([]byte(*m.Body), &env); err != nil {
				log.Printf("bad message: %v; body=%s", err, *m.Body)
				continue
			}

			it, err := ddb.GetItem(ctx, &dynamodb.GetItemInput{
				TableName: &alertsTable,
				Key: map[string]types.AttributeValue{
					"deviceId": &types.AttributeValueMemberS{Value: env.DeviceID},
					"ts":       &types.AttributeValueMemberS{Value: env.TS},
				},
				ConsistentRead: awsBool(true),
			})
			if err != nil {
				log.Printf("ddb get error: %v", err)
			}

			fmt.Println("=== ALERT ===")
			fmt.Printf("deviceId: %s\n", env.DeviceID)
			fmt.Printf("ts      : %s\n", env.TS)
			fmt.Printf("s3Key   : %s\n", env.S3Key)
			if it.Item != nil {
				fmt.Printf("ddb.item: %+v\n", it.Item)
			} else {
				fmt.Printf("ddb.item: <nil>\n")
			}
			fmt.Println("=============")

			_, _ = sqsCli.DeleteMessage(ctx, &sqs.DeleteMessageInput{
				QueueUrl:      &queueURL,
				ReceiptHandle: m.ReceiptHandle,
			})
		}
	}
}

func awsBool(b bool) *bool { return &b }

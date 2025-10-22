package queue

import (
	"context"
	"encoding/json"
	"log"
	"time"

	"github.com/aws/aws-sdk-go-v2/service/sqs"
	models "github.com/maciej-klimek/sound-based-forest-monitoring/infrastructure/ec2/models"
)

type HandlerFunc func(ctx context.Context, env models.Envelope) error

type Consumer struct {
	sqs      *sqs.Client
	queueURL string
	handle   HandlerFunc
	logger   *log.Logger
}

func NewConsumer(sqsCli *sqs.Client, queueURL string, handler HandlerFunc, logger *log.Logger) *Consumer {
	return &Consumer{sqs: sqsCli, queueURL: queueURL, handle: handler, logger: logger}
}

func (c *Consumer) Run(ctx context.Context) {
	c.logger.Printf("SQS consumer started; queue=%s", c.queueURL)
	for {
		select {
		case <-ctx.Done():
			return
		default:
		}

		out, err := c.sqs.ReceiveMessage(ctx, &sqs.ReceiveMessageInput{
			QueueUrl:            &c.queueURL,
			MaxNumberOfMessages: 1,
			WaitTimeSeconds:     20,
			VisibilityTimeout:   60,
		})
		if err != nil {
			c.logger.Printf("receive error: %v", err)
			time.Sleep(2 * time.Second)
			continue
		}
		if len(out.Messages) == 0 {
			continue
		}

		for _, m := range out.Messages {
			var env models.Envelope
			if err := json.Unmarshal([]byte(*m.Body), &env); err != nil {
				c.logger.Printf("bad message: %v; body=%s", err, *m.Body)
				continue
			}

			if err := c.handle(ctx, env); err != nil {
				c.logger.Printf("handler error: %v", err)
				continue
			}

			_, _ = c.sqs.DeleteMessage(ctx, &sqs.DeleteMessageInput{
				QueueUrl:      &c.queueURL,
				ReceiptHandle: m.ReceiptHandle,
			})
		}
	}
}

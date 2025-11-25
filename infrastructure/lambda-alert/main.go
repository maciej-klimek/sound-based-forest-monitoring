package main

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	ddbt "github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	s3types "github.com/aws/aws-sdk-go-v2/service/s3/types"
)

type alertReq struct {
	DeviceID string  `json:"deviceId"`
	TS       string  `json:"ts"`
	Lat      float64 `json:"lat"`
	Lon      float64 `json:"lon"`
	Distance float64 `json:"distance"`
	AudioB64 string  `json:"audioB64"`
}

type resp struct {
	OK     bool   `json:"ok"`
	S3Key  string `json:"s3Key"`
	Ts     string `json:"ts"`
	Sha256 string `json:"sha256"`
}

var (
	ddb         *dynamodb.Client
	s3c         *s3.Client
	alertsTbl   string
	devicesTbl  string
	audioBucket string
)

func init() {
	cfg, err := config.LoadDefaultConfig(context.Background())
	if err != nil {
		panic(err)
	}
	ddb = dynamodb.NewFromConfig(cfg)
	s3c = s3.NewFromConfig(cfg)
	alertsTbl = os.Getenv("ALERTS_TABLE")
	devicesTbl = os.Getenv("DEVICES_TABLE")
	audioBucket = os.Getenv("AUDIO_BUCKET")
}

func handler(ctx context.Context, req events.APIGatewayV2HTTPRequest) (events.APIGatewayV2HTTPResponse, error) {
	if req.RequestContext.HTTP.Method != "POST" {
		return jsonResp(405, map[string]string{"error": "method not allowed"})
	}
	var in alertReq
	if err := json.Unmarshal([]byte(req.Body), &in); err != nil {
		return jsonResp(400, map[string]string{"error": "invalid json"})
	}
	if in.DeviceID == "" || in.AudioB64 == "" {
		return jsonResp(400, map[string]string{"error": "deviceId and audioB64 required"})
	}
	if strings.TrimSpace(in.TS) == "" {
		in.TS = time.Now().UTC().Format(time.RFC3339)
	}

	audioBytes, err := base64.StdEncoding.DecodeString(in.AudioB64)
	if err != nil {
		return jsonResp(400, map[string]string{"error": "invalid base64"})
	}

	sum := sha256.Sum256(audioBytes)
	sha := hex.EncodeToString(sum[:])
	shaB64 := base64.StdEncoding.EncodeToString(sum[:])

	datePath := strings.ReplaceAll(in.TS[:19], ":", "-")
	key := fmt.Sprintf("%s/%s/%s.wav", in.DeviceID, in.TS[:10], datePath)

	_, err = s3c.PutObject(ctx, &s3.PutObjectInput{
		Bucket:               aws.String(audioBucket),
		Key:                  aws.String(key),
		Body:                 bytes.NewReader(audioBytes),
		ContentType:          aws.String("audio/wav"),
		ChecksumSHA256:       aws.String(shaB64),
		ServerSideEncryption: s3types.ServerSideEncryptionAes256,
		Metadata: map[string]string{
			"deviceId": in.DeviceID,
			"ts":       in.TS,
			"lat":      strconv.FormatFloat(in.Lat, 'f', -1, 64),
			"lon":      strconv.FormatFloat(in.Lon, 'f', -1, 64),
			"checksum": sha,
		},
	})
	if err != nil {
		return jsonResp(500, map[string]string{"error": "s3 put failed: " + err.Error()})
	}

	now := time.Now().UTC().Format(time.RFC3339)
	item := map[string]ddbt.AttributeValue{
		"deviceId":  &ddbt.AttributeValueMemberS{Value: in.DeviceID},
		"ts":        &ddbt.AttributeValueMemberS{Value: in.TS},
		"s3Key":     &ddbt.AttributeValueMemberS{Value: key},
		"lat":       &ddbt.AttributeValueMemberN{Value: strconv.FormatFloat(in.Lat, 'f', -1, 64)},
		"lon":       &ddbt.AttributeValueMemberN{Value: strconv.FormatFloat(in.Lon, 'f', -1, 64)},
		"distance":  &ddbt.AttributeValueMemberN{Value: strconv.FormatFloat(in.Distance, 'f', -1, 64)},
		"status":    &ddbt.AttributeValueMemberS{Value: "NEW"},
		"checksum":  &ddbt.AttributeValueMemberS{Value: sha},
		"createdAt": &ddbt.AttributeValueMemberS{Value: now},
	}
	_, err = ddb.PutItem(ctx, &dynamodb.PutItemInput{
		TableName: aws.String(alertsTbl),
		Item:      item,
	})
	if err != nil {
		return jsonResp(500, map[string]string{"error": "ddb put failed: " + err.Error()})
	}

	_, err = ddb.UpdateItem(ctx, &dynamodb.UpdateItemInput{
		TableName: aws.String(devicesTbl),
		Key: map[string]ddbt.AttributeValue{
			"deviceId": &ddbt.AttributeValueMemberS{Value: in.DeviceID},
		},
		ConditionExpression: aws.String("attribute_exists(deviceId)"),
		UpdateExpression:    aws.String("SET lastSeen = :ls"),
		ExpressionAttributeValues: map[string]ddbt.AttributeValue{
			":ls": &ddbt.AttributeValueMemberS{Value: now},
		},
	})
	if err != nil {
		fmt.Printf("warn: failed to update device lastSeen for deviceId=%s: %v\n", in.DeviceID, err)
	}

	return jsonResp(201, resp{OK: true, S3Key: key, Ts: in.TS, Sha256: sha})
}

func jsonResp(code int, v any) (events.APIGatewayV2HTTPResponse, error) {
	b, _ := json.Marshal(v)
	return events.APIGatewayV2HTTPResponse{
		StatusCode: code,
		Headers: map[string]string{
			"Content-Type":                "application/json",
			"Access-Control-Allow-Origin": "*",
			"Cache-Control":               "no-store",
		},
		Body: string(b),
	}, nil
}

func main() { lambda.Start(handler) }

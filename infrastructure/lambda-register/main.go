package main

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"log"
	"os"
	"strconv"
	"time"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
	"github.com/google/uuid"
)

type registerReq struct {
	Lat float64 `json:"lat"`
	Lon float64 `json:"lon"`
}
type registerResp struct {
	DeviceID     string `json:"deviceId"`
	DeviceSecret string `json:"deviceSecret"`
}

var (
	ddb     *dynamodb.Client
	tabName string
)

func init() {
	tabName = os.Getenv("DEVICES_TABLE")
	if tabName == "" {
		log.Fatal("DEVICES_TABLE env is required")
	}
	cfg, err := config.LoadDefaultConfig(context.Background())
	if err != nil {
		log.Fatal(err)
	}
	ddb = dynamodb.NewFromConfig(cfg)
}

func randSecret(n int) (string, string, error) {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		return "", "", err
	}
	secret := base64.StdEncoding.EncodeToString(b)
	h := sha256.Sum256([]byte(secret))
	return secret, base64.StdEncoding.EncodeToString(h[:]), nil
}

func handler(ctx context.Context, req events.APIGatewayV2HTTPRequest) (events.APIGatewayV2HTTPResponse, error) {
	if req.RequestContext.HTTP.Method != "POST" {
		return events.APIGatewayV2HTTPResponse{StatusCode: 405}, nil
	}
	var r registerReq
	if err := json.Unmarshal([]byte(req.Body), &r); err != nil {
		return jsonResp(400, map[string]string{"error": "invalid json"})
	}

	deviceID := uuid.New().String()
	secret, _, err := randSecret(24)
	if err != nil {
		return jsonResp(500, map[string]string{"error": err.Error()})
	}

	now := time.Now().UTC().Format(time.RFC3339)
	item := map[string]types.AttributeValue{
		"deviceId":     &types.AttributeValueMemberS{Value: deviceID},
		"deviceSecret": &types.AttributeValueMemberS{Value: secret},
		"firstSeen":    &types.AttributeValueMemberS{Value: now},
		"lastSeen":     &types.AttributeValueMemberS{Value: now},
		"lat":          &types.AttributeValueMemberN{Value: strconv.FormatFloat(r.Lat, 'f', -1, 64)},
		"lon":          &types.AttributeValueMemberN{Value: strconv.FormatFloat(r.Lon, 'f', -1, 64)},
	}

	_, err = ddb.PutItem(ctx, &dynamodb.PutItemInput{
		TableName:           aws.String(tabName),
		Item:                item,
		ConditionExpression: aws.String("attribute_not_exists(deviceId)"),
	})
	if err != nil {
		return jsonResp(500, map[string]string{"error": err.Error()})
	}

	return jsonResp(201, registerResp{DeviceID: deviceID, DeviceSecret: secret})
}

func jsonResp(code int, v any) (events.APIGatewayV2HTTPResponse, error) {
	b, _ := json.Marshal(v)
	return events.APIGatewayV2HTTPResponse{
		StatusCode: code,
		Headers: map[string]string{
			"Content-Type":                "application/json",
			"Cache-Control":               "no-store",
			"Access-Control-Allow-Origin": "*",
		},
		Body: string(b),
	}, nil
}

func main() { lambda.Start(handler) }

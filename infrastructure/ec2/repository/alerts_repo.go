package repository

import (
	"context"
	"errors"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
	"github.com/maciej-klimek/sound-based-forest-monitoring/infrastructure/ec2/models"
)

type Repo struct {
	ddb          *dynamodb.Client
	alertsTable  string
	sensorsTable string
}

func NewRepo(ddb *dynamodb.Client, alertsTable, sensorsTable string) *Repo {
	return &Repo{ddb: ddb, alertsTable: alertsTable, sensorsTable: sensorsTable}
}

func (r *Repo) GeAlertByPK(ctx context.Context, deviceID, ts string, consistent bool) (*models.Alert, error) {
	out, err := r.ddb.GetItem(ctx, &dynamodb.GetItemInput{
		TableName: &r.alertsTable,
		Key: map[string]types.AttributeValue{
			"deviceId": &types.AttributeValueMemberS{Value: deviceID},
			"ts":       &types.AttributeValueMemberS{Value: ts},
		},
		ConsistentRead: &consistent,
	})
	if err != nil {
		return nil, err
	}
	if out.Item == nil {
		return nil, nil
	}
	var a models.Alert
	if err := attributevalue.UnmarshalMap(out.Item, &a); err != nil {
		return nil, err
	}

	if a.DeviceID == "" || a.TS == "" {
		return nil, errors.New("malformed item")
	}
	return &a, nil
}

func (r *Repo) GetAlertsLastHour(ctx context.Context) ([]models.Alert, error) {
	now := time.Now().UTC()
	from := now.Add(-1 * time.Hour).Format(time.RFC3339)
	to := now.Format(time.RFC3339)

	input := &dynamodb.ScanInput{
		TableName:        aws.String(r.alertsTable),
		FilterExpression: aws.String("#ts BETWEEN :from AND :to"),
		ExpressionAttributeNames: map[string]string{
			"#ts": "ts",
		},
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":from": &types.AttributeValueMemberS{Value: from},
			":to":   &types.AttributeValueMemberS{Value: to},
		},
	}

	var all []models.Alert
	p := dynamodb.NewScanPaginator(r.ddb, input)

	for p.HasMorePages() {
		page, err := p.NextPage(ctx)
		if err != nil {
			return nil, err
		}
		var pageAlerts []models.Alert
		if err := attributevalue.UnmarshalListOfMaps(page.Items, &pageAlerts); err != nil {
			return nil, err
		}
		all = append(all, pageAlerts...)
	}

	return all, nil
}

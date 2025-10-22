package repository

import (
	"context"
	"errors"

	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
	models "github.com/maciej-klimek/sound-based-forest-monitoring/infrastructure/ec2/models"
)

type AlertsRepo struct {
	ddb   *dynamodb.Client
	table string
}

func NewAlertsRepo(ddb *dynamodb.Client, table string) *AlertsRepo {
	return &AlertsRepo{ddb: ddb, table: table}
}

func (r *AlertsRepo) GetByPK(ctx context.Context, deviceID, ts string, consistent bool) (*models.Alert, error) {
	out, err := r.ddb.GetItem(ctx, &dynamodb.GetItemInput{
		TableName: &r.table,
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

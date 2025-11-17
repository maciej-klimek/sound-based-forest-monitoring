package repository

import (
	"context"
	"strconv"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
	"github.com/maciej-klimek/sound-based-forest-monitoring/infrastructure/ec2/models"
)

func (r *Repo) GetAllSensors(ctx context.Context) ([]models.Sensor, error) {
	input := &dynamodb.ScanInput{
		TableName: aws.String(r.sensorsTable),
	}
	out, err := r.ddb.Scan(ctx, input)
	if err != nil {
		return nil, err
	}

	sensors := make([]models.Sensor, 0, len(out.Items))
	for _, item := range out.Items {
		var s models.Sensor

		if v, ok := item["deviceId"].(*types.AttributeValueMemberS); ok {
			s.DeviceID = v.Value
		}
		if v, ok := item["deviceSecret"].(*types.AttributeValueMemberS); ok {
			s.DeviceSecret = v.Value
		}
		if v, ok := item["firstSeen"].(*types.AttributeValueMemberS); ok {
			if t, err := time.Parse(time.RFC3339, v.Value); err == nil {
				s.FirstSeen = t
			}
		}
		if v, ok := item["lastSeen"].(*types.AttributeValueMemberS); ok {
			if t, err := time.Parse(time.RFC3339, v.Value); err == nil {
				s.LastSeen = t
			}
		}
		if v, ok := item["lat"].(*types.AttributeValueMemberN); ok {
			if f, err := strconv.ParseFloat(v.Value, 64); err == nil {
				s.Lat = f
			}
		}
		if v, ok := item["lon"].(*types.AttributeValueMemberN); ok {
			if f, err := strconv.ParseFloat(v.Value, 64); err == nil {
				s.Lon = f
			}
		}

		sensors = append(sensors, s)
	}

	return sensors, nil
}

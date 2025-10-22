package model

type Envelope struct {
	DeviceID string `json:"deviceId"`
	TS       string `json:"ts"`
}

type Alert struct {
	DeviceID  string  `dynamodbav:"deviceId"  json:"deviceId"`
	TS        string  `dynamodbav:"ts"        json:"ts"`
	S3Key     string  `dynamodbav:"s3Key"     json:"s3Key"`
	Lat       float64 `dynamodbav:"lat"       json:"lat"`
	Lon       float64 `dynamodbav:"lon"       json:"lon"`
	Status    string  `dynamodbav:"status"    json:"status"`
	Checksum  string  `dynamodbav:"checksum"  json:"checksum"`
	CreatedAt string  `dynamodbav:"createdAt" json:"createdAt"`
}

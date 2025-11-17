package models

import "time"

type Sensor struct {
	DeviceID     string    `json:"deviceId"`
	DeviceSecret string    `json:"deviceSecret"`
	FirstSeen    time.Time `json:"firstSeen"`
	LastSeen     time.Time `json:"lastSeen"`
	Lat          float64   `json:"lat"`
	Lon          float64   `json:"lon"`
}

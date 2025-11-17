package models

import "time"

type Sensor struct {
	DeviceID  string    `json:"deviceId"`
	FirstSeen time.Time `json:"firstSeen"`
	LastSeen  time.Time `json:"lastSeen"`
	Lat       float64   `json:"lat"`
	Lon       float64   `json:"lon"`
}

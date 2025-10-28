package main

import (
	"encoding/json"
	"os"
)

type Sensor struct {
	ID        int     `json:"id"`
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
}

func LoadSensors() ([]Sensor, error) {
	data, err := os.ReadFile("sensors.json")
	if err != nil {
		return nil, err
	}
	var sensors []Sensor
	if err := json.Unmarshal(data, &sensors); err != nil {
		return nil, err
	}
	return sensors, nil
}

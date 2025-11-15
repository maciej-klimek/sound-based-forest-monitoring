package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"time"
)

type Alert struct {
	ID        int     `json:"id"`
	SensorID  int     `json:"sensor_id"`
	Timestamp string  `json:"timestamp"`
	Distance  float64 `json:"distance"`
}

type ActiveAlert struct {
	Sensor   Sensor
	Distance float64
}

func LoadAlerts() ([]Alert, error) {
	var alerts []Alert
	files, err := filepath.Glob("mock-data/alerts/*.json")
	if err != nil {
		return nil, err
	}
	for _, f := range files {
		data, err := os.ReadFile(f)
		if err != nil {
			return nil, err
		}
		var a Alert
		if err := json.Unmarshal(data, &a); err != nil {
			return nil, err
		}
		alerts = append(alerts, a)
	}
	return alerts, nil
}

func ActiveAlerts(current time.Time, alerts []Alert, sensors []Sensor, duration time.Duration) []ActiveAlert {
	var active []ActiveAlert
	for _, a := range alerts {
		t, _ := time.Parse(time.RFC3339, a.Timestamp)
		if current.After(t) && current.Before(t.Add(duration)) {
			for _, s := range sensors {
				if s.ID == a.SensorID {
					active = append(active, ActiveAlert{Sensor: s, Distance: a.Distance})
				}
			}
		}
	}
	return active
}

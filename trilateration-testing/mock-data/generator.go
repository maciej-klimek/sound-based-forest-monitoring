package main

import (
	"encoding/json"
	"fmt"
	"math/rand"
	"os"
	"time"
)

type Sensor struct {
	ID        int     `json:"id"`
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
}

type Alert struct {
	ID        int     `json:"id"`
	SensorID  int     `json:"sensor_id"`
	Timestamp string  `json:"timestamp"`
	Distance  float64 `json:"distance"`
}

func randFloat(min, max float64) float64 {
	return min + rand.Float64()*(max-min)
}

func main() {
	numSensors := 50
	numAlerts := 30
	activeTime := "2025-10-08T17:00:00Z"

	if numAlerts > numSensors {
		fmt.Printf("WARNING: numAlerts > numSensors, limiting alerts to %d\n", numSensors)
		numAlerts = numSensors
	}

	rand.Seed(time.Now().UnixNano())

	minLat, maxLat := 50.03, 50.08
	minLon, maxLon := 19.89, 19.99

	sensors := make([]Sensor, numSensors)
	for i := 0; i < numSensors; i++ {
		sensors[i] = Sensor{
			ID:        i + 1,
			Latitude:  randFloat(minLat, maxLat),
			Longitude: randFloat(minLon, maxLon),
		}
	}

	sensorsJSON, _ := json.MarshalIndent(sensors, "", "  ")
	os.WriteFile("sensors.json", sensorsJSON, 0644)
	fmt.Println("Generated sensors.json")

	os.MkdirAll("alerts", 0755)

	entries, err := os.ReadDir("alerts")
	if err == nil {
		for _, entry := range entries {
			os.Remove("alerts/" + entry.Name())
		}
	}

	baseTime, _ := time.Parse(time.RFC3339, activeTime)
	sensorOrder := rand.Perm(numSensors)

	for i := 0; i < numAlerts; i++ {
		s := sensors[sensorOrder[i]]
		t := baseTime.Add(time.Duration(rand.Intn(30)) * time.Second)

		alert := Alert{
			ID:        i + 1,
			SensorID:  s.ID,
			Timestamp: t.Format(time.RFC3339),
			Distance:  randFloat(250, 700),
		}

		filenameID := t.Format("150405") + fmt.Sprintf("%02d", rand.Intn(99))
		filename := fmt.Sprintf("alerts/%s.json", filenameID)

		j, _ := json.MarshalIndent(alert, "", "  ")
		os.WriteFile(filename, j, 0644)

		fmt.Println("Created", filename, " (sensor:", s.ID, ")")
	}

	fmt.Printf("\nGenerated %d sensors and %d alerts.\nAll alerts active around %s\n", numSensors, numAlerts, activeTime)
}

package main

import (
	"fmt"
	"time"
)

func main() {
	sensors, _ := LoadSensors()
	alerts, _ := LoadAlerts()

	currentTime := time.Date(2025, 10, 8, 17, 12, 0, 0, time.UTC)
	alertDuration := 15 * time.Minute

	fmt.Println("Simulation time:", currentTime.Format("15:04"))
	active := ActiveAlerts(currentTime, alerts, sensors, alertDuration)

	if len(active) == 0 {
		fmt.Println("No active alerts")
		return
	}

	fmt.Println("Active alerts:")
	for _, a := range active {
		fmt.Printf("- Sensor %d (%.5f, %.5f), score=%.1f\n",
			a.Sensor.ID, a.Sensor.Latitude, a.Sensor.Longitude, a.Distance)
	}

	sources := TriangulateCliques(active)
	if len(sources) == 0 {
		fmt.Println("No full cliques found")
	}

	for _, s := range sources {
		fmt.Printf("\nPotential sound source: (%.5f, %.5f)\n", s.Lat, s.Lon)
		fmt.Printf("Sensors: %v\n", s.Group)
	}

	err := Visualize(sensors, active, sources, "output.png")
	if err != nil {
		fmt.Println("Error saving visualization:", err)
	} else {
		fmt.Println("Visualization saved to output.png")
	}

}

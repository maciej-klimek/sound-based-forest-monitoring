package main

import (
	"fmt"
	"image/color"
	"strconv"

	"github.com/fogleman/gg"
)

// syzyf ze skalowaniem tego ekstremalny xdd

func Visualize(sensors []Sensor, alerts []ActiveAlert, sources []struct {
	Lat, Lon float64
	Group    []int
}, filename string) error {
	const margin = 500
	const pixelsPerMeter = 1.0 // 1 metr = 1 px (chyba XD)

	if len(sensors) == 0 {
		return fmt.Errorf("no sensors to visualize")
	}

	// minimalne i maksymalne cordy
	minLat, maxLat := sensors[0].Latitude, sensors[0].Latitude
	minLon, maxLon := sensors[0].Longitude, sensors[0].Longitude
	for _, s := range sensors {
		if s.Latitude < minLat {
			minLat = s.Latitude
		}
		if s.Latitude > maxLat {
			maxLat = s.Latitude
		}
		if s.Longitude < minLon {
			minLon = s.Longitude
		}
		if s.Longitude > maxLon {
			maxLon = s.Longitude
		}
	}

	lat0 := minLat
	lon0 := minLon

	latToMeters := func(lat float64) float64 {
		return Haversine(lat0, lon0, lat, lon0)
	}
	lonToMeters := func(lon float64, lat float64) float64 {
		return Haversine(lat0, lon0, lat0, lon)
	}

	widthMeters := lonToMeters(maxLon, maxLat)
	heightMeters := latToMeters(maxLat)

	imgWidth := int(widthMeters*pixelsPerMeter) + 2*margin
	imgHeight := int(heightMeters*pixelsPerMeter) + 2*margin

	project := func(lat, lon float64) (float64, float64) {
		x := margin + lonToMeters(lon, lat)*pixelsPerMeter
		y := float64(imgHeight) - (margin + latToMeters(lat)*pixelsPerMeter)
		return x, y
	}

	dc := gg.NewContext(imgWidth, imgHeight)
	dc.SetColor(color.White)
	dc.Clear()

	//czujniki
	for _, s := range sensors {
		x, y := project(s.Latitude, s.Longitude)

		// kropka czujnika
		dc.SetColor(color.Black)
		dc.DrawCircle(x, y, 5)
		dc.Fill()

		// numer czujnika nad kropką
		dc.SetColor(color.Black)
		dc.DrawStringAnchored(fmt.Sprintf("%d", s.ID), x, y-20, 2, 2)
	}

	// // linie miedzy aktywnymi czujnikami (do wywalenia potem)
	// for i := 0; i < len(alerts); i++ {
	// 	for j := i + 1; j < len(alerts); j++ {
	// 		x1, y1 := project(alerts[i].Sensor.Latitude, alerts[i].Sensor.Longitude)
	// 		x2, y2 := project(alerts[j].Sensor.Latitude, alerts[j].Sensor.Longitude)

	// 		distance := Haversine(alerts[i].Sensor.Latitude, alerts[i].Sensor.Longitude,
	// 			alerts[j].Sensor.Latitude, alerts[j].Sensor.Longitude)

	// 		dc.SetColor(color.RGBA{0, 0, 255, 150})
	// 		dc.DrawLine(x1, y1, x2, y2)
	// 		dc.Stroke()

	// 		midX := (x1 + x2) / 2
	// 		midY := (y1 + y2) / 2
	// 		dc.SetColor(color.Black)
	// 		dc.DrawStringAnchored(fmt.Sprintf("%.0f m", distance), midX, midY-5, 0.5, 0.5)
	// 	}
	// }

	// aktywne alerty jako okręgi z promieniami SYZYF ZE SKALOWANIEM
	for _, a := range alerts {
		x, y := project(a.Sensor.Latitude, a.Sensor.Longitude)
		radiusPixels := a.Distance * pixelsPerMeter

		dc.SetRGBA(1, 0, 0, 0.3)
		dc.DrawCircle(x, y, radiusPixels)
		dc.Fill()

		dc.SetColor(color.RGBA{255, 0, 0, 255})
		dc.DrawLine(x, y, x+radiusPixels, y)
		dc.Stroke()

		dc.SetColor(color.Black)
		dc.DrawStringAnchored(strconv.Itoa(int(a.Distance))+" m", x, y-radiusPixels-10, 0.5, 0.5)
	}

	// źródła dźwięku
	for _, s := range sources {
		x, y := project(s.Lat, s.Lon)
		dc.SetColor(color.RGBA{0, 255, 0, 255})
		dc.DrawCircle(x, y, 20)
		dc.Fill()
	}

	return dc.SavePNG(filename)
}

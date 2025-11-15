package processor

import (
	"fmt"
	"image/color"
	"strconv"

	"github.com/fogleman/gg"
	"github.com/maciej-klimek/sound-based-forest-monitoring/infrastructure/ec2/models"
)

func Visualize(alerts []*models.Alert, sources []SourceGroup, filename string) error {
	const margin = 500
	const pixelsPerMeter = 1.0 // 1 metr = 1 px

	if len(alerts) == 0 {
		return fmt.Errorf("no alerts to visualize")
	}

	minLat, maxLat := alerts[0].Lat, alerts[0].Lat
	minLon, maxLon := alerts[0].Lon, alerts[0].Lon
	for _, a := range alerts {
		if a.Lat < minLat {
			minLat = a.Lat
		}
		if a.Lat > maxLat {
			maxLat = a.Lat
		}
		if a.Lon < minLon {
			minLon = a.Lon
		}
		if a.Lon > maxLon {
			maxLon = a.Lon
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

	for _, a := range alerts {
		x, y := project(a.Lat, a.Lon)
		radiusPixels := a.Distance * pixelsPerMeter

		dc.SetRGBA(1, 0, 0, 0.3)
		dc.DrawCircle(x, y, radiusPixels)
		dc.Fill()

		dc.SetColor(color.RGBA{255, 0, 0, 255})
		dc.DrawLine(x, y, x+radiusPixels, y)
		dc.Stroke()

		dc.SetColor(color.Black)
		dc.DrawStringAnchored(a.DeviceID+" "+strconv.Itoa(int(a.Distance))+" m", x, y-radiusPixels-10, 0.5, 0.5)

		fmt.Printf("Alert: %s at (%.6f, %.6f) radius %.1f m -> pixel (%.1f, %.1f)\n",
			a.DeviceID, a.Lat, a.Lon, a.Distance, x, y)
	}

	for _, s := range sources {
		x, y := project(s.Lat, s.Lon)
		dc.SetColor(color.RGBA{0, 255, 0, 255})
		dc.DrawCircle(x, y, 50) // stała wielkość na obrazku
		dc.Fill()

		fmt.Printf("Source: Lat=%.6f Lon=%.6f composed of %d alerts -> pixel (%.1f, %.1f)\n",
			s.Lat, s.Lon, len(s.Alerts), x, y)
	}

	return dc.SavePNG(filename)
}

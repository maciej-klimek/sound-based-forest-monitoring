package processor

import (
	"math"

	"github.com/maciej-klimek/sound-based-forest-monitoring/infrastructure/ec2/models"
)

// euklidesowa odległość między dwoma punktami (lat/lon)
func Haversine(lat1, lon1, lat2, lon2 float64) float64 {
	const R = 6371e3
	phi1 := lat1 * math.Pi / 180
	phi2 := lat2 * math.Pi / 180
	dPhi := (lat2 - lat1) * math.Pi / 180
	dLambda := (lon2 - lon1) * math.Pi / 180

	a := math.Sin(dPhi/2)*math.Sin(dPhi/2) +
		math.Cos(phi1)*math.Cos(phi2)*math.Sin(dLambda/2)*math.Sin(dLambda/2)
	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))

	return R * c
}

func Distance(aLat, aLon, bLat, bLon float64) float64 {
	return Haversine(aLat, aLon, bLat, bLon)
}

// zwraca subset węzłów połączonych z v
func FilterConnected(v int, nodes []int, overlap [][]bool) []int {
	var res []int
	for _, u := range nodes {
		if overlap[v][u] {
			res = append(res, u)
		}
	}
	return res
}

// usuwa wartość z slice intów
func RemoveInt(slice []int, val int) []int {
	for i, v := range slice {
		if v == val {
			return append(slice[:i], slice[i+1:]...)
		}
	}
	return slice
}

// sprawdza, czy dwie listy alertów mają >= minShared wspólnych DeviceID
func SharesAtLeastAlerts(a, b []*models.Alert, minShared int) bool {
	count := 0
	for _, va := range a {
		for _, vb := range b {
			if va.DeviceID == vb.DeviceID {
				count++
				if count >= minShared {
					return true
				}
			}
		}
	}
	return false
}

// sprawdza, czy alert jest w slice
func ContainsAlert(slice []*models.Alert, val *models.Alert) bool {
	for _, v := range slice {
		if v.DeviceID == val.DeviceID {
			return true
		}
	}
	return false
}

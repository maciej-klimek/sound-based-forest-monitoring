package main

import "math"

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

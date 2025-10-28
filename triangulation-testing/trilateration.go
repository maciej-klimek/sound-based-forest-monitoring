package main

import "fmt"

func Distance(aLat, aLon, bLat, bLon float64) float64 {
	return Haversine(aLat, aLon, bLat, bLon) // meters
}

func FindPotentialSources(alerts []ActiveAlert) []struct {
	Lat, Lon float64
	Group    []int
} {
	n := len(alerts)
	if n < 3 {
		return nil
	}

	// overlap[i][j] = true if alert i and j overlap (distance ≤ sum of radii)
	overlap := make([][]bool, n)
	for i := range overlap {
		overlap[i] = make([]bool, n)
	}

	// Przekminic czy to musi byc w ogole
	const overlapTolerance = 1.05 // 5% margines

	totalOverlaps := 0

	for i := 0; i < n; i++ {
		for j := i + 1; j < n; j++ {
			dist := Distance(
				alerts[i].Sensor.Latitude, alerts[i].Sensor.Longitude,
				alerts[j].Sensor.Latitude, alerts[j].Sensor.Longitude,
			)

			radiusA := alerts[i].Distance
			radiusB := alerts[j].Distance

			overlaps := dist <= (radiusA+radiusB)*overlapTolerance
			if overlaps {
				overlap[i][j] = true
				overlap[j][i] = true
				totalOverlaps++
			}

			fmt.Printf("i=%d j=%d dist=%.2fm radiusA=%.2fm radiusB=%.2fm -> overlap=%v\n",
				i, j, dist, radiusA, radiusB, overlaps)
		}
	}

	fmt.Printf("\nFound %d overlaping pairs of alerts\n\n", totalOverlaps)

	var results []struct {
		Lat, Lon float64
		Group    []int
	}

	// Bron–Kerbosch algorithm for maximal cliques (chyba dziolo)
	var bronKerbosch func(r, p, x []int)
	bronKerbosch = func(r, p, x []int) {
		if len(p) == 0 && len(x) == 0 && len(r) >= 3 {
			var sumLat, sumLon float64
			var ids []int
			for _, idx := range r {
				sumLat += alerts[idx].Sensor.Latitude
				sumLon += alerts[idx].Sensor.Longitude
				ids = append(ids, alerts[idx].Sensor.ID)
			}
			results = append(results, struct {
				Lat, Lon float64
				Group    []int
			}{
				Lat:   sumLat / float64(len(r)),
				Lon:   sumLon / float64(len(r)),
				Group: ids,
			})
			return
		}

		pCopy := append([]int{}, p...)
		for _, v := range pCopy {
			var newP, newX []int
			for _, u := range p {
				if overlap[v][u] {
					newP = append(newP, u)
				}
			}
			for _, u := range x {
				if overlap[v][u] {
					newX = append(newX, u)
				}
			}
			bronKerbosch(append(r, v), newP, newX)
			p = removeInt(p, v)
			x = append(x, v)
		}
	}

	all := make([]int, n)
	for i := 0; i < n; i++ {
		all[i] = i
	}
	bronKerbosch([]int{}, all, []int{})

	return results
}

func removeInt(slice []int, val int) []int {
	for i, v := range slice {
		if v == val {
			return append(slice[:i], slice[i+1:]...)
		}
	}
	return slice
}

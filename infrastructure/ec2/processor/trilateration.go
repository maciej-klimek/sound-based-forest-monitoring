package processor

import (
	"fmt"

	"github.com/maciej-klimek/sound-based-forest-monitoring/infrastructure/ec2/models"
)

type SourceGroup struct {
	Lat    float64         `json:"lat"`
	Lon    float64         `json:"lon"`
	Alerts []*models.Alert `json:"alerts"`
}

func FindPotentialSources(alerts []*models.Alert, minOverlaps int) []SourceGroup {
	n := len(alerts)
	if n < 3 {
		return nil
	}

	// Build overlap matrix
	overlap := make([][]bool, n)
	for i := range overlap {
		overlap[i] = make([]bool, n)
	}

	const overlapTolerance = 1.1

	for i := 0; i < n; i++ {
		for j := i + 1; j < n; j++ {
			dist := Distance(alerts[i].Lat, alerts[i].Lon, alerts[j].Lat, alerts[j].Lon)
			radiusI := alerts[i].Distance
			radiusJ := alerts[j].Distance
			if dist <= (radiusI+radiusJ)*overlapTolerance {
				overlap[i][j] = true
				overlap[j][i] = true
			}
		}
	}

	fmt.Println("=== Overlap Matrix ===")
	for i := range overlap {
		fmt.Printf("%v\n", overlap[i])
	}

	var results []SourceGroup

	var bronKerbosch func(r, p, x []int)
	bronKerbosch = func(r, p, x []int) {
		if len(p) == 0 && len(x) == 0 && len(r) >= 3 {
			fmt.Printf("Candidate clique indices: %v\n", r)
			if validGroup(r, overlap, minOverlaps) {
				fmt.Println("Valid group!")
				sumLat, sumLon := 0.0, 0.0
				groupAlerts := make([]*models.Alert, len(r))
				for i, idx := range r {
					sumLat += alerts[idx].Lat
					sumLon += alerts[idx].Lon
					groupAlerts[i] = alerts[idx]
				}
				results = append(results, SourceGroup{
					Lat:    sumLat / float64(len(r)),
					Lon:    sumLon / float64(len(r)),
					Alerts: groupAlerts,
				})
			}
			return
		}

		for _, v := range append([]int{}, p...) {
			newP, newX := FilterConnected(v, p, overlap), FilterConnected(v, x, overlap)
			bronKerbosch(append(r, v), newP, newX)
			p = RemoveInt(p, v)
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

func validGroup(indices []int, overlap [][]bool, minOverlaps int) bool {
	count := 0
	for i := 0; i < len(indices); i++ {
		for j := i + 1; j < len(indices); j++ {
			if overlap[indices[i]][indices[j]] {
				count++
			}
		}
	}
	return count >= minOverlaps
}

func MergeGroups(groups []SourceGroup, minShared int) []SourceGroup {
	merged := []SourceGroup{}
	used := make([]bool, len(groups))

	for i, g := range groups {
		if used[i] {
			continue
		}
		alerts := append([]*models.Alert{}, g.Alerts...)
		sumLat := g.Lat * float64(len(alerts))
		sumLon := g.Lon * float64(len(alerts))
		count := len(alerts)
		used[i] = true

		for j := i + 1; j < len(groups); j++ {
			if used[j] {
				continue
			}
			if SharesAtLeastAlerts(alerts, groups[j].Alerts, minShared) {
				for _, a := range groups[j].Alerts {
					if !ContainsAlert(alerts, a) {
						alerts = append(alerts, a)
					}
				}
				sumLat += groups[j].Lat * float64(len(groups[j].Alerts))
				sumLon += groups[j].Lon * float64(len(groups[j].Alerts))
				count += len(groups[j].Alerts)
				used[j] = true
			}
		}

		merged = append(merged, SourceGroup{
			Lat:    sumLat / float64(count),
			Lon:    sumLon / float64(count),
			Alerts: alerts,
		})
	}

	return merged
}

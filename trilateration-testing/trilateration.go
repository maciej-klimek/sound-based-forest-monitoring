package main

type SourceGroup struct {
	Lat, Lon float64
	Sensors  []int
}

func FindPotentialSources(alerts []ActiveAlert) []SourceGroup {
	n := len(alerts)
	if n < 3 {
		return nil
	}

	// Build overlap matrix
	overlap := make([][]bool, n)
	for i := range overlap {
		overlap[i] = make([]bool, n)
	}

	const overlapTolerance = 1.05

	for i := 0; i < n; i++ {
		for j := i + 1; j < n; j++ {
			dist := Distance(alerts[i].Sensor.Latitude, alerts[i].Sensor.Longitude,
				alerts[j].Sensor.Latitude, alerts[j].Sensor.Longitude)
			if dist <= (alerts[i].Distance+alerts[j].Distance)*overlapTolerance {
				overlap[i][j] = true
				overlap[j][i] = true
			}
		}
	}

	var results []SourceGroup

	var bronKerbosch func(r, p, x []int)
	bronKerbosch = func(r, p, x []int) {
		if len(p) == 0 && len(x) == 0 && len(r) >= 3 {
			sumLat, sumLon := 0.0, 0.0
			sensors := make([]int, len(r))
			for i, idx := range r {
				sumLat += alerts[idx].Sensor.Latitude
				sumLon += alerts[idx].Sensor.Longitude
				sensors[i] = alerts[idx].Sensor.ID
			}
			results = append(results, SourceGroup{
				Lat:     sumLat / float64(len(r)),
				Lon:     sumLon / float64(len(r)),
				Sensors: sensors,
			})
			return
		}

		for _, v := range append([]int{}, p...) {
			newP, newX := filterConnected(v, p, overlap), filterConnected(v, x, overlap)
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

func mergeGroups(groups []SourceGroup, minShared int) []SourceGroup {
	merged := []SourceGroup{}
	used := make([]bool, len(groups))

	for i, g := range groups {
		if used[i] {
			continue
		}
		sensors := append([]int{}, g.Sensors...)
		sumLat := g.Lat * float64(len(sensors))
		sumLon := g.Lon * float64(len(sensors))
		count := len(sensors)
		used[i] = true

		for j := i + 1; j < len(groups); j++ {
			if used[j] {
				continue
			}
			if sharesAtLeast(sensors, groups[j].Sensors, minShared) {
				for _, id := range groups[j].Sensors {
					if !contains(sensors, id) {
						sensors = append(sensors, id)
					}
				}
				sumLat += groups[j].Lat * float64(len(groups[j].Sensors))
				sumLon += groups[j].Lon * float64(len(groups[j].Sensors))
				count += len(groups[j].Sensors)
				used[j] = true
			}
		}

		merged = append(merged, SourceGroup{
			Lat:     sumLat / float64(count),
			Lon:     sumLon / float64(count),
			Sensors: sensors,
		})
	}

	return merged
}

func sharesAtLeast(a, b []int, minShared int) bool {
	count := 0
	for _, v := range a {
		for _, u := range b {
			if v == u {
				count++
				if count >= minShared {
					return true
				}
			}
		}
	}
	return false
}

func contains(slice []int, val int) bool {
	for _, v := range slice {
		if v == val {
			return true
		}
	}
	return false
}

func filterConnected(v int, nodes []int, overlap [][]bool) []int {
	var res []int
	for _, u := range nodes {
		if overlap[v][u] {
			res = append(res, u)
		}
	}
	return res
}

func removeInt(slice []int, val int) []int {
	for i, v := range slice {
		if v == val {
			return append(slice[:i], slice[i+1:]...)
		}
	}
	return slice
}

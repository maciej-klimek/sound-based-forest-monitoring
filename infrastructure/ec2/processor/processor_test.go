package processor

import (
	"encoding/json"
	"os"
	"testing"

	"github.com/maciej-klimek/sound-based-forest-monitoring/infrastructure/ec2/models"
)

func TestFindPotentialSourcesFromJSON(t *testing.T) {
	file, err := os.Open("mock_alerts.json")
	if err != nil {
		t.Fatalf("failed to open JSON file: %v", err)
	}
	defer file.Close()

	var rawAlerts []struct {
		DeviceID string  `json:"deviceId"`
		Lat      float64 `json:"lat"`
		Lon      float64 `json:"lon"`
		Distance float64 `json:"Distance"`
	}

	if err := json.NewDecoder(file).Decode(&rawAlerts); err != nil {
		t.Fatalf("failed to decode JSON: %v", err)
	}

	alerts := make([]*models.Alert, len(rawAlerts))
	for i, a := range rawAlerts {
		alerts[i] = &models.Alert{
			DeviceID: a.DeviceID,
			Lat:      a.Lat,
			Lon:      a.Lon,
			Distance: a.Distance,
		}
	}

	minOverlaps := 2
	groups := FindPotentialSources(alerts, minOverlaps)
	groups = MergeGroups(groups, 2)

	if len(groups) == 0 {
		t.Fatal("expected at least one source group")
	}

	for i, g := range groups {
		t.Logf("Source group %d: Lat=%.6f Lon=%.6f Alerts=%v", i, g.Lat, g.Lon, func() []string {
			ids := []string{}
			for _, a := range g.Alerts {
				ids = append(ids, a.DeviceID)
			}
			return ids
		}())
	}

	filename := "test_output.png"
	err = Visualize(alerts, groups, filename)
	if err != nil {
		t.Fatalf("Visualize failed: %v", err)
	}
	t.Logf("Visualization saved to %s", filename)
}

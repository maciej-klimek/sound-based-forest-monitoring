package processor

import (
	"sync"
	"time"

	"github.com/maciej-klimek/sound-based-forest-monitoring/infrastructure/ec2/models"
)

type AlertEntry struct {
	Alert    *models.Alert
	Received time.Time
}

type Memory struct {
	mu     sync.RWMutex
	alerts map[string]AlertEntry
	ttl    time.Duration
}

func NewMemory(ttl time.Duration) *Memory {
	m := &Memory{
		alerts: make(map[string]AlertEntry),
		ttl:    ttl,
	}

	// Background cleaner
	go m.backgroundPrune()

	return m
}

func (m *Memory) Add(a *models.Alert) {
	m.mu.Lock()
	defer m.mu.Unlock()

	key := a.DeviceID + "#" + a.TS
	m.alerts[key] = AlertEntry{
		Alert:    a,
		Received: time.Now(),
	}
}

func (m *Memory) GetAll() []*models.Alert {
	m.mu.RLock()
	defer m.mu.RUnlock()

	res := make([]*models.Alert, 0, len(m.alerts))
	for _, e := range m.alerts {
		res = append(res, e.Alert)
	}
	return res
}

func (m *Memory) Prune() {
	cutoff := time.Now().Add(-m.ttl)

	m.mu.Lock()
	defer m.mu.Unlock()

	for key, entry := range m.alerts {
		if entry.Received.Before(cutoff) {
			delete(m.alerts, key)
		}
	}
}

func (m *Memory) backgroundPrune() {
	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		m.Prune()
	}
}

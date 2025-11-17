package processor

import (
	"fmt"
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

	fmt.Printf("[Memory] Initialized with TTL=%s\n", ttl)

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

	fmt.Printf("[Memory] Added alert: key=%s device=%s ts=%s\n", key, a.DeviceID, a.TS)
}

func (m *Memory) GetAll() []*models.Alert {
	m.mu.RLock()
	defer m.mu.RUnlock()

	fmt.Printf("[Memory] Retrieving all alerts: count=%d\n", len(m.alerts))

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

	before := len(m.alerts)

	for key, entry := range m.alerts {
		if entry.Received.Before(cutoff) {
			fmt.Printf("[Memory] Pruning expired alert: key=%s received=%s cutoff=%s\n", key, entry.Received, cutoff)
			delete(m.alerts, key)
		}
	}

	after := len(m.alerts)
	fmt.Printf("[Memory] Prune completed: before=%d after=%d pruned=%d\n", before, after, before-after)
}

func (m *Memory) backgroundPrune() {
	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()

	fmt.Printf("[Memory] Background prune started (interval=10s)\n")

	for range ticker.C {
		fmt.Printf("[Memory] Running scheduled prune\n")
		m.Prune()
	}
}

package handlers

import (
	"context"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/maciej-klimek/sound-based-forest-monitoring/infrastructure/ec2/models"
	processor "github.com/maciej-klimek/sound-based-forest-monitoring/infrastructure/ec2/processor"
	"github.com/maciej-klimek/sound-based-forest-monitoring/infrastructure/ec2/repository"
)

type Handler struct {
	repo   *repository.Repo
	logger *log.Logger
	mem    *processor.Memory
}

var (
	allSources []processor.SourceGroup
	allMu      sync.Mutex
)

func NewHandler(repo *repository.Repo, mem *processor.Memory, logger *log.Logger) *Handler {
	return &Handler{
		repo:   repo,
		mem:    mem,
		logger: logger,
	}
}

func (h *Handler) HandleEnvelope(ctx context.Context, env models.Envelope) error {
	it, err := h.repo.GeAlertByPK(ctx, env.DeviceID, env.TS, true)
	if err != nil {
		return err
	}

	fmt.Println("=== ALERT ===")
	fmt.Printf("deviceId : %s\n", env.DeviceID)
	fmt.Printf("ts       : %s\n", env.TS)

	if it != nil {
		// memory add
		h.mem.Add(it)

		fmt.Printf("s3Key    : %s\n", it.S3Key)
		fmt.Printf("lat,lon  : %.6f, %.6f\n", it.Lat, it.Lon)
		fmt.Printf("status   : %s\n", it.Status)
		fmt.Printf("checksum : %s\n", it.Checksum)
		fmt.Printf("createdAt: %s\n", it.CreatedAt)
	} else {
		fmt.Printf("ddb.item : <nil>\n")
	}

	fmt.Printf("time     : %s\n", time.Now().Format(time.RFC3339))
	fmt.Println("=============")

	active := h.mem.GetAll()
	sources := processor.FindPotentialSources(active, 3)

	allMu.Lock()
	allSources = append(allSources, sources...)
	total := len(allSources)
	allMu.Unlock()

	// callujesz triangualcje dla active
	fmt.Printf("active alerts: %d\n", len(active))
	fmt.Printf("new potential sources: %d, total stored sources: %d\n", len(sources), total)

	return nil
}

func (h *Handler) ListSensors(c *gin.Context) {
	ctx := c.Request.Context()
	sensors, err := h.repo.GetAllSensors(ctx)
	if err != nil {
		h.logger.Printf("GetAllSensors error: %v", err)
		c.JSON(500, gin.H{"error": "internal server error"})
		return
	}

	c.JSON(200, sensors)
}

func (h *Handler) ListAlerts(c *gin.Context) {
	allMu.Lock()
	resp := make([]processor.SourceGroup, len(allSources))
	copy(resp, allSources)
	allMu.Unlock()

	c.JSON(200, gin.H{
		"count":   len(resp),
		"sources": resp,
	})
}

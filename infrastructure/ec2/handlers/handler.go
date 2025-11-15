package handlers

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/maciej-klimek/sound-based-forest-monitoring/infrastructure/ec2/models"
	processor "github.com/maciej-klimek/sound-based-forest-monitoring/infrastructure/ec2/processor"
	"github.com/maciej-klimek/sound-based-forest-monitoring/infrastructure/ec2/repository"
)

type Handler struct {
	repo   *repository.AlertsRepo
	logger *log.Logger
	mem    *processor.Memory
}

func NewHandler(repo *repository.AlertsRepo, mem *processor.Memory, logger *log.Logger) *Handler {
	return &Handler{
		repo:   repo,
		mem:    mem,
		logger: logger,
	}
}

func (h *Handler) HandleEnvelope(ctx context.Context, env models.Envelope) error {
	it, err := h.repo.GetByPK(ctx, env.DeviceID, env.TS, true)
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

	// callujesz triangualcje dla active
	fmt.Printf("active alerts: %d\n", len(active))
	fmt.Printf("Potential sound sources%d\n", sources)

	return nil
}

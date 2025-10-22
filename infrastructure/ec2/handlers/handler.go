package handlers

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/maciej-klimek/sound-based-forest-monitoring/infrastructure/ec2/models"
	"github.com/maciej-klimek/sound-based-forest-monitoring/infrastructure/ec2/repository"
)

type Handler struct {
	repo   *repository.AlertsRepo
	logger *log.Logger
}

func NewHandler(repo *repository.AlertsRepo, logger *log.Logger) *Handler {
	return &Handler{repo: repo, logger: logger}
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

	return nil
}

package handlers

import (
	"context"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsConfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"

	"github.com/gin-gonic/gin"
	"github.com/maciej-klimek/sound-based-forest-monitoring/infrastructure/ec2/config"
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

func (h *Handler) ListSources(c *gin.Context) {
	allMu.Lock()
	srcs := make([]processor.SourceGroup, len(allSources))
	for i := range allSources {
		sg := allSources[i]
		srcs[i].Lat = sg.Lat
		srcs[i].Lon = sg.Lon

		if len(sg.Alerts) > 0 {
			srcs[i].Alerts = make([]*models.Alert, len(sg.Alerts))
			for j := range sg.Alerts {
				if sg.Alerts[j] == nil {
					srcs[i].Alerts[j] = nil
					continue
				}
				copyAlert := *sg.Alerts[j]
				srcs[i].Alerts[j] = &copyAlert
			}
		}
	}
	allMu.Unlock()

	bucket := config.AppConfig.AWS.BucketName
	var presigner *s3.PresignClient
	if bucket != "" {
		awsCfg, err := awsConfig.LoadDefaultConfig(c.Request.Context(), awsConfig.WithRegion(config.AppConfig.AWS.Region))
		if err != nil {
			h.logger.Printf("warning: cannot load aws config for presign: %v", err)
		} else {
			presigner = s3.NewPresignClient(s3.NewFromConfig(awsCfg))
		}
	}

	for i := range srcs {
		sg := &srcs[i]
		for j := range sg.Alerts {
			if sg.Alerts[j] == nil {
				continue
			}
			a := sg.Alerts[j]
			if a.S3Key == "" || bucket == "" || presigner == nil {
				continue
			}
			in := &s3.GetObjectInput{
				Bucket: aws.String(bucket),
				Key:    aws.String(a.S3Key),
			}
			ps, err := presigner.PresignGetObject(c.Request.Context(), in, func(opts *s3.PresignOptions) {
				opts.Expires = 15 * time.Minute
			})
			if err != nil {
				h.logger.Printf("presign error for key %s: %v", a.S3Key, err)
				continue
			}
			a.S3Key = ps.URL
		}
	}

	c.JSON(200, gin.H{
		"count":   len(srcs),
		"sources": srcs,
	})
}

func (h *Handler) ListAlerts(c *gin.Context) {
	ctx := c.Request.Context()
	alerts, err := h.repo.GetAlertsLastHour(ctx)
	if err != nil {
		h.logger.Printf("GetAlertsLastHour error: %v", err)
		c.JSON(500, gin.H{"error": "internal server error"})
		return
	}

	bucket := config.AppConfig.AWS.BucketName
	var presigner *s3.PresignClient
	if bucket != "" {
		awsCfg, err := awsConfig.LoadDefaultConfig(ctx, awsConfig.WithRegion(config.AppConfig.AWS.Region))
		if err != nil {
			h.logger.Printf("warning: cannot load aws config for presign: %v", err)
		} else {
			presigner = s3.NewPresignClient(s3.NewFromConfig(awsCfg))
		}
	}

	respAlerts := make([]models.Alert, 0, len(alerts))
	for _, a := range alerts {
		ra := a
		if ra.S3Key != "" && bucket != "" && presigner != nil {
			in := &s3.GetObjectInput{
				Bucket: aws.String(bucket),
				Key:    aws.String(ra.S3Key),
			}
			ps, err := presigner.PresignGetObject(ctx, in, func(opts *s3.PresignOptions) {
				opts.Expires = 15 * time.Minute
			})
			if err != nil {
				h.logger.Printf("presign error for key %s: %v", ra.S3Key, err)
			} else {
				ra.S3Key = ps.URL
			}
		}
		respAlerts = append(respAlerts, ra)
	}

	c.JSON(200, gin.H{
		"count":  len(respAlerts),
		"alerts": respAlerts,
	})
}

func (h *Handler) CleanOldSources(maxAge time.Duration) {
	allMu.Lock()
	defer allMu.Unlock()

	cutoff := time.Now().Add(-maxAge)
	filtered := []processor.SourceGroup{}

	for _, sg := range allSources {
		hasRecent := false
		for _, alert := range sg.Alerts {
			if alert != nil {
				ts, _ := time.Parse(time.RFC3339, alert.CreatedAt)
				if ts.After(cutoff) {
					hasRecent = true
					break
				}
			}
		}
		if hasRecent {
			filtered = append(filtered, sg)
		}
	}

	h.logger.Printf("Cleaned old sources: %d -> %d", len(allSources), len(filtered))
	allSources = filtered
}

package router

import (
	"github.com/gin-gonic/gin"
	"github.com/maciej-klimek/sound-based-forest-monitoring/infrastructure/ec2/handlers"
)

func SetupRouter(handler *handlers.Handler) *gin.Engine {
	r := gin.Default()

	sensors := r.Group("/sensors")
	{
		sensors.GET("", handler.ListSensors)
	}

	sources := r.Group("/sources")
	{
		sources.GET("", handler.ListSources)
	}

	alerts := r.Group("/alerts")
	{
		alerts.GET("", handler.ListAlerts)
	}

	return r
}

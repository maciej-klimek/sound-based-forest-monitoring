package router

import (
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/maciej-klimek/sound-based-forest-monitoring/infrastructure/ec2/handlers"
)

func SetupRouter(handler *handlers.Handler) *gin.Engine {
	r := gin.Default()

	// Setup CORS middleware
	r.Use(cors.Default())

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

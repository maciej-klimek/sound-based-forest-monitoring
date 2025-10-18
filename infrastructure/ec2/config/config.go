package config

import (
	_ "embed"
	"errors"
	"fmt"

	"gopkg.in/yaml.v3"
)

type Config struct {
	AWS AWSConfig `yaml:"aws"`
}

type AWSConfig struct {
	Region       string `yaml:"region"`
	SQSURL       string `yaml:"sqs_url"`
	DevicesTable string `yaml:"devices_table"`
	AlertsTable  string `yaml:"alerts_table"`
}

//go:embed configuration.yml
var embeddedConfig []byte

var AppConfig Config

func Load() error {
	if len(embeddedConfig) == 0 {
		return errors.New("embedded configuration.yml is empty or missing")
	}
	if err := yaml.Unmarshal(embeddedConfig, &AppConfig); err != nil {
		return fmt.Errorf("cannot parse yaml: %w", err)
	}

	if AppConfig.AWS.SQSURL == "" || AppConfig.AWS.Region == "" {
		return fmt.Errorf("invalid config: region=%q sqs_url=%q", AppConfig.AWS.Region, AppConfig.AWS.SQSURL)
	}
	return nil
}

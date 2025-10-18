DIST_DIR := $(PWD)

GOOS := linux
LAMBDA_ARCH := arm64
EC2_ARCH := amd64
CGO_ENABLED := 0

build-register:
	cd ../lambda-register && \
	GOOS=$(GOOS) GOARCH=$(LAMBDA_ARCH) CGO_ENABLED=$(CGO_ENABLED) go build -o bootstrap main.go && \
	zip -j $(DIST_DIR)/dist_register.zip bootstrap && rm -f bootstrap
	@echo "Built dist_register.zip"

build-alert:
	cd ../lambda-alert && \
	GOOS=$(GOOS) GOARCH=$(LAMBDA_ARCH) CGO_ENABLED=$(CGO_ENABLED) go build -o bootstrap main.go && \
	zip -j $(DIST_DIR)/dist_alert.zip bootstrap && rm -f bootstrap
	@echo "Built dist_alert.zip"

build-enqueuer:
	cd ../lambda-enqueuer && \
	GOOS=$(GOOS) GOARCH=$(LAMBDA_ARCH) CGO_ENABLED=$(CGO_ENABLED) go build -o bootstrap main.go && \
	zip -j $(DIST_DIR)/dist_enqueuer.zip bootstrap && rm -f bootstrap
	@echo "Built dist_enqueuer.zip"

build-ec2:
	cd ../ec2 && \
	GOOS=$(GOOS) GOARCH=$(EC2_ARCH) CGO_ENABLED=$(CGO_ENABLED) go build -o worker main.go && \
	zip -j $(DIST_DIR)/dist_ec2.zip worker && rm -f worker
	@echo "Built dist_ec2.zip"

build-all: build-register build-alert build-enqueuer build-ec2
	@echo "All builds complete: Lambda + EC2"

clean:
	rm -f $(DIST_DIR)/dist_*.zip
	@echo "Cleaned build artifacts"

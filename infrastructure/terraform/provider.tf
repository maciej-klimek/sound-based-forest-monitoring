provider "aws" {
  region = var.aws_region
}

locals {
  project = "sound-forest"
  tags = {
    Project = local.project
    Stack   = "iot-poc"
  }
}

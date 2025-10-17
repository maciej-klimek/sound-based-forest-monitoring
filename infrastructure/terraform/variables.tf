variable "aws_region" {
  type    = string
  default = "eu-north-1"
}

variable "project" {
  type    = string
  default = "iot-poc"
}

variable "devices_table_name" {
  type    = string
  default = "devices"
}

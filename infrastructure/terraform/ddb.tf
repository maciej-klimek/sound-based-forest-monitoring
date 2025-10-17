resource "aws_dynamodb_table" "devices" {
  name         = "devices"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "deviceId"

  attribute {
    name = "deviceId"
    type = "S"
  }

  tags = merge(local.tags, { Table = "devices" })
}

resource "aws_dynamodb_table" "alerts" {
  name         = "alerts"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "deviceId"
  range_key    = "ts"

  attribute {
    name = "deviceId"
    type = "S"
  }

  attribute {
    name = "ts"
    type = "S"
  }

  stream_enabled   = true
  stream_view_type = "NEW_IMAGE"

  tags = merge(local.tags, { Table = "alerts" })
}

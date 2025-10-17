resource "aws_sqs_queue" "alerts_dlq" {
  name                        = "${local.project}-alerts-dlq.fifo"
  fifo_queue                  = true
  content_based_deduplication = true
  message_retention_seconds   = 1209600
  tags                        = local.tags
}

resource "aws_sqs_queue" "alerts" {
  name                        = "${local.project}-alerts.fifo"
  fifo_queue                  = true
  content_based_deduplication = true
  visibility_timeout_seconds  = 120
  message_retention_seconds   = 1209600
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.alerts_dlq.arn
    maxReceiveCount     = 5
  })
  tags = local.tags
}

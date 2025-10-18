resource "aws_iam_role" "lambda_enqueuer" {
  name = "${local.project}-enqueuer-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect    = "Allow",
        Action    = "sts:AssumeRole",
        Principal = { Service = "lambda.amazonaws.com" }
      }
    ]
  })
}

resource "aws_iam_policy" "lambda_enqueuer_streams" {
  name = "${local.project}-enqueuer-dynamodb-streams"
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect : "Allow",
        Action : [
          "dynamodb:DescribeStream",
          "dynamodb:GetRecords",
          "dynamodb:GetShardIterator",
          "dynamodb:ListStreams"
        ],
        Resource : [
          aws_dynamodb_table.alerts.stream_arn,
          "${aws_dynamodb_table.alerts.arn}/stream/*"
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_enqueuer_streams_attach" {
  role       = aws_iam_role.lambda_enqueuer.name
  policy_arn = aws_iam_policy.lambda_enqueuer_streams.arn
}

resource "aws_iam_policy" "lambda_enqueuer_sqs" {
  name = "${local.project}-enqueuer-sqs"
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect   = "Allow",
        Action   = ["sqs:SendMessage"],
        Resource = aws_sqs_queue.alerts.arn
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_enqueuer_sqs_attach" {
  role       = aws_iam_role.lambda_enqueuer.name
  policy_arn = aws_iam_policy.lambda_enqueuer_sqs.arn
}

resource "aws_lambda_function" "enqueuer" {
  function_name    = "${local.project}-enqueuer"
  role             = aws_iam_role.lambda_enqueuer.arn
  filename         = "dist_enqueuer.zip"
  source_code_hash = filebase64sha256("dist_enqueuer.zip")

  handler       = "bootstrap"
  runtime       = "provided.al2023"
  architectures = ["arm64"]
  timeout       = 10

  environment {
    variables = {
      QUEUE_URL = aws_sqs_queue.alerts.url
    }
  }

  tags = local.tags
}

resource "aws_lambda_event_source_mapping" "alerts_stream_to_enqueuer" {
  event_source_arn  = aws_dynamodb_table.alerts.stream_arn
  function_name     = aws_lambda_function.enqueuer.arn
  starting_position = "LATEST"
  batch_size        = 10
  enabled           = true

  depends_on = [
    aws_lambda_function.enqueuer,
    aws_iam_role_policy_attachment.lambda_enqueuer_streams_attach,
    aws_iam_role_policy_attachment.lambda_enqueuer_sqs_attach
  ]
}

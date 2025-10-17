terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = ">= 2.4.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

resource "aws_dynamodb_table" "devices" {
  name         = var.devices_table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "deviceId"

  attribute {
    name = "deviceId"
    type = "S"
  }

  tags = {
    Project = var.project
    Service = "register"
  }
}

resource "null_resource" "build_lambda_binary" {
  triggers = {
    src_hash = filesha256("${path.module}/../lambda/main.go")
  }

  provisioner "local-exec" {
    command = <<EOT
set -e
cd ${path.module}/../lambda
GOOS=linux GOARCH=arm64 CGO_ENABLED=0 go build -tags lambda.norpc -o bootstrap
EOT
  }
}

data "archive_file" "lambda_zip" {
  type        = "zip"
  source_file = "${path.module}/../lambda/bootstrap"
  output_path = "${path.module}/dist/register.zip"

  depends_on = [null_resource.build_lambda_binary]
}

resource "aws_iam_role" "lambda_exec" {
  name = "${var.project}-register-lambda-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect    = "Allow",
        Principal = { Service = "lambda.amazonaws.com" },
        Action    = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_policy" "ddb_policy" {
  name        = "${var.project}-register-ddb"
  description = "Allow PutItem/UpdateItem on devices table"
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Action = [
          "dynamodb:PutItem",
          "dynamodb:UpdateItem"
        ],
        Resource = aws_dynamodb_table.devices.arn
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ddb_attach" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = aws_iam_policy.ddb_policy.arn
}

resource "aws_lambda_function" "register" {
  function_name    = "${var.project}-register"
  role             = aws_iam_role.lambda_exec.arn
  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  handler          = "bootstrap"
  runtime          = "provided.al2023"
  architectures    = ["arm64"]
  memory_size      = 128
  timeout          = 10

  environment {
    variables = {
      DEVICES_TABLE = var.devices_table_name
    }
  }
}

resource "aws_apigatewayv2_api" "http" {
  name          = "${var.project}-http"
  protocol_type = "HTTP"

  cors_configuration {
    allow_headers = ["content-type"]
    allow_methods = ["OPTIONS", "POST"]
    allow_origins = ["*"]
  }
}

resource "aws_apigatewayv2_integration" "register" {
  api_id                 = aws_apigatewayv2_api.http.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.register.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "register" {
  api_id    = aws_apigatewayv2_api.http.id
  route_key = "POST /register"
  target    = "integrations/${aws_apigatewayv2_integration.register.id}"
}

resource "aws_apigatewayv2_stage" "prod" {
  api_id      = aws_apigatewayv2_api.http.id
  name        = "$default"
  auto_deploy = true
}

resource "aws_lambda_permission" "apigw_invoke" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.register.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http.execution_arn}/*/*"
}

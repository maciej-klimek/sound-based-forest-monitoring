resource "aws_iam_role" "lambda_alert" {
  name = "${local.project}-alert-role"
  assume_role_policy = jsonencode({
    Version   = "2012-10-17",
    Statement = [{ Effect = "Allow", Action = "sts:AssumeRole", Principal = { Service = "lambda.amazonaws.com" } }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_alert_logs" {
  role       = aws_iam_role.lambda_alert.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_policy" "lambda_alert_io" {
  name = "${local.project}-alert-io"
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      { Effect = "Allow", Action = ["s3:PutObject"], Resource = ["${aws_s3_bucket.audio.arn}/*"] },
      { Effect = "Allow", Action = ["dynamodb:PutItem"], Resource = aws_dynamodb_table.alerts.arn },
      { Effect = "Allow", Action = ["dynamodb:UpdateItem"], Resource = aws_dynamodb_table.devices.arn }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_alert_io_attach" {
  role       = aws_iam_role.lambda_alert.name
  policy_arn = aws_iam_policy.lambda_alert_io.arn
}

resource "aws_lambda_function" "alert" {
  function_name    = "${local.project}-alert"
  role             = aws_iam_role.lambda_alert.arn
  filename         = "dist_alert.zip"
  source_code_hash = filebase64sha256("dist_alert.zip")

  handler       = "bootstrap"
  runtime       = "provided.al2023"
  architectures = ["arm64"]
  timeout       = 15

  environment {
    variables = {
      ALERTS_TABLE  = aws_dynamodb_table.alerts.name
      AUDIO_BUCKET  = aws_s3_bucket.audio.bucket
      DEVICES_TABLE = aws_dynamodb_table.devices.name
    }
  }

  tags = local.tags
}

resource "aws_apigatewayv2_integration" "alert" {
  api_id                 = aws_apigatewayv2_api.http.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.alert.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "alert" {
  api_id    = aws_apigatewayv2_api.http.id
  route_key = "POST /alert"
  target    = "integrations/${aws_apigatewayv2_integration.alert.id}"
}

resource "aws_lambda_permission" "apigw_invoke_alert" {
  statement_id  = "AllowAPIGatewayInvokeAlert"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.alert.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http.execution_arn}/*/*"
}

resource "aws_iam_role" "lambda_register" {
  name = "${local.project}-register-role"
  assume_role_policy = jsonencode({
    Version   = "2012-10-17",
    Statement = [{ Effect = "Allow", Action = "sts:AssumeRole", Principal = { Service = "lambda.amazonaws.com" } }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_register_logs" {
  role       = aws_iam_role.lambda_register.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_policy" "lambda_register_ddb" {
  name = "${local.project}-register-ddb"
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Effect   = "Allow",
      Action   = ["dynamodb:PutItem", "dynamodb:UpdateItem"],
      Resource = aws_dynamodb_table.devices.arn
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_register_ddb_attach" {
  role       = aws_iam_role.lambda_register.name
  policy_arn = aws_iam_policy.lambda_register_ddb.arn
}

resource "aws_lambda_function" "register" {
  function_name    = "${local.project}-register"
  role             = aws_iam_role.lambda_register.arn
  filename         = "dist_register.zip"
  source_code_hash = filebase64sha256("dist_register.zip")

  handler       = "bootstrap"
  runtime       = "provided.al2023"
  architectures = ["arm64"]
  timeout       = 10
  memory_size   = 128

  environment {
    variables = {
      DEVICES_TABLE = aws_dynamodb_table.devices.name
    }
  }

  tags = local.tags
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

resource "aws_lambda_permission" "apigw_invoke_register" {
  statement_id  = "AllowAPIGatewayInvokeRegister"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.register.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http.execution_arn}/*/*"
}

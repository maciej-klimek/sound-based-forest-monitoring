output "api_base_url" {
  value = aws_apigatewayv2_api.http.api_endpoint
}
output "register_endpoint" {
  value = "${aws_apigatewayv2_api.http.api_endpoint}/register"
}
output "devices_table" {
  value = aws_dynamodb_table.devices.name
}
output "lambda_name" {
  value = aws_lambda_function.register.function_name
}

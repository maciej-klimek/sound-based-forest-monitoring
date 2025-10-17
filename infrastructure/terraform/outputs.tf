output "api_base_url" { value = aws_apigatewayv2_api.http.api_endpoint }
output "register_endpoint" { value = "${aws_apigatewayv2_api.http.api_endpoint}/register" }
output "alert_endpoint" { value = "${aws_apigatewayv2_api.http.api_endpoint}/alert" }
output "audio_bucket" { value = aws_s3_bucket.audio.bucket }
output "alerts_queue_url" { value = aws_sqs_queue.alerts.url }

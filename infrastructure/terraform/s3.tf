resource "random_id" "bucket_suffix" {
  byte_length = 4
}

resource "aws_s3_bucket" "audio" {
  bucket        = "${local.project}-audio-${random_id.bucket_suffix.hex}"
  force_destroy = true
  tags          = local.tags
}

resource "aws_s3_bucket_public_access_block" "audio" {
  bucket                  = aws_s3_bucket.audio.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

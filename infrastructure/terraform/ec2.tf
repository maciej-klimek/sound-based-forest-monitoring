data "aws_ami" "al2023" {
  most_recent = true
  owners      = ["137112412989"]
  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }
}

resource "aws_key_pair" "worker" {
  key_name   = "${local.project}-worker-key"
  public_key = file("~/.ssh/iot_worker.pub")
}

data "aws_vpc" "default" {
  default = true
}

resource "aws_security_group" "ssh" {
  name        = "${local.project}-ssh"
  description = "Allow SSH from any IP"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_iam_role" "ec2_role" {
  name = "${local.project}-ec2-role"
  assume_role_policy = jsonencode({
    Version   = "2012-10-17",
    Statement = [{ Effect = "Allow", Action = "sts:AssumeRole", Principal = { Service = "ec2.amazonaws.com" } }]
  })
}

resource "aws_iam_role_policy" "ec2_sqs" {
  name = "${local.project}-ec2-sqs"
  role = aws_iam_role.ec2_role.id
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Effect   = "Allow",
      Action   = ["sqs:ReceiveMessage", "sqs:DeleteMessage", "sqs:GetQueueAttributes"],
      Resource = aws_sqs_queue.alerts.arn
    }]
  })
}

resource "aws_iam_instance_profile" "ec2_profile" {
  name = "${local.project}-ec2-profile"
  role = aws_iam_role.ec2_role.name
}

resource "aws_instance" "worker" {
  count                = var.create_ec2_worker ? 1 : 0
  ami                  = data.aws_ami.al2023.id
  instance_type        = "t3.micro"
  iam_instance_profile = aws_iam_instance_profile.ec2_profile.name

  key_name                    = aws_key_pair.worker.key_name
  vpc_security_group_ids      = [aws_security_group.ssh.id]
  associate_public_ip_address = true

  tags = merge(local.tags, { Role = "worker" })
}

output "worker_public_ip" {
  value       = aws_instance.worker[0].public_ip
  description = "Public EC2 IPv4"
}

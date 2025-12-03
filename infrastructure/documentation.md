# Dokumentacja Techniczna - Sound-Based Forest Monitoring Infrastructure

## Spis treści
1. [Przegląd systemu](#1-przegląd-systemu)
2. [Architektura](#2-architektura)
3. [Komponenty systemu](#3-komponenty-systemu)
4. [Przepływ danych](#4-przepływ-danych)
5. [Modele danych](#5-modele-danych)
6. [API Endpoints](#6-api-endpoints)
7. [Deployment](#7-deployment)
8. [Konfiguracja](#8-konfiguracja)
9. [Bezpieczeństwo](#9-bezpieczeństwo)
10. [Monitoring i Debugging](#10-monitoring-i-debugging)
11. [Ograniczenia i przyszłe usprawnienia](#11-ograniczenia-i-przyszłe-usprawnienia)

---

## 1. Przegląd systemu

System **Sound-Based Forest Monitoring** to rozwiązanie IoT do monitorowania lasów na podstawie analizy dźwięku. Umożliwia:
- Rejestrację czujników audio (mikrofonów) rozmieszczonych w lesie
- Odbieranie alertów dźwiękowych z czujników
- Przechowywanie nagrań audio w S3
- Lokalizację źródeł dźwięku za pomocą trilateracji (triangulacji)
- Wizualizację alertów i źródeł na mapie przez frontend

### Technologie
- **Backend**: Go (Gin framework)
- **Infrastructure as Code**: Terraform
- **Cloud Provider**: AWS
  - Lambda (3 funkcje)
  - API Gateway (HTTP API)
  - DynamoDB (2 tabele)
  - S3 (audio storage)
  - SQS (FIFO queue)
  - EC2 (worker do przetwarzania)
  - SNS (notyfikacje)
- **Runtime**: Go 1.21+

---

## 2. Architektura

### 2.1 Diagram architektury

System składa się z dwóch głównych przepływów danych:

#### Data Flow - Register
```
Czujnik → API Gateway → Lambda Register → DynamoDB (devices table)
```

#### Data Flow - Alert
```
Czujnik → API Gateway → Lambda Alert → DynamoDB (alerts table) + S3 (audio)
       → Lambda Enqueuer → SQS → EC2 Consumer → Trilateracja → Aktualizacja allSources
```

### 2.2 Komponenty AWS

| Komponent | Typ | Cel |
|-----------|-----|-----|
| API Gateway | HTTP API | Publiczny endpoint dla czujników IoT |
| Lambda Register | Funkcja | Rejestracja nowych czujników |
| Lambda Alert | Funkcja | Przyjmowanie alertów i zapis do DynamoDB/S3 |
| Lambda Enqueuer | Funkcja | Trigger DynamoDB Stream → SQS |
| DynamoDB devices | Tabela | Przechowywanie metadanych czujników |
| DynamoDB alerts | Tabela | Przechowywanie metadanych alertów |
| S3 | Bucket | Przechowywanie plików audio (WAV) |
| SQS | FIFO Queue | Kolejka alertów do przetworzenia |
| EC2 | t3.micro | Worker wykonujący trilaterację |
| SNS | Topic | Notyfikacje (opcjonalnie) |

---

## 3. Komponenty systemu

### 3.1 Lambda Functions

#### 3.1.1 Lambda Register (`lambda-register/`)
**Cel**: Rejestracja nowych czujników w systemie

**Trigger**: API Gateway `POST /register`

**Payload**:
```json
{
  "lat": 52.2297,
  "lon": 21.0122
}
```

**Operacje**:
1. Walidacja payload (lat, lon)
2. Generowanie `deviceSecret` (UUID)
3. Zapis do DynamoDB `devices` table:
   - PK: `deviceId`
   - Atrybuty: `deviceSecret`, `firstSeen`, `lastSeen`, `lat`, `lon`

**Response**:
```json
{
  "deviceId": "device-uuid",
  "deviceSecret": "generated-secret-uuid"
}
```

**IAM Permissions**:
- `dynamodb:PutItem` na tabeli `devices`

---

#### 3.1.2 Lambda Alert (`lambda-alert/`)
**Cel**: Przyjmowanie alertów dźwiękowych i zapis audio do S3

**Trigger**: API Gateway `POST /alert`

**Payload**:
```json
{
    "deviceId": "device-uuid",
    "lat":50.0764,
    "lon":19.9312,
    "ts": "2025-12-03T20:00:00Z",
    "distance": 325.5,
    "audioB64": "base64-encoded-audio-data"
}
```

**Operacje**:
1. Walidacja `deviceId` i `secret` w DynamoDB
2. Dekodowanie audio z base64
3. Generowanie ścieżki S3: `{deviceId}/{date}/{timestamp}.wav`
4. Upload audio do S3
5. Obliczanie checksum (SHA256)
6. Zapis metadanych do DynamoDB `alerts`:
   - PK: `deviceId`, SK: `ts` (timestamp)
   - Atrybuty: `s3Key`, `lat`, `lon`, `status`, `checksum`, `createdAt`, `ttl`

**Response**:
```json
{
    "ok": true,
    "s3Key": "s3key",
    "ts": "2025-12-03T21:35:51.793Z",
    "sha256":"sha256-of-file"
}
```

**IAM Permissions**:
- `dynamodb:GetItem` na tabeli `devices`
- `dynamodb:PutItem` na tabeli `alerts`
- `s3:PutObject` na bucket audio

---

#### 3.1.3 Lambda Enqueuer (`lambda-enqueuer/`)
**Cel**: Przekazywanie nowych alertów do SQS dla EC2 worker

**Trigger**: DynamoDB Stream na tabeli `alerts` (INSERT events)

**Operacje**:
1. Odbieranie event z DynamoDB Stream
2. Parsowanie INSERT record
3. Tworzenie wiadomości SQS z `deviceId` i `ts`
4. Wysyłanie do SQS FIFO queue z `MessageGroupId` = `deviceId`

**Message Format**:
```json
{
  "deviceId": "device-uuid",
  "ts": "2025-12-03T20:00:00Z"
}
```

**IAM Permissions**:
- `dynamodb:DescribeStream`, `dynamodb:GetRecords`, `dynamodb:GetShardIterator`
- `sqs:SendMessage` na queue

---

### 3.2 EC2 Worker (`ec2/`)

**Cel**: Przetwarzanie alertów z SQS, wykonywanie trilateracji i obsługa API dla frontendu

**Instancja**: t3.micro (Amazon Linux 2023)

**Komponenty**:

#### 3.2.1 SQS Consumer (`queue/consumer.go`)
- Long-polling SQS queue
- Odbieranie wiadomości batch (max 10)
- Wywoływanie `Handler.HandleEnvelope()` dla każdej wiadomości
- Usuwanie przetworzonej wiadomości z queue

#### 3.2.2 Handler (`handlers/handler.go`)

**HandleEnvelope()**:
1. Pobiera pełne dane alertu z DynamoDB (`GeAlertByPK`)
2. Dodaje alert do pamięci (`Memory.Add()`)
3. Wywołuje trilaterację `FindPotentialSources()` na aktywnych alertach
4. Aktualizuje globalną listę `allSources` (thread-safe z mutex)

**HTTP Endpoints**:
- `GET /sensors` - lista wszystkich zarejestrowanych czujników
- `GET /sources` - lista wykrytych źródeł dźwięku z trilateracji
- `GET /alerts` - alerty z ostatniej godziny

#### 3.2.3 Memory (`processor/memory.go`)
- In-memory cache aktywnych alertów
- Time-window: przechowuje alerty z ostatnich N minut
- Thread-safe (mutex)
- Metody:
  - `Add(*Alert)` - dodaje alert
  - `GetAll() []*Alert` - zwraca aktywne alerty
  - Automatyczne czyszczenie starych alertów

#### 3.2.4 Trilateracja (`processor/trilateration.go`)

**FindPotentialSources(alerts []*Alert, minClusterSize int)**:
- Grupuje alerty przestrzennie (clustering)
- Dla każdego klastra >= minClusterSize:
  - Oblicza centroid (średnia lat/lon)
  - Tworzy `SourceGroup` z pozycją i listą alertów
- Zwraca listę `[]SourceGroup`

**Algorytm**:
1. Dla każdego alertu sprawdza odległość do innych alertów
2. Jeśli odległość < threshold → należą do tego samego źródła
3. Centroid jako średnia ważona pozycji (opcjonalnie z wagami score)

#### 3.2.5 Repository (`repository/`)

**alerts_repo.go**:
- `GeAlertByPK(deviceId, ts)` - pobiera pojedynczy alert
- `GetAlertsLastHour()` - query z GSI po `createdAt`

**sensors_repo.go**:
- `GetAllSensors()` - scan tabeli `devices`

#### 3.2.6 Router (`router/router.go`)
- Gin HTTP server
- CORS enabled
- Endpointy API dla frontendu
- Health check endpoint

#### 3.2.7 Presigned URLs
- **Cel**: Bezpieczny dostęp do plików audio w S3 bez publicznego bucketu
- **Implementacja**: AWS SDK v2 `s3.PresignClient`
- **Ważność**: 15 minut
- **Zastosowanie**: 
  - `GET /sources` - zamienia `s3Key` na presigned URL dla każdego alertu
  - `GET /alerts` - zamienia `s3Key` na presigned URL
- **Fix**: Używa `json.Encoder` z `SetEscapeHTML(false)` (unika `\u0026` → `%5Cu0026`)

---

### 3.3 Terraform Infrastructure (`terraform/`)

#### 3.3.1 Moduły

**provider.tf**:
```hcl
provider "aws" {
  region = var.aws_region
}
```

**variables.tf**:
- `aws_region` (default: eu-north-1)
- `project_name` (default: sound-forest)

**locals**:
```hcl
locals {
  project = var.project_name
  tags = {
    Project = var.project_name
  }
}
```

---

#### 3.3.2 API Gateway (`apigw.tf`)

```hcl
resource "aws_apigatewayv2_api" "http" {
  name          = "${local.project}-api"
  protocol_type = "HTTP"
  
  cors_configuration {
    allow_origins = ["*"]
    allow_methods = ["POST", "GET", "OPTIONS"]
    allow_headers = ["*"]
  }
}
```

**Routes**:
- `POST /register` → Lambda Register
- `POST /alert` → Lambda Alert

**Outputs**:
- `api_base_url`
- `register_endpoint`
- `alert_endpoint`

---

#### 3.3.3 DynamoDB (`ddb.tf`)

**Table: devices**
```hcl
resource "aws_dynamodb_table" "devices" {
  name         = "devices"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "deviceId"
  
  attribute {
    name = "deviceId"
    type = "S"
  }
}
```

**Table: alerts**
```hcl
resource "aws_dynamodb_table" "alerts" {
  name         = "alerts"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "deviceId"
  range_key    = "ts"
  
  stream_enabled   = true
  stream_view_type = "NEW_IMAGE"
  
  attribute {
    name = "deviceId"
    type = "S"
  }
  attribute {
    name = "ts"
    type = "S"
  }
  attribute {
    name = "createdAt"
    type = "S"
  }
  
  global_secondary_index {
    name            = "createdAt-index"
    hash_key        = "createdAt"
    projection_type = "ALL"
  }
  
  ttl {
    attribute_name = "ttl"
    enabled        = true
  }
}
```

---

#### 3.3.4 S3 (`s3.tf`)

```hcl
resource "random_id" "bucket_suffix" {
  byte_length = 4
}

resource "aws_s3_bucket" "audio" {
  bucket        = "${local.project}-audio-${random_id.bucket_suffix.hex}"
  force_destroy = true
}

resource "aws_s3_bucket_public_access_block" "audio" {
  bucket                  = aws_s3_bucket.audio.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
```

**Output**: `audio_bucket_name`, `audio_bucket_arn`

---

#### 3.3.5 SQS (`sqs.tf`)

```hcl
resource "aws_sqs_queue" "alerts" {
  name                        = "${local.project}-alerts.fifo"
  fifo_queue                  = true
  content_based_deduplication = true
  visibility_timeout_seconds  = 300
  message_retention_seconds   = 1209600  # 14 days
}
```

**Output**: `alerts_queue_url`

---

#### 3.3.6 EC2 (`ec2.tf`)

**AMI**: Amazon Linux 2023 (latest)

**Instance**:
```hcl
resource "aws_instance" "worker" {
  ami           = data.aws_ami.al2023.id
  instance_type = "t3.micro"
  key_name      = aws_key_pair.worker.key_name
  
  iam_instance_profile   = aws_iam_instance_profile.ec2_profile.name
  vpc_security_group_ids = [aws_security_group.ssh.id]
  
  user_data = <<-EOF
    #!/bin/bash
    yum update -y
    yum install -y golang git
  EOF
}
```

**IAM Role**:
- `ec2_sqs` policy: `sqs:ReceiveMessage`, `sqs:DeleteMessage`, `sqs:GetQueueAttributes`
- `ec2_ddb` policy: `dynamodb:GetItem`, `dynamodb:Query`, `dynamodb:Scan`
- `ec2_s3` policy: `s3:GetObject`, `s3:ListBucket` na bucket audio

**Security Group**:
- Ingress: SSH (port 22) z `0.0.0.0/0`
- Ingress: HTTP (port 8080) z `0.0.0.0/0` (dla API)
- Egress: All traffic

**Output**: `worker_public_ip`

---

#### 3.3.7 Lambda IAM & Deployment

**Lambda Register** (`lambda-register.tf`):
- Runtime: `provided.al2023`
- Handler: `bootstrap`
- Timeout: 10s
- Environment: `DEVICES_TABLE`, `AWS_REGION`
- IAM: DynamoDB PutItem

**Lambda Alert** (`lambda-alert.tf`):
- Runtime: `provided.al2023`
- Handler: `bootstrap`
- Timeout: 30s
- Environment: `DEVICES_TABLE`, `ALERTS_TABLE`, `BUCKET_NAME`, `AWS_REGION`
- IAM: DynamoDB GetItem/PutItem, S3 PutObject

**Lambda Enqueuer** (`lambda-enqueuer.tf`):
- Runtime: `provided.al2023`
- Handler: `bootstrap`
- Timeout: 10s
- Event Source: DynamoDB Stream
- Environment: `SQS_URL`, `AWS_REGION`
- IAM: DynamoDB Stream, SQS SendMessage

**Deployment**:
```bash
make build    # kompilacja Go binaries
make package  # tworzenie ZIP
terraform apply
```

---

## 4. Przepływ danych

### 4.1 Rejestracja czujnika

```
1. Czujnik → POST /register {id, lat, lon}
2. API Gateway → Lambda Register
3. Lambda Register → DynamoDB devices.PutItem
4. Lambda Register → Response {id, secret}
5. Czujnik zapisuje secret lokalnie
```

### 4.2 Wysyłanie alertu

```
1. Czujnik wykrywa dźwięk → POST /alert {id, data, audio}
2. API Gateway → Lambda Alert
3. Lambda Alert:
   a. Waliduje deviceId + secret w DynamoDB
   b. Dekoduje audio (base64 → binary)
   c. Upload do S3: deviceId/YYYY-MM-DD/timestamp.wav
   d. PutItem do DynamoDB alerts (deviceId, ts, s3Key, lat, lon, checksum, ...)
4. DynamoDB Stream → Lambda Enqueuer
5. Lambda Enqueuer → SQS.SendMessage {deviceId, ts}
6. EC2 Consumer (long-poll) → SQS.ReceiveMessage
7. EC2 Handler:
   a. GeAlertByPK(deviceId, ts) → pełne dane alertu
   b. Memory.Add(alert)
   c. FindPotentialSources(Memory.GetAll())
   d. Append do allSources (global, mutex-protected)
8. EC2 → SQS.DeleteMessage
```

### 4.3 Odczyt danych przez frontend

```
1. Frontend → GET http://ec2-ip:8080/sources
2. EC2 Handler:
   a. Deep copy allSources (aby uniknąć race condition)
   b. Dla każdego alert.s3Key:
      - Generuje presigned URL (ważny 15 min)
      - Zamienia s3Key na URL
   c. Response: {count, sources: [{lat, lon, alerts: [...]}]}
3. Frontend wyświetla źródła na mapie
4. Kliknięcie na alert → odtwarzanie audio z presigned URL
```

---

## 5. Modele danych

### 5.1 DynamoDB Schema

#### Table: devices
```go
type Sensor struct {
    DeviceID     string  `dynamodbav:"deviceId" json:"deviceId"`
    DeviceSecret string  `dynamodbav:"deviceSecret" json:"deviceSecret,omitempty"`
    FirstSeen    string  `dynamodbav:"firstSeen" json:"firstSeen"`
    LastSeen     string  `dynamodbav:"lastSeen" json:"lastSeen"`
    Lat          float64 `dynamodbav:"lat" json:"lat"`
    Lon          float64 `dynamodbav:"lon" json:"lon"`
}
```

**Klucze**:
- PK: `deviceId` (String)

---

#### Table: alerts
```go
type Alert struct {
    DeviceID    string  `dynamodbav:"deviceId" json:"deviceId"`
    TS          string  `dynamodbav:"ts" json:"ts"`          // ISO8601
    S3Key       string  `dynamodbav:"s3Key" json:"s3Key"`    // lub presigned URL
    Lat         float64 `dynamodbav:"lat" json:"lat"`
    Lon         float64 `dynamodbav:"lon" json:"lon"`
    Status      string  `dynamodbav:"status" json:"status"`
    Checksum    string  `dynamodbav:"checksum" json:"checksum"`
    CreatedAt   string  `dynamodbav:"createdAt" json:"createdAt"`
    ProcessedAt string  `dynamodbav:"processedAt,omitempty" json:"processedAt,omitempty"`
    Distance float64 `dynamodbav:"distance" json:"distance"
}
```

**Klucze**:
- PK: `deviceId` (String)
- SK: `ts` (String, sortowany)

**GSI**:
- `createdAt-index`: hash=`createdAt`, projection=ALL
  - Używane przez `GetAlertsLastHour()`

**Distance**:
- Odległość czujnika od wykrytego źródła dźwięku (w metrach)

---

### 5.2 SQS Message

```go
type Envelope struct {
    DeviceID string `json:"deviceId"`
    TS       string `json:"ts"`
}
```

**MessageGroupId**: `deviceId` (FIFO gwarantuje porządek per czujnik)

---

### 5.3 In-Memory Models

#### SourceGroup
```go
type SourceGroup struct {
    Lat    float64   `json:"lat"`
    Lon    float64   `json:"lon"`
    Alerts []*Alert  `json:"alerts"`
}
```

**Opis**: Reprezentuje wykryte źródło dźwięku — centroid klastra alertów + lista alertów należących do tego źródła.

---

## 6. API Endpoints

### 6.1 Public API (API Gateway)

**Base URL**: `https://{api-id}.execute-api.eu-north-1.amazonaws.com`

#### POST /register
Rejestracja nowego czujnika.

**Request**:
```json
{
  "lat": 52.2297,
  "lon": 21.0122
}
```

**Response** (200):
```json
{
  "deviceId": "device-uuid",
  "deviceSecret": "generated-secret-uuid"
}
```
**Errors**:
- 400: Invalid payload
- 500: DynamoDB error

---

#### POST /alert
Wysyłanie alertu dźwiękowego.

**Request**:
```json
{
    "deviceId": "device-uuid",
    "lat":50.0764,
    "lon":19.9312,
    "ts": "2025-12-03T20:00:00Z",
    "distance": 325.5,
    "audioB64": "base64-encoded-audio-data"
}
```

**Response** (200):
```json
{
    "ok": true,
    "s3Key": "s3key",
    "ts": "2025-12-03T21:35:51.793Z",
    "sha256":"sha256-of-file"
}
```

**Errors**:
- 400: Invalid payload / missing audio
- 401: Invalid device credentials
- 500: S3/DynamoDB error

---

### 6.2 EC2 Worker API

**Base URL**: `http://{ec2-public-ip}:8080`

#### GET /sensors
Lista wszystkich zarejestrowanych czujników.

**Response** (200):
```json
[
  {
    "deviceId": "sensor-001",
    "firstSeen": "2025-12-01T10:00:00Z",
    "lastSeen": "2025-12-03T20:00:00Z",
    "lat": 52.2297,
    "lon": 21.0122
  }
]
```

---

#### GET /sources
Lista wykrytych źródeł dźwięku (wynik trilateracji).

**Response** (200):
```json
{
  "count": 2,
  "sources": [
    {
      "lat": 52.2300,
      "lon": 21.0125,
      "alerts": [
        {
          "deviceId": "sensor-001",
          "ts": "2025-12-03T20:27:14Z",
          "s3Key": "https://sound-forest-audio-xxx.s3.eu-north-1.amazonaws.com/...?X-Amz-Algorithm=...",
          "lat": 52.2297,
          "lon": 21.0122,
          "status": "processed",
          "checksum": "sha256-hash",
          "createdAt": "2025-12-03T20:27:19Z"
        }
      ]
    }
  ]
}
```

**Uwagi**:
- `s3Key` jest zamieniony na presigned URL (ważny 15 min)
- Presigned URL pozwala bezpośrednie pobranie audio bez dodatkowej autoryzacji

---

#### GET /alerts
Alerty z ostatniej godziny.

**Response** (200):
```json
{
  "count": 5,
  "alerts": [
    {
      "deviceId": "sensor-001",
      "ts": "2025-12-03T20:27:14Z",
      "s3Key": "https://...",
      "lat": 52.2297,
      "lon": 21.0122,
      "status": "processed",
      "checksum": "...",
      "createdAt": "2025-12-03T20:27:19Z"
    }
  ]
}
```

---

## 7. Deployment

### 7.1 Wymagania

- **Terraform**: >= 1.0
- **Go**: >= 1.21
- **AWS CLI**: skonfigurowany profil z credentials
- **SSH Key**: `~/.ssh/iot_worker.pub` (dla EC2)

### 7.2 Kroki wdrożenia

#### 1. Kompilacja Lambda functions

```bash
cd infrastructure/terraform
make build
```

Powyższa komenda:
- Kompiluje `lambda-register`, `lambda-alert`, `lambda-enqueuer` (GOOS=linux GOARCH=amd64)
- Tworzy pliki ZIP w `terraform/`

#### 2. Deploy infrastruktury

```bash
terraform init
terraform plan
terraform apply
```

**Outputs**:
```
api_base_url = "https://xxx.execute-api.eu-north-1.amazonaws.com"
register_endpoint = "https://xxx.../register"
alert_endpoint = "https://xxx.../alert"
audio_bucket_name = "sound-forest-audio-473856a9"
alerts_queue_url = "https://sqs.eu-north-1.amazonaws.com/.../sound-forest-alerts.fifo"
worker_public_ip = "13.48.x.x"
```

#### 3. Konfiguracja EC2 Worker

**SSH do EC2**:
```bash
ssh -i ~/.ssh/iot_worker ec2-user@$(terraform output -raw worker_public_ip)
```

**Instalacja Go** (jeśli nie było w user_data):
```bash
sudo yum install -y golang git
```

**Clone repo**:
```bash
git clone https://github.com/user/sound-based-forest-monitoring.git
cd sound-based-forest-monitoring/infrastructure/ec2
```

**Konfiguracja** (`config/configuration.yml`):
```yaml
aws:
  region: "eu-north-1"
  sqs_url: "https://sqs.eu-north-1.amazonaws.com/.../sound-forest-alerts.fifo"
  devices_table: "devices"
  alerts_table: "alerts"
  bucket_name: "sound-forest-audio-473856a9"  # z terraform output
```

**Build & Run**:
```bash
go mod download
go build -o worker .
./worker
```

**Systemd service** (opcjonalnie):
```bash
sudo tee /etc/systemd/system/forest-worker.service > /dev/null <<EOF
[Unit]
Description=Forest Monitoring Worker
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/home/ec2-user/sound-based-forest-monitoring/infrastructure/ec2
ExecStart=/home/ec2-user/sound-based-forest-monitoring/infrastructure/ec2/worker
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable forest-worker
sudo systemctl start forest-worker
```

#### 4. Weryfikacja

**Test Lambda Register**:
```bash
curl -X POST https://xxx.../register \
  -H "Content-Type: application/json" \
  -d '{"id":"test-sensor","lat":52.2297,"lon":21.0122}'
```

**Test EC2 API**:
```bash
curl http://$(terraform output -raw worker_public_ip):8080/sensors
curl http://$(terraform output -raw worker_public_ip):8080/sources
```

---

### 7.3 Aktualizacja kodu

**Lambda**:
```bash
cd infrastructure/terraform
make build
terraform apply -target=aws_lambda_function.register  # lub alert, enqueuer
```

**EC2**:
```bash
ssh ec2-user@...
cd sound-based-forest-monitoring/infrastructure/ec2
git pull
go build -o worker .
sudo systemctl restart forest-worker
```

---

## 8. Konfiguracja

### 8.1 Terraform Variables

**variables.tf**:
```hcl
variable "aws_region" {
  default = "eu-north-1"
}

variable "project_name" {
  default = "sound-forest"
}
```

Można override przez:
```bash
terraform apply -var="aws_region=us-east-1"
```

Lub `terraform.tfvars`:
```hcl
aws_region   = "us-east-1"
project_name = "my-forest"
```

---

### 8.2 EC2 Configuration

**Plik**: `infrastructure/ec2/config/configuration.yml`

```yaml
aws:
  region: "eu-north-1"
  sqs_url: "https://sqs.eu-north-1.amazonaws.com/218795110405/sound-forest-alerts.fifo"
  devices_table: "devices"
  alerts_table: "alerts"
  bucket_name: "sound-forest-audio-473856a9"
```

**Ładowanie**:
```go
// main.go
config.Load()  // embedded config.yml przez go:embed

// użycie
region := config.AppConfig.AWS.Region
sqsURL := config.AppConfig.AWS.SQSURL
```

---

### 8.3 Environment Variables (alternatywa)

Lambda functions mogą używać env vars zamiast config file:
```hcl
environment {
  variables = {
    AWS_REGION      = var.aws_region
    DEVICES_TABLE   = aws_dynamodb_table.devices.name
    ALERTS_TABLE    = aws_dynamodb_table.alerts.name
    BUCKET_NAME     = aws_s3_bucket.audio.bucket
    SQS_URL         = aws_sqs_queue.alerts.url
  }
}
```

---

## 9. Bezpieczeństwo

### 9.1 IAM Policies

#### Lambda Register
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["dynamodb:PutItem"],
      "Resource": "arn:aws:dynamodb:region:account:table/devices"
    }
  ]
}
```

#### Lambda Alert
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["dynamodb:GetItem", "dynamodb:PutItem"],
      "Resource": [
        "arn:aws:dynamodb:region:account:table/devices",
        "arn:aws:dynamodb:region:account:table/alerts"
      ]
    },
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject"],
      "Resource": "arn:aws:s3:::sound-forest-audio-*/*"
    }
  ]
}
```

#### Lambda Enqueuer
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:DescribeStream",
        "dynamodb:GetRecords",
        "dynamodb:GetShardIterator",
        "dynamodb:ListStreams"
      ],
      "Resource": "arn:aws:dynamodb:region:account:table/alerts/stream/*"
    },
    {
      "Effect": "Allow",
      "Action": ["sqs:SendMessage"],
      "Resource": "arn:aws:sqs:region:account:sound-forest-alerts.fifo"
    }
  ]
}
```

#### EC2 Role
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "sqs:ReceiveMessage",
        "sqs:DeleteMessage",
        "sqs:GetQueueAttributes"
      ],
      "Resource": "arn:aws:sqs:region:account:sound-forest-alerts.fifo"
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ],
      "Resource": [
        "arn:aws:dynamodb:region:account:table/devices",
        "arn:aws:dynamodb:region:account:table/alerts",
        "arn:aws:dynamodb:region:account:table/alerts/index/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:ListBucket"],
      "Resource": [
        "arn:aws:s3:::sound-forest-audio-*",
        "arn:aws:s3:::sound-forest-audio-*/*"
      ]
    }
  ]
}
```

---

### 9.2 S3 Security

**Bucket Policy**: Brak (private bucket)

**Public Access Block**: Włączony (wszystkie opcje = true)

**Dostęp**:
- Lambda Alert: `s3:PutObject` przez IAM role
- EC2: `s3:GetObject` przez IAM role (dla presigned URLs)
- Zewnętrzni użytkownicy: tylko przez presigned URLs (ważne 15 min)

---

### 9.3 DynamoDB Security

**Encryption**: Domyślnie at-rest (AWS managed key)

**Access Control**: tylko przez IAM roles (Lambda, EC2)

**Streams**: tylko Lambda Enqueuer ma dostęp


---

### 9.4 Network Security

**API Gateway**:
- HTTPS only (TLS 1.2+)
- CORS włączony (allow all origins — można ograniczyć)

**EC2 Security Group**:
- Ingress SSH (22): `0.0.0.0/0` — **REKOMENDACJA**: ograniczyć do znanego IP
- Ingress HTTP (8080): `0.0.0.0/0` — dla frontendu (można użyć ALB + WAF)
- Egress: All traffic

**VPC**: Domyślny VPC (można przenieść do custom VPC z private subnets)

---

### 9.5 Secrets Management

**deviceSecret**:
- Generowany przez Lambda Register (UUID v4)
- Przechowywany w DynamoDB devices table
- Przekazywany czujnikowi tylko raz (przy rejestracji)
- Używany do autentykacji w Lambda Alert

---

### 9.6 Presigned URLs

**Bezpieczeństwo**:
- Generowane dynamicznie przez EC2 (AWS SDK)
- Ważność: 15 minut
- Nie wymaga dodatkowej autentykacji od użytkownika
- Automatyczne wygasanie (nie można użyć po expiry)

**Implementacja**:
```go
presigner := s3.NewPresignClient(s3.NewFromConfig(awsCfg))
ps, err := presigner.PresignGetObject(ctx, &s3.GetObjectInput{
    Bucket: aws.String(bucket),
    Key:    aws.String(s3Key),
}, func(opts *s3.PresignOptions) {
    opts.Expires = 15 * time.Minute
})
```
---

## 10. Ograniczenia i przyszłe usprawnienia

### 10.1 Obecne ograniczenia

- **Skalowalność EC2**: Jeden worker (t3.micro) — bottleneck przy dużej liczbie alertów
- **In-memory state**: `allSources` znika po restarcie EC2
- **Brak autentykacji frontend**: API EC2 publiczne bez auth
- **Region**: Hard-coded eu-north-1
- **Security Group**: SSH/HTTP otwarte dla `0.0.0.0/0`

---

### 10.2 Rekomendowane usprawnienia

1. **Auto Scaling**:
   - Użyć ECS/Fargate zamiast pojedynczej EC2
   - Auto Scaling Group dla EC2 workers
   - Load Balancer przed workers

2. **Persistent Storage**:
   - Zapisywać `allSources` do DynamoDB/RDS
   - Używać Redis/ElastiCache dla shared state

3. **API Security**:
   - API Gateway przed EC2 API (z Cognito/IAM auth)
   - Rate limiting (WAF)
   - VPC private subnets + NAT Gateway

4. **Monitoring**:
   - CloudWatch Dashboards
   - X-Ray dla distributed tracing
   - SNS alerts dla errors

5. **CI/CD**:
   - GitHub Actions / CodePipeline
   - Automatyczne buildy Lambda + deploy
   - Blue/Green deployment dla EC2

6. **Algorytm trilateracji**:
   - Bardziej zaawansowany clustering (DBSCAN)
   - Ważenie alertów (score, jakość sygnału)
   - Machine Learning dla klasyfikacji dźwięków

---

## 11. Podsumowanie

System **Sound-Based Forest Monitoring** to kompletne rozwiązanie serverless + EC2 do:
- Rejestracji czujników IoT
- Odbierania i przechowywania alertów dźwiękowych
- Lokalizacji źródeł dźwięku (trilateracja)
- Udostępniania danych przez REST API

**Kluczowe technologie**:
- AWS Lambda, API Gateway, DynamoDB, S3, SQS, EC2
- Go (Gin framework)
- Terraform (IaC)

**Główne funkcjonalności**:
- Asynchroniczne przetwarzanie (SQS queue)
- Presigned URLs dla bezpiecznego dostępu do audio
- In-memory clustering i trilateracja
- RESTful API dla frontendu

**Deployment**: Pełna automatyzacja przez Terraform + Makefile.

---
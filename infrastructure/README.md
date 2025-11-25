# README — Jak postawić architekturę na AWS

Poniżej znajdziesz **pełną instrukcję krok po kroku** do uruchomienia architektury na AWS.
Domyślny region: **`eu-north-1` (Sztokholm)**

---

## 0) Wymagania wstępne

- **AWS CLI v2**
- **Terraform** (>= 1.6)
- **Make**
- **OpenSSH**
- (opcjonalnie) **Go** oraz **zip/unzip**

---

## 1) Konfiguracja AWS CLI

Uruchom:

```bash
aws configure
```

Wprowadź dane:

```
AWS Access Key ID [None]: <TWÓJ_ACCESS_KEY>
AWS Secret Access Key [None]: <TWÓJ_SECRET_KEY>
Default region name [None]: eu-north-1
Default output format [None]: json
```

Sprawdź konfigurację:

```bash
aws sts get-caller-identity
aws configure get region  # powinno zwrócić eu-north-1
```

---

## 2) Klucz SSH dla EC2 (`~/.ssh/iot_worker`)

Jeśli jeszcze go nie masz:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/iot_worker -C iot_worker
chmod 600 ~/.ssh/iot_worker
```

Upewnij się, że publiczny klucz istnieje:

```bash
ls ~/.ssh/iot_worker.pub
```

---

## 3) Build aplikacji

Z katalogu `terraform/`:

```bash
make build-all
```

---

## 4) Terraform — tworzenie infrastruktury

W katalogu `terraform`:

```bash
terraform init
terraform plan
terraform apply -auto-approve
```

---

## 5) Outputy z Terraforma

Po zakończeniu `terraform apply` zobaczysz coś w tym stylu:

```bash
Outputs:

api_base_url = "https://abc123.execute-api.eu-north-1.amazonaws.com"
register_endpoint = "https://abc123.execute-api.eu-north-1.amazonaws.com/register"
alert_endpoint = "https://abc123.execute-api.eu-north-1.amazonaws.com/alert"
audio_bucket = "sound-forest-audio"
alerts_queue_url = "https://sqs.eu-north-1.amazonaws.com/218795110405/sound-forest-alerts.fifo"
worker_public_ip = "13.48.xxx.xxx"
```

Aby w dowolnym momencie uzyskać je ponownie:

```bash
terraform output
```

Lub pojedynczo:

```bash
terraform output -raw api_base_url
terraform output -raw alerts_queue_url
terraform output -raw worker_public_ip
```

Zapisz wartości, bo będą potrzebne w kolejnych krokach.

---

## 6) Konfiguracja aplikacji (`configuration.yml`)

1. Skopiuj szablon:

   ```bash
   cp configuration_template.yml configuration.yml
   ```

2. Uzupełnij sekcję `aws:` według wartości z outputów Terraform:

```yaml
aws:
  region: "eu-north-1"
  sqs_url: "output_z_terraform"
  devices_table: "devices"
  alerts_table: "alerts"
```

> Wartość `sqs_url` skopiuj z outputu **`alerts_queue_url`**.

---

## 7) Wgranie builda i konfiguracji na EC2

W katalogu `terraform`:

```bash
make build-ec2
```

Pobierz IP z outputu:

```bash
EC2_IP=$(terraform output -raw worker_public_ip)
```

Skopiuj pliki:

```bash
scp -i ~/.ssh/iot_worker dist_ec2.zip ec2-user@"$EC2_IP":~
```

---

## 8) Uruchomienie workera na EC2

Połącz się z instancją:

```bash
ssh -i ~/.ssh/iot_worker ec2-user@"$EC2_IP"
```

Na serwerze:

```bash
unzip -o dist_ec2.zip
chmod +x worker
nohup ./worker > worker.log 2>&1 &
tail -f worker.log
```

---

## 9) Weryfikacja działania

- Sprawdź logi workera:

  ```bash
  tail -f worker.log
  ```

- Sprawdź czy kolejka SQS istnieje:

  ```bash
  aws sqs get-queue-attributes \
    --queue-url "$(terraform output -raw alerts_queue_url)" \
    --attribute-names All \
    --region eu-north-1
  ```

- Sprawdź endpointy API:

  ```bash
  echo "Register endpoint: $(terraform output -raw register_endpoint)"
  echo "Alert endpoint: $(terraform output -raw alert_endpoint)"
  ```

---

## 10) Usuwanie infrastruktury

Gdy chcesz zniszczyć całość:

```bash
terraform destroy -auto-approve
```

---

## 📘 Szybka ściąga

```bash
# AWS CLI
aws configure  # region: eu-north-1

# SSH key
ssh-keygen -t ed25519 -f ~/.ssh/iot_worker -C iot_worker

# Build
make build-all

# Terraform
terraform init
terraform apply -auto-approve

# Outputs
terraform output
terraform output -raw worker_public_ip

# Config
cp configuration_template.yml configuration.yml
# uzupełnij region + sqs_url z alerts_queue_url

# Deploy
scp -i ~/.ssh/iot_worker build/worker_linux_amd64.zip ec2-user@$(terraform output -raw worker_public_ip):~
scp -i ~/.ssh/iot_worker configuration.yml ec2-user@$(terraform output -raw worker_public_ip):~

# Start na EC2
ssh -i ~/.ssh/iot_worker ec2-user@$(terraform output -raw worker_public_ip)
unzip -o worker_linux_amd64.zip
chmod +x worker
nohup ./worker > worker.log 2>&1 &
```

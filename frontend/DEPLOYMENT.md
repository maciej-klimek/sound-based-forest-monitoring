

```bash
cd frontend
npm install
npm run build
```

```bash
tar -czvf frontend-build.tar.gz dist
scp -i [ŚCIEŻKA_DO_KLUCZA_SSH] frontend-build.tar.gz [UŻYTKOWNIK]@[IP_SERWERA_EC2]:~
```

```bash
ssh -i [ŚCIEŻKA_DO_KLUCZA_SSH] [UŻYTKOWNIK]@[IP_SERWERA_EC2]
```

```bash
tar -xzvf frontend-build.tar.gz
sudo yum install nginx -y
sudo nano /etc/nginx/conf.d/frontend.conf
```

```nginx
# Wklej do /etc/nginx/conf.d/frontend.conf
server {
    listen 80;
    server_name [IP_SERWERA_EC2];

    root /home/[UŻYTKOWNIK]/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~ ^/(alerts|sensors|sources) {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

```bash
sudo nginx -t
sudo systemctl start nginx
sudo systemctl enable nginx
```

## co trzeba zmienic na froncie
Wkleic to co dostajecie w responsie od backa (np na sources/alerts) i dac do czata zeby im to naniosl na mape

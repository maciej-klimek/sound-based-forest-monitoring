# Frontend – Sound-Based Forest Monitoring Dashboard

## 1. Przegląd frontendu

Frontend systemu **Sound-Based Forest Monitoring** to panel operatorski służący do:

* wizualizacji czujników zainstalowanych w lesie na mapie,
* prezentacji wykrytych źródeł dźwięku (wynik trilateracji / grupowania alertów),
* podglądu aktywnych alertów i pełnej historii alertów,
* odtwarzania (pobierania) nagrań audio powiązanych z konkretnymi zdarzeniami,
* wyszukiwania po współrzędnych, sensorach i źródłach na mapie.

Frontend jest zbudowany jako **SPA** (Single Page Application) w React, z wykorzystaniem:

* **React + React Router** – struktura aplikacji i nawigacja między widokiem mapy a historią,
* **Vite** – środowisko budowania i dev server,
* **Tailwind CSS** – utility-based warstwa wizualna,
* **React-Leaflet + Leaflet** – mapa, markery, okręgi, triangulacja,
* własnych hooków (`useSensors`, `useSources`, `useAlerts`) do komunikacji z API backendu.


---

## 2. Architektura frontendu

### 2.1 Struktura katalogów

W katalogu `frontend/src` znajdują się:

* `App.jsx` - główna konfiguracja nawigacji (routing) aplikacji,
* `main.jsx` – punkt wejścia (montowanie Reacta),
* `index.css` – styl bazowy, integracja z Tailwindem i stylami Leaflet,
* `components/` – komponenty UI (mapa, panele, modal, wyszukiwarka),
* `hooks/` – hooki do komunikacji z backendem,
* `layouts/` – layout aplikacji (nawigacja, wspólna ramka),
* `pages/` – strony: widok mapy (`MapPage`) i historia (`HistoryPage`),
* `utils/` – funkcje pomocnicze.

Podział odzwierciedla warstwy:

* **layout** – wspólne ramy graficzne,
* **pages** – widoki na poziomie routingu,
* **components** – mniejsze, wielokrotnie używane klocki,
* **hooks** – warstwa komunikacji z API,
* **utils** – proste operacje na danych.

### 2.2 Główne widoki

Aplikacja ma dwie główne podstrony (routy):

* `/mapa` – **MapPage**:

  * mapa z czujnikami,
  * „białe targety” (sources z trilateracji) z możliwością otwarcia szczegółów,
  * „okręgi” zasięgu alertów (z `/alerts`),
  * panel **Active Alerts** po lewej.
* `/historia` – **HistoryPage**:

  * panel **Active Alerts** po lewej (tylko bieżące alerty),
  * pełna, filtrowalna i sortowalna historia alertów po prawej.

Przełączanie między widokami odbywa się przez **React Router** (`NavLink` + `Outlet` w `AppLayout`).

---

## 3. Integracja z backendem

Frontend komunikuje się z warstwą EC2/worker po HTTP:

* **EC2 Worker API**:

  * `GET /sensors` – lista zarejestrowanych czujników (`devices`),
  * `GET /sources` – wykryte źródła dźwięku (grupy alertów),
  * `GET /alerts` – alerty z ostatniej godziny (z presigned URL-ami do audio).

### 3.1 Konwencja adresów API

W kodzie przyjęto następujący model:

* dla alertów:

  ```js
  const API = import.meta.env.VITE_API_BASE_URL || "/api";
  const res = await fetch(`${API}/alerts`);
  ```

  * w trybie produkcyjnym:

    * zmienna środowiskowa `VITE_API_BASE_URL` wskazuje na adres backendu, np.
      `VITE_API_BASE_URL="http://worker-public-ip:8080"`
      lub (przy Nginx) `VITE_API_BASE_URL="/api"`, a Nginx proxuje `/api` → worker,
  * fallback: gdy zmienna nie jest ustawiona, używany jest prefiks `/api`, który zwykle jest obsługiwany przez reverse proxy (Nginx).

* dla sensorów i źródeł:

  ```js
  fetch("/api/sensors");
  fetch("/api/sources");
  ```

  – zakładają, że **reverse proxy** (np. Nginx) przekieruje wszystkie żądania `/api/*` na backend (EC2 worker).

W produkcji komunikacja wygląda więc tak:

```text
Przeglądarka → Nginx (frontend host) → /api/... → EC2 worker (port 8080)
```

### 3.2 Modele danych po stronie frontendu

Aby uprościć logikę UI i uniezależnić się od drobnych różnic w odpowiedzi backendu, zastosowano funkcje normalizujące w hookach.

#### `useSensors` → `/api/sensors`

Oczekiwane struktury:

* lista: `[ { ... }, ... ]`, albo
* obiekt: `{ sensors: [ { ... } ], count: n }`.

Normalizacja:

```ts
{
  id: string,          // deviceId lub s.id
  lat: number | null,
  lon: number | null,
  firstSeen?: string,
  lastSeen?: string,
  score?: number       // jeśli backend zwraca np. score
}
```

#### `useAlerts` → `/api/alerts`

Obsługuje `[{...}]` i `{alerts: [...]}`.

Normalizacja:

```ts
{
  id: string,          // id / alertId / checksum / fallback A001, A002...
  status: string,      // np. "new"
  createdAt: string | null,
  deviceId: string | null,
  lat: number | null,
  lon: number | null,
  distance: number | null,
  checksum?: string,
  s3Key?: string | null,
  audioUrl?: string | null,
  devices: string[]    // lista urządzeń powiązanych z alertem
}
```

Presigned URL z backendu jest podpinany jako `audioUrl` i wykorzystywany w modalu do otwarcia nagrania.

#### `useSources` → `/api/sources`

Oczekiwany kontrakt (w duchu dokumentacji backendu `GET /sources`):

```json
{
  "count": 2,
  "sources": [
    {
      "id": "…",
      "lat": 52.2300,
      "lon": 21.0125,
      "status": "new",
      "devices": ["sensor-001", "sensor-002"],
      "alerts": [ ... ]
    }
  ]
}
```

`normalizeSources`:

* agreguje dane alertów w ramach jednego źródła,
* deduplikuje alerty na podstawie `(deviceId, s3Key, ts, checksum)`,
* wylicza stabilny `id` na potrzeby UI (`sourceId` / `checksum` / `ts` + indeks),
* zwraca:

```ts
{
  id: string,
  lat: number | null,
  lon: number | null,
  status: string,
  createdAt?: string | null,
  devices: string[],
  rawAlerts: NormalizedAlert[]
}
```

---

## 4. Hooki i cykle odświeżania

### 4.1 `useSensors`

```js
export function useSensors(pollMs = 10000)
```

* polluje `/api/sensors` co `pollMs` ms (domyślnie 10 s),
* zwraca `{ sensors, loading, error }`,
* czyści `setInterval` przy unmountowaniu,
* loguje błędy w konsoli i czyści listę przy problemach.

### 4.2 `useAlerts`

```js
export function useAlerts(intervalMs = 10000)
```

* polluje `${API}/alerts` co `intervalMs` ms,
* korzysta z `VITE_API_BASE_URL` lub `/api`,
* normalizuje dane przez `normalizeAlerts`,
* zwraca `{ alerts, loading, error }`,
* loguje surowy JSON i znormalizowane alerty w konsoli (ułatwia debugowanie).

### 4.3 `useSources`

```js
export function useSources(pollMs = 10000)
```

* polluje `/api/sources`,
* wykonuje grupowanie i deduplikację alertów w ramach źródła,
* zwraca `{ sources, loading, error }`.

---

## 5. Komponenty UI

### 5.1 `MapView`

Najważniejszy komponent wizualny. Odpowiada za:

* wyświetlanie mapy (OpenStreetMap lub imagery Esri),
* renderowanie czujników (`sensors`) jako małe punkty,
* renderowanie źródeł (`sources`) jako „białe targety” z opcjonalnym pulsowaniem (dla `status === "new"`),
* rysowanie okręgów (Leaflet `Circle`) wokół pozycji alertu (`alertsWithCoords` – z `/alerts`),
* rysowanie linii triangulacji (`Polyline`) między źródłem a czujnikami biorącymi udział,
* panel wyszukiwania (`SearchBox`),
* przełączniki:

  * **Signal Zones** – widoczność okręgów,
  * **Sensors** – widoczność czujników,
  * **Triangulation** – widoczność linii i targetów.

Props:

```ts
{
  sources: Source[],        // wynik useSources (np. tylko aktywne)
  sensors: Sensor[],        // wynik useSensors
  alerts: Alert[],          // aktywne alerty z useAlerts
  mapRef: Ref<LeafletMap>,
  loading: boolean,
  onAlertSelect?: (src: Source) => void
}
```

Dodatkowo `MapView` zawiera:

* `MapFlyTo` – mały komponent z `useMap`, który automatycznie przelatuje nad wybrane źródło, gdy użytkownik wybierze je z dropdownu „Focus”,
* dropdown „Focus” – filtruje `displayedSources` i ustawia `flyPosition`.

### 5.2 `SearchBox`

Wyszukiwarka mapowa obsługująca:

* wyszukiwanie po ID sensora,
* wyszukiwanie po ID źródła (alertu),
* ręczne podanie współrzędnych `lat,lon` (np. `50.06, 19.94`),
* geokodowanie nazw miejsc przez Nominatim (OpenStreetMap).

Dla każdego wyniku:

* kliknięcie wywołuje `onSelect([lat, lon], item)`,
* w `MapView` przekłada się to na `mapRef.current.flyTo`.

Pozwala to szybko:

* przejść do konkretnego czujnika lub źródła,
* przeskoczyć do dowolnego punktu na mapie.

### 5.3 `AlertsPanel`

Lewy panel w `MapPage` i `HistoryPage`, prezentujący **aktywne alerty** (status `new`):

* pokazuje całkowitą liczbę aktywnych alertów,
* umożliwia sortowanie po:

  * `createdAt` (Time),
  * `id` (ID),
* każdy kafelek zawiera:

  * skrócone ID (`shortId`),
  * listę czujników (`devices`) uczestniczących w zdarzeniu,
  * przycisk **📍 Show on map** wywołujący `onSelect([lat, lon])`,
  * kliknięcie w kafelek wywołuje `onShow(alert)` i otwiera modal.

### 5.4 `HistoryList`

Rozbudowany widok historii alertów:

* filtr tekstowy `q` działający na:

  * `id`,
  * `status`,
  * `devices[]`,
* osobne filtry po `Lat` i `Lon` (na poziomie fragmentu stringa),
* sortowanie po:

  * `id`,
  * `createdAt`,
  * `status`,
* wyróżnienie aktualnie nowych alertów (`status === "new"`) innym tłem.

Kliknięcie w wiersz:

* wywołuje `onShow(item)`,
* otwiera `AlertModal` ze szczegółami.

### 5.5 `AlertModal`

Wspólny modal do prezentowania:

* pojedynczego alertu z `/alerts`, albo
* zagregowanego `source` z `rawAlerts`.

Zawiera:

* nagłówek z:

  * „⚠️ THREAT DETECTED”,
  * skróconym ID,
  * statusem (`new` / inny),
  * timestampem (`createdAt`),
* panel „Location”:

  * `lat` / `lon` z dokładnością do 5 miejsc po przecinku,
  * przycisk **Locate on Map** (jeśli przekazano `onFly`),
* panel „Participating Sensors” z listą `devices`,
* panel „Acoustic Evidence”:

  * listę nagrań (`events`),
  * dla każdego nagrania:

    * `deviceId`,
    * odległość w metrach (jeśli dostępna),
    * czas (`ts`),
    * przycisk **Open Source** otwierający `audioUrl` w nowej karcie.

Modal reaguje na:

* `Escape`,
* kliknięcie w tło (zamyka),
* przycisk `×` w prawym górnym rogu.

---

## 6. Logika stron

### 6.1 `MapPage`

Korzysta z:

* `useSensors(10_000)`,
* `useSources(10_000)`,
* `useAlerts(10_000)`,

i buduje nad tym:

* `activeSources = sources.filter(s => s.status === "new")`,
* `normalizedAlerts` – standaryzacja (`id`, `status`, `createdAt`, `lat`, `lon`, `distance`, `devices`, `deviceId`, `ts`, `audioUrl`),
* `activeAlerts = normalizedAlerts.filter(a => a.status === "new")`,
* `loading = sensorsLoading || sourcesLoading || alertsLoading`.

Obsługuje:

* `flyTo(pos)` – przesuwanie mapy do [lat, lon],
* `openSourceModal(src)` – modal z `events = src.rawAlerts`,
* `openAlertModal(a)` – modal z pojedynczym zdarzeniem pochodzącym z `/alerts`.

W JSX:

* lewa kolumna:

  * `AlertsPanel` (aktywne alerty),
  * komunikaty błędów (`Sources Error`, `Sensors Error`, `Alerts Error`),
* prawa kolumna:

  * `MapView` z:

    * `sources={activeSources}`,
    * `sensors={sensors}`,
    * `alerts={activeAlerts}`,
    * `onAlertSelect={openSourceModal}`,
* wspólny `<AlertModal>` z `onFly`, który:

  * przesuwa mapę do wskazanej pozycji,
  * zamyka modal.

### 6.2 `HistoryPage`

Korzysta z:

* `useAlerts(10_000)`,

buduje:

* `normalizedAlerts` (analogicznie jak w MapPage),
* `activeAlerts = normalizedAlerts.filter(a => a.status === "new")`.

Obsługuje:

* `openAlertModal(a)` – modal z pojedynczym zdarzeniem.

W JSX:

* lewa kolumna:

  * `AlertsPanel` z aktywnymi alertami,
* prawa kolumna:

  * `HistoryList` z pełną historią,
* `AlertModal` (tym razem bez `onFly`, bo nie ma mapy na ekranie).

---

## 7. Konfiguracja środowiska

### 7.1 Wymagania

Na komputerze deweloperskim:

* **Node.js** ≥ 18 (LTS),
* **npm** (lub pnpm / yarn),
* repozytorium `sound-based-forest-monitoring`,
* działający backend (EC2 worker) lub stub API.

### 7.2 Zmienne środowiskowe (Vite)

W katalogu `frontend/` można zdefiniować `.env.local`:

```bash
VITE_API_BASE_URL="http://13.48.x.x:8080"
```

gdzie `13.48.x.x` to `worker_public_ip` z Terraform:

```bash
terraform output -raw worker_public_ip
```

Alternatywnie:

```bash
VITE_API_BASE_URL="/api"
```

* konfiguracja reverse proxy (Nginx) przekierowującego `/api` na backend.

---

## 8. Uruchomienie frontendu – tryb deweloperski

### 8.1 Instalacja zależności

```bash
cd frontend
npm install
```

### 8.2 Konfiguracja API

Utwórz plik `frontend/.env.local`:

```bash
VITE_API_BASE_URL="http://13.48.x.x:8080"
```

lub inne sensowne URL / `/api` w zależności od środowiska.

### 8.3 Start dev-servera

```bash
npm run dev
```

* domyślny adres: `http://localhost:5173`,
* dostępne widoki:

  * **Map** – mapa, czujniki, źródła, alerty,
  * **History** – pełna historia alertów.

---

## 9. Budowanie i wdrażanie frontendu (produkcja)

### 9.1 Budowa

```bash
cd frontend
npm run build
```

Build produkcyjny ląduje w `frontend/dist/`.

### 9.2 Wdrożenie z Nginx (na tej samej EC2 co worker)

1. Skopiuj build na serwer:

   ```bash
   scp -r frontend/dist/ ec2-user@13.48.x.x:/home/ec2-user/frontend-dist
   ```

2. Przenieś do katalogu serwowanego przez Nginx:

   ```bash
   sudo mkdir -p /var/www/forest-frontend
   sudo cp -r /home/ec2-user/frontend-dist/* /var/www/forest-frontend/
   ```

3. Konfiguracja Nginx, np. `/etc/nginx/conf.d/forest.conf`:

   ```nginx
   server {
       listen 80;
       server_name _;

       root /var/www/forest-frontend;
       index index.html;

       # SPA – wszystkie ścieżki nie-API → index.html
       location / {
           try_files $uri $uri/ /index.html;
       }

       # Proxy do backendu: /api → http://localhost:8080
       location /api/ {
           proxy_pass         http://localhost:8080/;
           proxy_http_version 1.1;
           proxy_set_header   Host $host;
           proxy_set_header   X-Real-IP $remote_addr;
           proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header   X-Forwarded-Proto $scheme;
       }
   }
   ```

4. Restart Nginx:

   ```bash
   sudo systemctl restart nginx
   ```

Po wdrożeniu:

* frontend jest dostępny pod `http://13.48.x.x/`,
* żądania `/api/*` są proxy’owane do worker’a (`http://localhost:8080`),
* frontend może używać `VITE_API_BASE_URL="/api"` lub domyślnego `/api`.

---

## 10. Monitoring i debugowanie frontendu

Mechanizmy pomocnicze:

* logi w konsoli:

  * `useAlerts` loguje surowy JSON i znormalizowane alerty,
  * błędy pobierania wyświetlane przez `console.error`,
* wskaźniki stanu w UI:

  * komunikaty błędów w panelach (`Sources Error`, `Sensors Error`, `Alerts Error`),
  * „loading…”, „Synchronizacja danych…”, overlay „ładowanie mapy…”.

W razie problemów:

* można w devtools sprawdzić odpowiedzi na `/api/alerts`, `/api/sources`, `/api/sensors`,
* zweryfikować konfigurację Nginx (czy `/api` jest poprawnie proxy’owane).

---

## 12. Podsumowanie

Frontend systemu **Sound-Based Forest Monitoring**:

* zapewnia intuicyjny panel operatorski do nadzoru nad czujnikami i źródłami dźwięku,
* jest spójnie spięty z backendem (`/sensors`, `/sources`, `/alerts`),
* wykorzystuje nowoczesny stack (React, Vite, Tailwind, React-Leaflet),
* ma klarowny podział na warstwy:

  * hooki – komunikacja z API i normalizacja danych,
  * komponenty – wizualizacja,
  * strony – logika funkcjonalna (mapa vs historia),
* posiada realistyczną ścieżkę wdrożenia:

  * build Vite → `dist/`,
  * Nginx serwujący statyki i proxy `/api` → EC2 worker.


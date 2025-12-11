# Dokumentacja Modułu Processor

## Spis treści

* Przegląd modułu
* Komponenty
* Algorytmy
* Struktury danych
* API funkcji
* Testowanie
* Przykłady użycia

---

## 1. Przegląd modułu

Moduł **processor** (`processor`) jest sercem systemu lokalizacji źródeł dźwięku. Odpowiada za:

* Przechowywanie aktywnych alertów w pamięci (time‑window cache)
* Wykrywanie źródeł dźwięku metodą trilateracji
* Grupowanie nakładających się okręgów (circular regions)
* Wizualizację wyników na mapie (PNG)

### Kluczowe technologie

* Go: 1.21+
* Algorytm: Bron-Kerbosch (maksymalne kliki w grafie)
* Wizualizacja: `github.com/fogleman/gg` (2D graphics)
* Geometria: Haversine (odległości geodezyjne)

---

## 2. Komponenty

### 2.1 Memory (`memory.go`)

**Cel:** In-memory cache alertów z automatycznym wygasaniem (TTL).

#### Struktura

```go
type AlertEntry struct {
    Alert    *models.Alert
    Received time.Time
}

type Memory struct {
    mu     sync.RWMutex
    alerts map[string]AlertEntry
    ttl    time.Duration
}
```

#### Metody

### `NewMemory(ttl time.Duration) *Memory`

Tworzy nową instancję cache z podanym TTL.

**Parametry:**

* `ttl` — czas życia alertów (np. `5 * time.Minute`)

**Działanie:**

* Inicjalizuje pustą mapę `alerts`
* Uruchamia goroutine `backgroundPrune()` (czyszczenie co 10s)

**Przykład:**

```go
mem := processor.NewMemory(5 * time.Minute)
```

---

### `Add(a *models.Alert)`

Dodaje alert do cache.

**Parametry:**

* `a` — alert

**Thread-safe:** Tak

**Przykładowy log:**

```
[Memory] Added alert: key=sensor-001#2025-12-03T20:00:00Z device=sensor-001 ts=2025-12-03T20:00:00Z
```

---

### `GetAll() []*models.Alert`

Zwraca wszystkie aktywne alerty.

**Thread-safe:** Tak

**Log:**

```
[Memory] Retrieving all alerts: count=12
```

---

### `Prune()`

Usuwa wygasłe alerty (starsze niż TTL).

**Log:**

```
[Memory] Pruning expired alert: key=sensor-001#... cutoff=...
[Memory] Prune completed: before=15 after=12 pruned=3
```

---

### `backgroundPrune()`

Goroutine uruchamiana w konstruktorze.

**Działanie:** ticker co 10s → `Prune()`.

**Log:**

```
[Memory] Background prune started (interval=10s)
```

---

## 2.2 Trilateration (`trilateration.go`)

**Cel:** wykrywanie źródeł dźwięku przez analizę nakładających się okręgów.

### Struktura `SourceGroup`

```go
type SourceGroup struct {
    Lat    float64         `json:"lat"`
    Lon    float64         `json:"lon"`
    Alerts []*models.Alert `json:"alerts"`
}
```

---

### Funkcja `FindPotentialSources(alerts []*models.Alert, minOverlaps int) []SourceGroup`

**Cel:** Główna funkcja trilateracji.

**Etapy algorytmu:**

1. Budowa macierzy overlap
2. Algorytm Bron-Kerbosch
3. Walidacja grup
4. Obliczanie centroidu

**Log przykładowy:**

```
=== Overlap Matrix ===
[false true true false]
...
Candidate clique indices: [0 1 2]
Valid group!
```

---

### Funkcja `validGroup(...)`

Sprawdza minimalną liczbę par overlap.

---

### `MergeGroups(groups []SourceGroup, minShared int)`

Łączy grupy współdzielące alerty.

**Przykład:**

```go
merged := processor.MergeGroups(groups, 2)
```

---

## 2.3 Utils (`utils.go`)

Zbiór funkcji pomocniczych.

### `Haversine(lat1, lon1, lat2, lon2)`

Oblicza odległość geodezyjną.

**Wzór:**
( d = R * c )

**Przykład:**

```go
dist := processor.Haversine(52.2297, 21.0122, 52.2300, 21.0125)
// ≈ 32.5 m
```

### Pozostałe funkcje

* `Distance()` — alias
* `FilterConnected()` — dla Bron‑Kerbosch
* `RemoveInt()`
* `SharesAtLeastAlerts()`
* `ContainsAlert()`

---

## 2.4 Visualize (`visualize.go`)

Generuje mapę PNG alertów i źródeł.

### Funkcja `Visualize(alerts, sources, filename)`

**Rysuje:**

* czerwone okręgi (alerty)
* niebieskie linie z odległościami
* zielone punkty (źródła)

**Przykład:**

```go
err := processor.Visualize(alerts, sources, "map.png")
```

---

## 3. Algorytmy

### 3.1 Bron-Kerbosch

Algorytm znajdowania maksymalnych klik.

**Pseudokod:**

```
BronKerbosch(R, P, X):
    if P and X empty → report R
    for v in P:
        BronKerbosch(R ∪ {v}, P ∩ N(v), X ∩ N(v))
        P := P \ {v}
        X := X ∪ {v}
```

### 3.2 Trilateracja

Wyznaczanie punktu na podstawie odległości od sensorów.

**Równania:**
( (x - x_a)^2 + (y - y_a)^2 = d_a^2 )

Implementacja używa centroidu.

---

## 4. Struktury danych

### 4.1 `models.Alert`

```go
type Alert struct {
    DeviceID string
    TS       string
    S3Key    string
    Lat      float64
    Lon      float64
    Distance float64
    Status   string
}
```

---

## 5. API funkcji

### Public API

```go
mem := processor.NewMemory(5 * time.Minute)
mem.Add(alert)
alerts := mem.GetAll()

sources := processor.FindPotentialSources(alerts, 2)
sources = processor.MergeGroups(sources, 2)

err := processor.Visualize(alerts, sources, "output.png")
```

### Internal helpers

```go
dist := processor.Haversine(...)
connected := processor.FilterConnected(...)
```

---

## 6. Testowanie

### 6.1 Unit Tests (`processor_test.go`)

Test trilateracji na mock danych.

**Scenariusz:**

1. Wczytaj mock JSON
2. Uruchom trilaterację
3. Sprawdź wyniki
4. Wygeneruj PNG

**Output:**

```
=== Overlap Matrix ===
Candidate clique indices: [0 1 2]
Valid group!
Visualization saved to test_output.png
--- PASS
```

### 6.2 Mock Data

```json
[
  { "deviceId": "sensor-001", "lat": 52.2297, "lon": 21.0122, "Distance": 325.5 },
  { "deviceId": "sensor-002", "lat": 52.2300, "lon": 21.0125, "Distance": 310.0 },
  { "deviceId": "sensor-003", "lat": 52.2295, "lon": 21.0120, "Distance": 330.0 }
]
```

### 6.3 Test Coverage

* ✔ happy path
* ✔ <3 alerty
* ☐ brak overlap
* ☐ stress test 1000+
* ☐ concurrency test

---

## 7. Przykłady użycia

### 7.1 Integracja z Handler

```go
sources := processor.FindPotentialSources(allAlerts, 2)
sources = processor.MergeGroups(sources, 2)
```

### 7.2 Standalone script

```go
sources := processor.FindPotentialSources(alerts, 2)
processor.Visualize(alerts, sources, "debug.png")
```

### 7.3 Przykładowy output

Mapa z:

* czerwonymi okręgami
* niebieskimi liniami
* zielonymi punktami

---

## Podsumowanie

Moduł **processor** implementuje:

* Memory: cache z TTL
* Trilateration: Bron‑Kerbosch + centroid
* Visualization: PNG z okręgami i źródłami
* Utils: Haversine, operacje na grafie

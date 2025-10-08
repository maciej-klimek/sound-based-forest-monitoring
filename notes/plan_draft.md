# Podział projektu na działy

| Dział | Główna odpowiedzialność |
|-------|--------------------------|
| **Hardware & Sensor Design** | projekt i budowa czujnika dźwięku |
| **Embedded Software** | firmware mikrokontrolera, przetwarzanie lokalne, oszczędność energii |
| **Cloud Integration** | komunikacja z serwerem, integracja z AWS |
| **Data Processing & AI** | analiza audio, klasyfikacja dźwięków, może model AI |
| **Visualization & UI** | dashboard, mapa czujników, alerty |
| **Project Management & Documentation** | integracja, testy, dokumentacja techniczna, raport końcowy |

---

# Plan koncepcyjny projektu – „System wykrywający nielegalną wycinkę drzew”

## Cel ogólny
Stworzenie rozproszonego systemu IoT wykrywającego charakterystyczne dźwięki wycinki drzew i przesyłającego dane do centralnego serwera, gdzie są analizowane, filtrowane i wizualizowane w czasie rzeczywistym (heatmapy, alerty).

---

## Faza 1: Fundamenty i prototyp sprzętu
**Cel:** stworzenie fizycznego i logicznego prototypu czujnika.  

**Założenia i rezultaty:**
- Wybór mikrokontrolera (np. ESP32 lub STM32) i mikrofonu (MEMS/elektret).
- Opracowanie schematu zasilania (bateryjny + deep sleep).
- Złożenie pierwszego działającego prototypu czujnika.
- Test komunikacji lokalnej (USB/WiFi), wstępny odczyt próbek audio.
- Pierwsze testy skuteczności – czy czujnik wykrywa dźwięki piły w kontrolowanym środowisku.
- Opracowanie prostego kodu firmware do zapisu i przesyłu danych.

**Kierunek:** rozpoczęcie lokalnego przetwarzania sygnału (DSP), filtracja, thresholdy.

---

## Faza 2: Przetwarzanie danych lokalnie (DSP i detekcja zdarzeń)
**Cel:** nauczyć czujnik rozpoznawać potencjalne incydenty akustyczne.  

**Założenia i rezultaty:**
- Implementacja algorytmów DSP: filtracja, RMS, threshold dB.
- Buforowanie krótkich okien audio i detekcja wzorców (np. piła).
- Przesyłanie tylko zdarzeń (alertów) zamiast pełnych nagrań → oszczędność energii i transferu.
- Struktura danych: ID czujnika, timestamp, poziom głośności, confidence, koordynaty.
- Lokalny test detekcji i wysyłania alertów w trybie offline.

**Kierunek:** integracja z serwerem / bramką i rozpoczęcie przesyłania zdarzeń w sieci.

---

## Faza 3: Komunikacja i przesył danych (Gateway + HTTP/MQTT)
**Cel:** umożliwić transmisję alertów z czujników do backendu w czasie rzeczywistym.  

**Założenia i rezultaty:**
- Implementacja serwera HTTP lub MQTT na bramce (np. Raspberry Pi lub ESP32 acting as router).
- Obsługa wielu czujników jednocześnie.
- Wysyłanie komunikatów do Amazon SQS (kolejka komunikatów).
- Test łączności w warunkach zbliżonych do realnych (WiFi/LoRaWAN).
- Weryfikacja stabilności połączenia i minimalizacja utraty danych.

**Kierunek:** integracja chmurowa – backend + bazy danych + przetwarzanie alertów.

---

## Faza 4: Backend i infrastruktura chmurowa (AWS)
**Cel:** wdrożenie podstawowej architektury chmurowej obsługującej alerty.  

**Założenia i rezultaty:**
- Konfiguracja konta AWS (IAM Users, SQS, SNS, EC2, DynamoDB / PostgreSQL).
- Worker EC2 przetwarzający dane z SQS i zapisujący je w bazie.
- Implementacja triangulacji (np. ≥3 czujniki, 15-minutowe okna, dystans ≤1 km).
- Integracja z Amazon SNS – wysyłanie powiadomień (np. e-mail, webhook).
- Test przepływu danych: czujnik → gateway → AWS → baza danych → alert.

**Kierunek:** wizualizacja danych w interfejsie użytkownika.

---

## Faza 5: Wizualizacja i aplikacja webowa
**Cel:** przedstawienie danych z czujników w intuicyjny sposób.  

**Założenia i rezultaty:**
- Stworzenie aplikacji webowej z mapą (np. Leaflet / Mapbox).
- Wizualizacja lokalizacji czujników i heatmap aktywności.
- Historia alertów i filtrowanie po czasie / intensywności.
- Integracja z API AWS (EC2 lub Lambda).
- Interfejs w stylu panelu monitorującego (status czujników, poziom aktywności, ostatnie alerty).

**Kierunek:** testy integracyjne, analiza danych i raport końcowy.

---

## Faza 6: Testy integracyjne i ewaluacja systemu
**Cel:** potwierdzenie działania systemu jako spójnego prototypu.  

**Założenia i rezultaty:**
- Analiza dokładności detekcji i opóźnień.
- Ocena efektywności energetycznej i stabilności połączenia.
- Zbiorcza analiza i raport końcowy.
- Prezentacja MVP systemu: czujnik → chmura → mapa alertów.

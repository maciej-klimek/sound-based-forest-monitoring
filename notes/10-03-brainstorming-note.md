### Pomysły IoT

- **System kontroli ogrzewania w domu:**
  - Parametry:
    - prognoza pogody,
    - temperatura,
    - wilgotność,
    - zużycie prądu
  - Aplikacja (serwer może działać na Raspberry Pi), dane w skali roku – baza danych.
  - AI analizuje warunki i podpowiada, co robić.
  - Pytanie: czy chcemy własne czujniki (raczej nie)? Bardziej uniwersalny system dla smart home (dane zbierane z bazy przez Wi-Fi).

- **System lokalizacji pracowników po Wi-Fi w biurach** – małe urządzenie np. przy identyfikatorze.
  - Lokalizacja na podstawie Wi-Fi (triangulacja).
  - Przydatne np. w sytuacjach awaryjnych, podczas ewakuacji – system bezpieczeństwa może mieć te informacje.
  - Testowanie: kilka aplikacji, można użyć hostapd na laptopach.
  - Problem: urządzenie musi być małe.

- **System mierzenia zajętości pięter/pomieszczeń w biurach**
  - Podobny przypadek jak wyżej.

- **System kontroli kuchenki gazowej** – kamerka/czujnik gazu.
  - Use case: często trzeba sprawdzać, czy wszystko jest wyłączone.
  - Kamerki – alert, gdy coś jest nie tak: gaz włączony, woda cieknie, kuchenka włączona.

- **System sterowania warunkami w pomieszczeniach na podstawie czynności i miejsca.**

- **Badanie, czy dzieje się coś pacjentowi bez zewnętrznego sprzętu:**
  - Monitorowanie ruchu i oddechu bezkontaktowo.
  - Wykrycie upadku.

- **Kontrola nielegalnej wycinki drzew**
  - Urządzenie na drzewach wykrywające dźwięki maszyn i pił, największy selling point – tanie i wydajne energetycznie, np. w porównaniu do kamer.
  - Urządzenia wysyłają metryki i próbki do jakiegoś centralnego systemu – cel: heatmapa, wizualizacja, alerty.
  - Potencjalne wytrenowanie jakiegoś modelu AI – na podstawie sygnału dźwiękowego określało odległość, może analiza wysyłanych próbek w AWS.
  - Zakres projektu: prototyp czujnika + system zbierający dane.
  - Dodatkowy use case, oprócz wycinki lasów – monitorowanie w kontekście militarnym.

- **Zapobieganie zostawianiu kluczowych przedmiotów w domu:**
  - Klucze, telefon itp.

- **Inteligentny system zarządzania zapasami**
  - Redukcja marnowania żywności.
  - Monitorowanie dat ważności, automatyczne przypomnienia.

- Inteligentny system bezpieczeństwa do warsztatu:
  - Wentylacja, badanie powietrza (szkodliwe substancje).
  - Kamerka – AI, jakaś analiza.
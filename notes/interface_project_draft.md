![Podgląd systemu](mapa.png)

# Mapa + czujniki (widok główny)

## Warstwy
- **Punkty czujników** 
- **Heatmapa** – zagęszczenie zdarzeń w czasie rzeczywistym  
- **Triangulacja** – wizualizacja lokalizacji alertu na podstawie wielu czujników  

---

## Klik na czujnik → panel boczny
Wyświetlane dane:
- **ID / nazwa czujnika**
- **Bateria**
- **RSSI / SNR**
- *Mini-wykres SPL – poziom głośności (dB) z ostatnich 10–15 minut*  

---

# Alerty + priorytety

System nadaje **score** zdarzeniu na podstawie głośności i innych metryk, klasyfikując je jako:

| Priorytet | Próg | Opis |
|------------|------|------|
| 🔴 **High** | `score ≥ 0.7` | natychmiastowy alert, wysoka wiarygodność |
| 🟠 **Medium** | `0.5 ≤ score < 0.7` | zdarzenie potencjalne, wymaga weryfikacji |
| 🟡 **Low** | `score < 0.5` | gromadzone, bez notyfikacji |

**W interfejsie:**

- możliwość **filtrowania po priorytecie** i **szybkiego sortowania**

---

# Karta alertu (panel)

**Nagłówek:**  
- Priorytet  
- Klasa (np. *chainsaw*)  
- Confidence  
- Czas wystąpienia  

**Zawartość:**
- Lokalizacja: współrzędne + wynik triangulacji  
- Lista czujników, które wykryły zdarzenie  
- Akcje:
  - Potwierdź  
  - Fałszywy alarm  
  - Niejednoznaczne  

**Dodatkowo:**
- Historia zdarzeń w promieniu *X* metrów (ostatnie 7 dni)  

---

# „Snooze” alertu

**Akcja:**  
> „Uśpij na: 15 / 30 / 60 minut”

Podczas trwania **snooze**:
- brak powiadomień (push / SMS / e-mail) dla tego samego **klastra zdarzeń**  
- *klaster* = zdarzenia bliskie w czasie i przestrzeni  

Po wygaśnięciu:
- jeśli nadal wykrywane są podobne zdarzenia powyżej progu →  
  UI wystawia **Re-Arm alert**, zawierający:
  - link do ostatniego odsłuchu  
  - różnice w metrykach  

W karcie alertu:
- widoczna **oś czasu snooze / reaktywacji**

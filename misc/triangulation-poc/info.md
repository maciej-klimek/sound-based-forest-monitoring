> Tylko sobie eksperymentuje tutaj

### Odległośc mock sensorów:
- s1 <-> s2 = 40 m

- s1 <-> s3 = 75 m

- s1 <-> s4 = 35 m

- 1 <-> 5 = 35 m

score = promien w okół sensora (brany do sprawdzania overlapa)

# Notatka o cho na przyszłość:

## Czujniki i alerty

- Czujnik: `ID`, `lat`, `lon`  
  Przykład: `{id:1, lat:50.061, lon:19.937}`

- Alert: `ID`, `SensorID`, `timestamp`, `score`  
  Score -  do wyliczenia promienia okręgu wokół czujnika.  
  Przykład: `{id:1, sensor_id:1, timestamp:"2025-10-08T17:01:00Z", score:50}`

Promień = `score / 111000` (tak na oko, żeby mieć odległość w stopnniach)

---

## Triangulacja

1. Dla każdej pary czujników liczymy odległość.  
2. Patrzymy czy okręgi się stykają (`dist <= radiusA + radiusB`).  
3. Jeśli każdy w grupie pokrywa się z każdym innym, mamy klikę. Minimalna liczba w grupie: 3.  

Do wyszukiwania kliki używany algos **Bron–Kerbosch**, bo fajnie ogarnia wszystkie maksymalne grupy w grafie (graf: czujniki = wierzchołki, krawędzie = pokrycie).


4. Środek grupy (nasze "potencjalne źródło") = średnia lat i lon wszystkich czujników w grupie.

## Bron–Kerbosch (czacik enhanced c; ):

1. Masz trzy zestawy wierzchołków:

   * `R` – aktualna grupa w trakcie budowania
   * `P` – kandydaci do dodania do grupy
   * `X` – już przetestowane wierzchołki, których nie można dodawać

2. Rekurencyjnie:

   * Jeśli `P` i `X` puste → `R` to maksymalna klika → zapisujemy
   * W przeciwnym razie: dla każdego wierzchołka `v` w `P`:

     * Dodaj `v` do `R`
     * Nowi kandydaci (`newP`) = ci w `P`, którzy są połączeni z `v`
     * Nowe wykluczenia (`newX`) = ci w `X`, którzy są połączeni z `v`
     * Wywołaj funkcję rekurencyjnie dla `R+v`, `newP`, `newX`
     * Usuń `v` z `P` i dodaj do `X`

Efekt: znajdziesz wszystkie grupy, w których każdy czujnik pokrywa się z każdym innym – dokładnie to, czego chcemy do triangulacji.



// src/data/mock.js

// --- SPRZĘT (czujniki) – do mapy (okręgi + markery) ---
export const SENSORS = [
  // Kraków (okolice centrum) – przykładowe współrzędne
  { id: "CLW001", lat: 50.0614, lon: 19.9383, score: 92, radiusM: 600 },
  { id: "CLW002", lat: 50.0520, lon: 19.9450, score: 75, radiusM: 900 },
  { id: "CLW004", lat: 50.0705, lon: 19.9580, score: 61, radiusM: 700 },
];

// --- AKTYWNE ALERTY (panel po lewej + modal po kliknięciu) ---
// tone: "rose" | "amber" | "orange" | "neutral" (wpływa na pastelowe tło w kartach)
export const ACTIVE_ALERTS = [
  {
    id: "CLW001",               // ← Alert związany z czujnikiem CLW001
    sourceId: "CLW001",         // czujnik, który wygenerował alert
    isAlert: true,
    lat: 50.0614,
    lon: 19.9383,
    score: 92,
    severity: "high",
    tone: "rose",
    message: "Wysokie prawdopodobieństwo pracy piły łańcuchowej.",
    startedAt: "16:42 2025-10-16",
    // wrzuć plik do public/audio/
    audioUrl: "/audio/chainsaw.mp3",
  },
  {
    id: "CLW004",
    sourceId: "CLW004",
    isAlert: true,
    lat: 50.0705,
    lon: 19.9580,
    score: 61,
    severity: "medium",
    tone: "amber",
    message: "Wykryto sekwencję dźwięków o podwyższonym ryzyku.",
    startedAt: "17:10 2025-10-16",
    audioUrl: "/audio/sample_ambient.mp3",
  },
  {
    id: "CLW002",
    sourceId: "CLW002",
    isAlert: true,
    lat: 50.0520,
    lon: 19.9450,
    score: 75,
    severity: "medium",
    tone: "orange",
    message: "Potencjalny hałas maszynowy (ciągły, średnie natężenie).",
    startedAt: "17:22 2025-10-16",
    audioUrl: "/audio/sample_machine.mp3",
  },
  // punkt potencjalnego ŹRÓDŁA (trójkąt na mapie) – pojawi się jako „Źródła”
  {
    id: "A1",
    isAlert: true,
    lat: 50.0649,
    lon: 19.9480,
    score: 88,
    severity: "high",
    tone: "rose",
    message: "Potencjalne źródło dźwięku (lokalizacja triangulowana).",
    startedAt: "17:35 2025-10-16",
    audioUrl: "/audio/sample_chainsaw_near.mp3",
  },
];

// --- HISTORIA (zakończone alerty) – do strony „Historia” + modal ---
export const HISTORY = [
  {
    id: "CLW001",
    sourceId: "CLW001",
    lat: 50.0614,
    lon: 19.9383,
    score: 89,
    severity: "high",
    startedAt: "14:12 2025-10-15",
    endedAt: "14:33 2025-10-15",
    message: "Sekwencja zgodna z pracą pilarki (krótki epizod).",
    audioUrl: "/audio/chainsaw.mp3",
  },
  {
    id: "CLW004",
    sourceId: "CLW004",
    lat: 50.0705,
    lon: 19.9580,
    score: 64,
    severity: "medium",
    startedAt: "13:01 2025-10-14",
    endedAt: "13:28 2025-10-14",
    message: "Epizod hałasu – możliwy ruch drogowy lub agregat.",
    audioUrl: "/audio/sample_noise.mp3",
  },
  {
    id: "A1",
    lat: 50.0649,
    lon: 19.9480,
    score: 83,
    severity: "high",
    startedAt: "12:45 2025-10-13",
    endedAt: "13:05 2025-10-13",
    message: "Zamknięty incydent potencjalnego źródła – weryfikacja terenowa.",
    audioUrl: "/audio/sample_source_past.mp3",
  },
];

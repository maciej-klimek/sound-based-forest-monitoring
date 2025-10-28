// src/data/mock.js

// -------------------------
//  CZUJNIKI (sprzęt na mapie)
// -------------------------
export const SENSORS = [
  { id: "CLW001", lat: 50.0614, lon: 19.9383, score: 92, radiusM: 600 },
  { id: "CLW002", lat: 50.0520, lon: 19.9450, score: 75, radiusM: 900 },
  { id: "CLW003", lat: 50.0572, lon: 19.9640, score: 68, radiusM: 700 },
  { id: "CLW004", lat: 50.0705, lon: 19.9580, score: 61, radiusM: 700 },
  { id: "CLW005", lat: 50.0668, lon: 19.9302, score: 80, radiusM: 650 },
  { id: "CLW006", lat: 50.0487, lon: 19.9605, score: 55, radiusM: 600 },
  { id: "CLW007", lat: 50.0740, lon: 19.9481, score: 73, radiusM: 800 },
  { id: "CLW008", lat: 50.0626, lon: 19.9709, score: 64, radiusM: 650 },
];

// -------------------------
//  AKTYWNE ALERTY (panel + modal)
//  tone: 'rose' | 'amber' | 'orange' | 'neutral'
// -------------------------
export const ACTIVE_ALERTS = [
  {
    id: "CLW001",
    sourceId: "CLW001",
    isAlert: true,
    lat: 50.0614,
    lon: 19.9383,
    score: 92,
    severity: "high",
    tone: "rose",
    message: "Wysokie prawdopodobieństwo pracy piły łańcuchowej.",
    startedAt: "16:42 2025-10-16",
    audioUrl: "/audio/sample_chainsaw.mp3",
  },
  {
    id: "CLW002",
    sourceId: "CLW002",
    isAlert: true,
    lat: 50.0520,
    lon: 19.9450,
    score: 78,
    severity: "medium",
    tone: "orange",
    message: "Ciągły hałas maszynowy (średnie natężenie).",
    startedAt: "17:22 2025-10-16",
    audioUrl: "/audio/sample_machine.mp3",
  },
  {
    id: "CLW003",
    sourceId: "CLW003",
    isAlert: true,
    lat: 50.0572,
    lon: 19.9640,
    score: 69,
    severity: "medium",
    tone: "amber",
    message: "Przerywany hałas o cechach mechanicznych.",
    startedAt: "17:40 2025-10-16",
    audioUrl: "/audio/sample_ambient.mp3",
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
    message: "Sekwencja dźwięków o podwyższonym ryzyku.",
    startedAt: "17:10 2025-10-16",
    audioUrl: "/audio/sample_ambient.mp3",
  },
  {
    id: "CLW005",
    sourceId: "CLW005",
    isAlert: true,
    lat: 50.0668,
    lon: 19.9302,
    score: 81,
    severity: "high",
    tone: "orange",
    message: "Silny sygnał w paśmie 1500–3000 Hz.",
    startedAt: "17:55 2025-10-16",
    audioUrl: "/audio/sample_machine.mp3",
  },
  {
    id: "CLW006",
    sourceId: "CLW006",
    isAlert: true,
    lat: 50.0487,
    lon: 19.9605,
    score: 58,
    severity: "medium",
    tone: "neutral",
    message: "Hałas o niskiej pewności – możliwy ruch drogowy.",
    startedAt: "16:20 2025-10-16",
  },
  {
    id: "CLW007",
    sourceId: "CLW007",
    isAlert: true,
    lat: 50.0740,
    lon: 19.9481,
    score: 74,
    severity: "medium",
    tone: "orange",
    message: "Stała składowa mechaniczna (agregat?).",
    startedAt: "16:58 2025-10-16",
  },
  {
    id: "CLW008",
    sourceId: "CLW008",
    isAlert: true,
    lat: 50.0626,
    lon: 19.9709,
    score: 66,
    severity: "medium",
    tone: "amber",
    message: "Sygnał o średniej pewności, wymagany nadzór.",
    startedAt: "17:30 2025-10-16",
  },

  // „ŹRÓDŁA” – trójkąty na mapie (A1–A4)
  {
    id: "A1",
    isAlert: true,
    lat: 50.0649,
    lon: 19.9480,
    score: 88,
    severity: "high",
    tone: "rose",
    message: "Potencjalne źródło dźwięku (triangulacja czujników).",
    startedAt: "17:35 2025-10-16",
    audioUrl: "/audio/sample_chainsaw_near.mp3",
  },
  {
    id: "A2",
    isAlert: true,
    lat: 50.0588,
    lon: 19.9552,
    score: 72,
    severity: "medium",
    tone: "orange",
    message: "Możliwe drugie ognisko dźwięku.",
    startedAt: "17:45 2025-10-16",
  },
  {
    id: "A3",
    isAlert: true,
    lat: 50.0686,
    lon: 19.9429,
    score: 63,
    severity: "medium",
    tone: "amber",
    message: "Słabsza lokalizacja – wymagana weryfikacja.",
    startedAt: "17:48 2025-10-16",
  },
  {
    id: "A4",
    isAlert: true,
    lat: 50.0559,
    lon: 19.9687,
    score: 79,
    severity: "high",
    tone: "orange",
    message: "Silny sygnał źródła w pobliżu drogi leśnej.",
    startedAt: "17:52 2025-10-16",
  },

  // kilka dodatkowych „aktywnych”, żeby lista była dłuższa
  {
    id: "CLW009",
    sourceId: "CLW003",
    isAlert: true,
    lat: 50.0599,
    lon: 19.9731,
    score: 67,
    severity: "medium",
    tone: "amber",
    message: "Powyżej progu, analiza w toku.",
    startedAt: "18:01 2025-10-16",
  },
  {
    id: "CLW010",
    sourceId: "CLW002",
    isAlert: true,
    lat: 50.0513,
    lon: 19.9528,
    score: 71,
    severity: "medium",
    tone: "orange",
    message: "Sygnał skorelowany z poprzednim alertem.",
    startedAt: "18:05 2025-10-16",
  },
  {
    id: "CLW011",
    sourceId: "CLW007",
    isAlert: true,
    lat: 50.0751,
    lon: 19.9560,
    score: 62,
    severity: "medium",
    tone: "amber",
    message: "Krótki epizod – możliwy false-positive.",
    startedAt: "18:08 2025-10-16",
  },
];

// -------------------------
//  HISTORIA (zakończone alerty) – lista długa do testów
// -------------------------
export const HISTORY = [
  // dzień 2025-10-15
  { id: "CLW001", sourceId: "CLW001", lat: 50.0614, lon: 19.9383, score: 89, severity: "high",   startedAt: "14:12 2025-10-15", endedAt: "14:33 2025-10-15", message: "Sekwencja zgodna z pracą pilarki.", audioUrl: "/audio/sample_chainsaw_short.mp3" },
  { id: "CLW004", sourceId: "CLW004", lat: 50.0705, lon: 19.9580, score: 64, severity: "medium", startedAt: "13:01 2025-10-15", endedAt: "13:28 2025-10-15", message: "Możliwy agregat prądotwórczy.", audioUrl: "/audio/sample_noise.mp3" },
  { id: "A1",     lat: 50.0649, lon: 19.9480, score: 83, severity: "high",   startedAt: "12:45 2025-10-15", endedAt: "13:05 2025-10-15", message: "Zamknięty incydent potencjalnego źródła." },

  // dzień 2025-10-14
  { id: "CLW002", sourceId: "CLW002", lat: 50.0520, lon: 19.9450, score: 76, severity: "medium", startedAt: "15:22 2025-10-14", endedAt: "15:40 2025-10-14", message: "Ciągły hałas mechaniczny." },
  { id: "CLW003", sourceId: "CLW003", lat: 50.0572, lon: 19.9640, score: 68, severity: "medium", startedAt: "16:05 2025-10-14", endedAt: "16:18 2025-10-14", message: "Krótki epizod w pobliżu zabudowań." },
  { id: "CLW005", sourceId: "CLW005", lat: 50.0668, lon: 19.9302, score: 82, severity: "high",   startedAt: "17:11 2025-10-14", endedAt: "17:22 2025-10-14", message: "Silna aktywność w paśmie 2 kHz." },

  // dzień 2025-10-13
  { id: "CLW006", sourceId: "CLW006", lat: 50.0487, lon: 19.9605, score: 52, severity: "medium", startedAt: "11:05 2025-10-13", endedAt: "11:15 2025-10-13", message: "Niski poziom – prawd. ruch drogowy." },
  { id: "CLW007", sourceId: "CLW007", lat: 50.0740, lon: 19.9481, score: 71, severity: "medium", startedAt: "12:01 2025-10-13", endedAt: "12:29 2025-10-13", message: "Agregat lub inna maszyna stacjonarna." },
  { id: "CLW008", sourceId: "CLW008", lat: 50.0626, lon: 19.9709, score: 63, severity: "medium", startedAt: "13:44 2025-10-13", endedAt: "13:58 2025-10-13", message: "Krótki sygnał o średniej pewności." },
  { id: "A2",     lat: 50.0588, lon: 19.9552, score: 69, severity: "medium", startedAt: "14:10 2025-10-13", endedAt: "14:20 2025-10-13", message: "Wstępna lokalizacja źródła – słabsza." },

  // więcej losowych wpisów do przewijania (2025-10-12 … 2025-10-03)
  { id: "CLW009", sourceId: "CLW003", lat: 50.0599, lon: 19.9731, score: 66, severity: "medium", startedAt: "10:12 2025-10-12", endedAt: "10:20 2025-10-12", message: "Powyżej progu, obserwacja." },
  { id: "CLW010", sourceId: "CLW002", lat: 50.0513, lon: 19.9528, score: 70, severity: "medium", startedAt: "11:05 2025-10-12", endedAt: "11:19 2025-10-12", message: "Sygnał podobny do poprzedniego." },
  { id: "CLW011", sourceId: "CLW007", lat: 50.0751, lon: 19.9560, score: 61, severity: "medium", startedAt: "12:42 2025-10-12", endedAt: "12:50 2025-10-12", message: "Krótki epizod." },
  { id: "A3",     lat: 50.0686, lon: 19.9429, score: 62, severity: "medium", startedAt: "13:17 2025-10-12", endedAt: "13:22 2025-10-12", message: "Lokalizacja o niskiej dokładności." },

  { id: "CLW012", sourceId: "CLW008", lat: 50.0641, lon: 19.9755, score: 65, severity: "medium", startedAt: "09:15 2025-10-11", endedAt: "09:33 2025-10-11" },
  { id: "CLW013", sourceId: "CLW004", lat: 50.0680, lon: 19.9622, score: 59, severity: "medium", startedAt: "10:44 2025-10-11", endedAt: "10:52 2025-10-11" },
  { id: "CLW014", sourceId: "CLW001", lat: 50.0602, lon: 19.9400, score: 77, severity: "medium", startedAt: "11:26 2025-10-11", endedAt: "11:40 2025-10-11" },
  { id: "A4",     lat: 50.0559, lon: 19.9687, score: 74, severity: "high",   startedAt: "12:03 2025-10-11", endedAt: "12:19 2025-10-11" },

  { id: "CLW015", sourceId: "CLW006", lat: 50.0502, lon: 19.9587, score: 56, severity: "medium", startedAt: "15:12 2025-10-10", endedAt: "15:27 2025-10-10" },
  { id: "CLW016", sourceId: "CLW005", lat: 50.0685, lon: 19.9355, score: 83, severity: "high",   startedAt: "16:41 2025-10-10", endedAt: "16:56 2025-10-10" },
  { id: "CLW017", sourceId: "CLW003", lat: 50.0581, lon: 19.9710, score: 62, severity: "medium", startedAt: "17:09 2025-10-10", endedAt: "17:20 2025-10-10" },

  { id: "CLW018", sourceId: "CLW007", lat: 50.0732, lon: 19.9521, score: 72, severity: "medium", startedAt: "09:31 2025-10-09", endedAt: "09:45 2025-10-09" },
  { id: "CLW019", sourceId: "CLW002", lat: 50.0531, lon: 19.9491, score: 69, severity: "medium", startedAt: "10:18 2025-10-09", endedAt: "10:25 2025-10-09" },
  { id: "CLW020", sourceId: "CLW004", lat: 50.0712, lon: 19.9601, score: 60, severity: "medium", startedAt: "11:07 2025-10-09", endedAt: "11:19 2025-10-09" },

  { id: "CLW021", sourceId: "CLW006", lat: 50.0479, lon: 19.9629, score: 54, severity: "medium", startedAt: "14:11 2025-10-08", endedAt: "14:18 2025-10-08" },
  { id: "CLW022", sourceId: "CLW008", lat: 50.0654, lon: 19.9722, score: 66, severity: "medium", startedAt: "15:25 2025-10-08", endedAt: "15:38 2025-10-08" },
  { id: "CLW023", sourceId: "CLW001", lat: 50.0622, lon: 19.9391, score: 79, severity: "high",   startedAt: "16:40 2025-10-08", endedAt: "16:55 2025-10-08" },

  { id: "CLW024", sourceId: "CLW003", lat: 50.0569, lon: 19.9698, score: 63, severity: "medium", startedAt: "12:03 2025-10-07", endedAt: "12:14 2025-10-07" },
  { id: "CLW025", sourceId: "CLW005", lat: 50.0677, lon: 19.9332, score: 78, severity: "medium", startedAt: "13:36 2025-10-07", endedAt: "13:49 2025-10-07" },
  { id: "CLW026", sourceId: "CLW004", lat: 50.0698, lon: 19.9613, score: 61, severity: "medium", startedAt: "14:55 2025-10-07", endedAt: "15:08 2025-10-07" },

  { id: "CLW027", sourceId: "CLW007", lat: 50.0760, lon: 19.9493, score: 70, severity: "medium", startedAt: "10:10 2025-10-06", endedAt: "10:24 2025-10-06" },
  { id: "CLW028", sourceId: "CLW002", lat: 50.0509, lon: 19.9479, score: 73, severity: "medium", startedAt: "11:43 2025-10-06", endedAt: "11:57 2025-10-06" },

  { id: "CLW029", sourceId: "CLW008", lat: 50.0637, lon: 19.9741, score: 64, severity: "medium", startedAt: "15:19 2025-10-05", endedAt: "15:31 2025-10-05" },
  { id: "CLW030", sourceId: "CLW006", lat: 50.0499, lon: 19.9617, score: 57, severity: "medium", startedAt: "16:44 2025-10-05", endedAt: "16:53 2025-10-05" },
  { id: "CLW031", sourceId: "CLW001", lat: 50.0608, lon: 19.9412, score: 82, severity: "high",   startedAt: "17:08 2025-10-05", endedAt: "17:19 2025-10-05" },

  { id: "CLW032", sourceId: "CLW004", lat: 50.0720, lon: 19.9597, score: 62, severity: "medium", startedAt: "09:22 2025-10-04", endedAt: "09:36 2025-10-04" },
  { id: "CLW033", sourceId: "CLW003", lat: 50.0588, lon: 19.9703, score: 67, severity: "medium", startedAt: "10:41 2025-10-04", endedAt: "10:55 2025-10-04" },
  { id: "CLW034", sourceId: "CLW005", lat: 50.0670, lon: 19.9364, score: 79, severity: "high",   startedAt: "11:59 2025-10-04", endedAt: "12:18 2025-10-04" },

  { id: "CLW035", sourceId: "CLW007", lat: 50.0748, lon: 19.9516, score: 71, severity: "medium", startedAt: "12:33 2025-10-03", endedAt: "12:48 2025-10-03" },
  { id: "CLW036", sourceId: "CLW002", lat: 50.0527, lon: 19.9466, score: 69, severity: "medium", startedAt: "13:25 2025-10-03", endedAt: "13:40 2025-10-03" },
  { id: "CLW037", sourceId: "CLW006", lat: 50.0473, lon: 19.9638, score: 55, severity: "medium", startedAt: "14:18 2025-10-03", endedAt: "14:26 2025-10-03" },
];

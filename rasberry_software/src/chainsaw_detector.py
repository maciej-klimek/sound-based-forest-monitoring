import numpy as np
import librosa
import cv2
import tensorflow as tf
import os
import glob

# --- KONFIGURACJA ---
MODEL_PATH = 'chainsaw_model.tflite' 

# Ścieżka do folderu z plikami testowymi
# Używam os.path.join dla kompatybilności Windows/Linux
TEST_DIR = os.path.join("..", "tests", "test_file")

# Parametry audio (muszą być takie same jak przy treningu!)
SAMPLE_RATE = 22050
DURATION = 3
SAMPLES_PER_TRACK = SAMPLE_RATE * DURATION
IMG_SIZE = (128, 128)

def preprocess_audio(file_path):
    """
    Wczytuje audio i formatuje je do wejścia modelu.
    Automatycznie przycina lub wydłuża nagranie do 3 sekund.
    """
    try:
        # 1. Wczytanie audio (Librosa sama resampluje do 22050Hz)
        y, sr = librosa.load(file_path, sr=SAMPLE_RATE, duration=None) # duration=None żeby wczytać całość
        
        # 2. STANDARYZACJA DŁUGOŚCI (Kluczowy moment dla plików różnej długości)
        if len(y) < SAMPLES_PER_TRACK:
            # Za krótkie? Dopełnij zerami (ciszą)
            y = librosa.util.fix_length(y, size=int(SAMPLES_PER_TRACK))
        else:
            # Za długie? Utnij do pierwszych 3 sekund
            y = y[:int(SAMPLES_PER_TRACK)]
            
        # 3. Mel-spektrogram
        mels = librosa.feature.melspectrogram(y=y, sr=sr, n_mels=IMG_SIZE[0], fmax=8000)
        mels_db = librosa.power_to_db(mels, ref=np.max)
        
        # 4. Resize do 128x128
        img = cv2.resize(mels_db, (IMG_SIZE[1], IMG_SIZE[0]))
        
        # 5. Normalizacja (0-1)
        img = (img + 80) / 80.0
        img = np.clip(img, 0, 1)
        
        # 6. Dodanie kanałów RGB (1 -> 3)
        img = np.stack((img,)*3, axis=-1)
        
        # 7. Dodanie wymiaru Batch
        img = np.expand_dims(img, axis=0)
        
        # 8. Konwersja na float32
        img = img.astype(np.float32)
        
        return img
    except Exception as e:
        print(f" [BŁĄD] Nie udało się przetworzyć pliku {os.path.basename(file_path)}: {e}")
        return None

def run_inference(interpreter, input_details, output_details, audio_path):
    """Uruchamia predykcję dla jednego pliku."""
    
    # Przygotowanie danych
    input_data = preprocess_audio(audio_path)
    if input_data is None:
        return

    # Wrzucenie danych do modelu
    interpreter.set_tensor(input_details[0]['index'], input_data)

    # Obliczenia
    interpreter.invoke()

    # Odczyt wyniku
    output_data = interpreter.get_tensor(output_details[0]['index'])
    prediction_score = output_data[0][0] # Prawdopodobieństwo 0.0 - 1.0
    
    return prediction_score

# --- URUCHOMIENIE ---
if __name__ == "__main__":
    
    # 1. Sprawdzenie czy model istnieje
    if not os.path.exists(MODEL_PATH):
        print(f"BŁĄD: Nie znaleziono modelu '{MODEL_PATH}'")
        exit()

    # 2. Sprawdzenie czy folder testowy istnieje
    if not os.path.exists(TEST_DIR):
        print(f"BŁĄD: Nie znaleziono folderu '{TEST_DIR}'")
        # Fallback - szukaj w bieżącym katalogu, jeśli ścieżka jest zła
        TEST_DIR = "." 
        print("Szukam plików .wav w bieżącym katalogu...")

    # 3. Ładowanie modelu (tylko raz dla wydajności)
    print("Ładowanie modelu TFLite...")
    interpreter = tf.lite.Interpreter(model_path=MODEL_PATH)
    interpreter.allocate_tensors()
    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()

    # 4. Pobranie listy plików WAV
    # Szukamy plików .wav w folderze (rekurencyjnie lub tylko w głównym)
    # Szukamy plików z różnymi rozszerzeniami
    extensions = ['*.wav', '*.mp3', '*.WAV', '*.MP3'] # Dodajemy też duże litery dla pewności
    files = []
    
    for ext in extensions:
        # Dodajemy znalezione pliki do głównej listy
        files.extend(glob.glob(os.path.join(TEST_DIR, ext)))
    
    # Sortujemy, żeby wyniki były po kolei (opcjonalne, ale ładniej wygląda)
    files.sort()
    
    if not files:
        print(f"Nie znaleziono żadnych plików audio (.wav, .mp3) w folderze: {TEST_DIR}")
        exit()

    print(f"\nZnaleziono {len(files)} plików do analizy.\n")
    print(f"{'NAZWA PLIKU':<50} | {'WYNIK':<10} | {'DECYZJA'}")
    print("-" * 85)

    # 5. Pętla po plikach
    detections = 0
    
    for file_path in files:
        filename = os.path.basename(file_path)
        
        score = run_inference(interpreter, input_details, output_details, file_path)
        
        if score is not None:
            percentage = score * 100
            
            if score > 0.5:
                decision = "🚨 PIŁA"
                detections += 1
                color_code = "\033[91m" # Czerwony w terminalu (Linux/Mac/GitBash)
            else:
                decision = "✅ TŁO"
                color_code = "\033[92m" # Zielony
            
            reset_code = "\033[0m"
            
            # Wypisanie sformatowanego wyniku
            print(f"{filename:<50} | {percentage:6.2f}%   | {color_code}{decision}{reset_code}")

    print("-" * 85)
    print(f"Podsumowanie: Wykryto piłę w {detections} na {len(files)} plików.")
import sounddevice as sd
import numpy as np
import wavio


audio_chunks = []
def audio_callback(indata, frames, time, status):
    if status:
        print("Stream error:", status)
    audio_chunks.append(indata.copy())
    print("Dostałem", frames, "próbek")

SAMPLE_RATE=48000
CHANNELS=2
DTYPE="SE32_LE"
with sd.InputStream(
        samplerate=SAMPLE_RATE,
        channels=CHANNELS,
        dtype=DTYPE,
        callback=audio_callback,
        device='mic_sv'):
    print("Recording.. Prest Ctrl+C to interrupt.")
    sd.sleep(10000)


audio_data = np.concatenate(audio_chunks, axis=0)

print("Zapisuję do pliku...")

wavio.write("test.wav", audio_data, SAMPLE_RATE, sampwidth=4)

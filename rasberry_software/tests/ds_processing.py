import librosa 
from scipy.signal import butter,sosfilt
import matplotlib.pyplot  as plt
import numpy as np
import soundfile as sf
data , sr = librosa.load('pila.wav')

def bandpass_filter(data, lowcut, highcut, fs, order=4):
    sos = butter(order, [lowcut, highcut], btype='band', fs=fs, output='sos')
    filtered = sosfilt(sos, data)
    return filtered

data_f = bandpass_filter(data, 500, 8000, sr)

print(data)
print(data_f)
fig, axs = plt.subplots(2,2)
 
axs[0][0].plot(data)
axs[0][1].plot(data_f)
sf.write("tmp.wav", data_f, sr)
data_fft = np.fft.fft(data)               # FFT
freqs = np.fft.fftfreq(len(data), 1/sr)

axs[1][0].plot(freqs[:len(freqs)//2], np.abs(data_fft)[:len(data_fft)//2])

data_fft = np.fft.fft(data_f)               # FFT
freqs = np.fft.fftfreq(len(data_f), 1/sr)

axs[1][1].plot(freqs[:len(freqs)//2], np.abs(data_fft)[:len(data_fft)//2])
plt.show()


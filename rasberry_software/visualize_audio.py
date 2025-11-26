"""
Audio Analysis Visualization Tool
Analyzes audio file and displays visualizations.
Based on your colleague's script.

Usage:
    python visualize_audio.py <audio_file.wav>
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

import librosa
from scipy.signal import butter, sosfilt
import matplotlib.pyplot as plt
import numpy as np
import soundfile as sf
from audio_processor import analyze_audio, is_chainsaw_detected


def bandpass_filter(data, lowcut, highcut, fs, order=4):
    """Apply bandpass filter."""
    sos = butter(order, [lowcut, highcut], btype='band', fs=fs, output='sos')
    filtered = sosfilt(sos, data)
    return filtered


def visualize_audio(audio_path):
    """
    Analyze and visualize audio file.
    
    :param audio_path: Path to audio file
    """
    print(f"Analyzing: {audio_path}")
    
    # Load audio
    data, sr = librosa.load(audio_path)
    print(f"Sample rate: {sr} Hz")
    print(f"Duration: {len(data)/sr:.2f} seconds")
    print(f"Samples: {len(data)}")
    
    # Apply filter
    data_f = bandpass_filter(data, 500, 8000, sr)
    
    # Save filtered audio
    sf.write("tmp.wav", data_f, sr)
    print("Filtered audio saved to: tmp.wav")
    
    # FFT analysis
    data_fft = np.fft.fft(data)
    freqs = np.fft.fftfreq(len(data), 1/sr)
    
    data_fft_f = np.fft.fft(data_f)
    freqs_f = np.fft.fftfreq(len(data_f), 1/sr)
    
    # Use our analyzer
    analysis = analyze_audio(audio_path)
    is_chainsaw = is_chainsaw_detected(analysis)
    
    print("\n" + "="*50)
    print("ANALYSIS RESULTS:")
    print("="*50)
    print(f"Peak frequency: {analysis['peak_frequency']:.2f} Hz")
    print(f"Peak amplitude: {analysis['peak_amplitude']:.2f}")
    print(f"Average energy: {analysis['average_energy']:.2f}")
    print(f"Chainsaw detected: {'YES ⚠️' if is_chainsaw else 'NO'}")
    print("="*50)
    
    # Plot
    fig, axs = plt.subplots(2, 2, figsize=(12, 8))
    fig.suptitle(f'Audio Analysis: {os.path.basename(audio_path)}')
    
    # Original waveform
    axs[0][0].plot(data)
    axs[0][0].set_title('Original Waveform')
    axs[0][0].set_xlabel('Sample')
    axs[0][0].set_ylabel('Amplitude')
    
    # Filtered waveform
    axs[0][1].plot(data_f)
    axs[0][1].set_title('Filtered Waveform (500-8000 Hz)')
    axs[0][1].set_xlabel('Sample')
    axs[0][1].set_ylabel('Amplitude')
    
    # Original FFT
    axs[1][0].plot(freqs[:len(freqs)//2], np.abs(data_fft)[:len(data_fft)//2])
    axs[1][0].set_title('Original FFT')
    axs[1][0].set_xlabel('Frequency (Hz)')
    axs[1][0].set_ylabel('Magnitude')
    
    # Filtered FFT
    axs[1][1].plot(freqs_f[:len(freqs_f)//2], np.abs(data_fft_f)[:len(data_fft_f)//2])
    axs[1][1].set_title('Filtered FFT')
    axs[1][1].set_xlabel('Frequency (Hz)')
    axs[1][1].set_ylabel('Magnitude')
    
    plt.tight_layout()
    plt.show()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python visualize_audio.py <audio_file.wav>")
        print("\nExample:")
        print("  python visualize_audio.py tests/test_file/sample.wav")
        sys.exit(1)
    
    audio_file = sys.argv[1]
    
    if not os.path.exists(audio_file):
        print(f"Error: File not found: {audio_file}")
        sys.exit(1)
    
    visualize_audio(audio_file)

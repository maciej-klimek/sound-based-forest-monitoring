"""
Audio processing module for sound analysis and filtering.
Detects chainsaw sounds using bandpass filtering and FFT analysis.
"""

import librosa
import numpy as np
from scipy.signal import butter, sosfilt
import soundfile as sf


def bandpass_filter(data, lowcut, highcut, fs, order=4):
    """
    Apply bandpass filter to audio data.
    
    :param data: Audio data array
    :param lowcut: Lower frequency cutoff (Hz)
    :param highcut: Higher frequency cutoff (Hz)
    :param fs: Sample rate
    :param order: Filter order
    :return: Filtered audio data
    """
    sos = butter(order, [lowcut, highcut], btype='band', fs=fs, output='sos')
    filtered = sosfilt(sos, data)
    return filtered


def analyze_audio(audio_path, lowcut=500, highcut=8000):
    """
    Analyze audio file for potential chainsaw sounds.
    
    :param audio_path: Path to audio file
    :param lowcut: Lower frequency cutoff for bandpass filter
    :param highcut: Higher frequency cutoff for bandpass filter
    :return: Dictionary with analysis results
    """
    # Load audio file
    data, sr = librosa.load(audio_path)
    
    # Apply bandpass filter (chainsaw frequencies typically 500-8000 Hz)
    data_filtered = bandpass_filter(data, lowcut, highcut, sr)
    
    # FFT analysis
    data_fft = np.fft.fft(data_filtered)
    freqs = np.fft.fftfreq(len(data_filtered), 1/sr)
    
    # Calculate signal strength in the filtered band
    positive_freqs = freqs[:len(freqs)//2]
    positive_fft = np.abs(data_fft)[:len(data_fft)//2]
    
    # Find peak frequency and amplitude
    peak_idx = np.argmax(positive_fft)
    peak_freq = positive_freqs[peak_idx]
    peak_amplitude = positive_fft[peak_idx]
    
    # Calculate average energy in the band
    avg_energy = np.mean(positive_fft)
    
    return {
        'sample_rate': sr,
        'duration': len(data) / sr,
        'peak_frequency': peak_freq,
        'peak_amplitude': peak_amplitude,
        'average_energy': avg_energy,
        'filtered_data': data_filtered
    }


def is_chainsaw_detected(analysis_result, threshold=1000):
    """
    Determine if audio contains chainsaw sound based on analysis.
    
    :param analysis_result: Result from analyze_audio()
    :param threshold: Energy threshold for detection
    :return: Boolean indicating chainsaw detection
    """
    # Simple threshold-based detection
    # Can be improved with machine learning model
    return analysis_result['average_energy'] > threshold


def save_filtered_audio(filtered_data, sample_rate, output_path):
    """
    Save filtered audio to file.
    
    :param filtered_data: Filtered audio array
    :param sample_rate: Sample rate
    :param output_path: Output file path
    """
    sf.write(output_path, filtered_data, sample_rate)
    print(f"Filtered audio saved to: {output_path}")

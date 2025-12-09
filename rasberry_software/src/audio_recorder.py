"""
Audio recording module for capturing sound from microphone.
Supports both real hardware and mock mode for testing.
"""

import sounddevice as sd
import numpy as np
import wavio
import os
from datetime import datetime


class AudioRecorder:
    """Audio recorder with support for hardware and mock modes."""
    
    def __init__(self, sample_rate=48000, channels=2, dtype='int32', device=None):
        """
        Initialize audio recorder.
        
        :param sample_rate: Sample rate in Hz
        :param channels: Number of audio channels
        :param dtype: Data type for audio samples
        :param device: Audio device name (None for default)
        """
        self.sample_rate = sample_rate
        self.channels = channels
        self.dtype = dtype
        self.device = device
        self.audio_chunks = []
        
    def audio_callback(self, indata, frames, time, status):
        """Callback function for audio stream."""
        if status:
            print(f"Stream error: {status}")
        self.audio_chunks.append(indata.copy())
        print(f"Captured {frames} samples")
    
    def record(self, duration_seconds=10):
        """
        Record audio for specified duration.
        
        :param duration_seconds: Recording duration in seconds
        :return: Recorded audio data
        """
        print(f"Recording for {duration_seconds} seconds...")
        self.audio_chunks = []
        
        try:
            with sd.InputStream(
                samplerate=self.sample_rate,
                channels=self.channels,
                dtype=self.dtype,
                callback=self.audio_callback,
                device=self.device,
                latency='high'
            ):
                print("Recording... Press Ctrl+C to stop early.")
                sd.sleep(duration_seconds * 1000)
        except KeyboardInterrupt:
            print("\nRecording interrupted by user.")
        
        if not self.audio_chunks:
            print("No audio data captured!")
            return None
        
        # Concatenate all chunks
        audio_data = np.concatenate(self.audio_chunks, axis=0)
        print(f"Recording complete. Captured {len(audio_data)} samples.")
        return audio_data
    
    def save_recording(self, audio_data, output_path, sampwidth=4):
        """
        Save recorded audio to WAV file.
        
        :param audio_data: Audio data array
        :param output_path: Output file path
        :param sampwidth: Sample width in bytes
        """
        if audio_data is None:
            print("No audio data to save!")
            return False
        
        try:
            wavio.write(output_path, audio_data, self.sample_rate, sampwidth=sampwidth)
            print(f"Audio saved to: {output_path}")
            return True
        except Exception as e:
            print(f"Error saving audio: {e}")
            return False
    
    def record_and_save(self, duration_seconds=10, output_dir="recordings"):
        """
        Record audio and save to file with timestamp.
        
        :param duration_seconds: Recording duration
        :param output_dir: Output directory for recordings
        :return: Path to saved file, or None if failed
        """
        # Create output directory if it doesn't exist
        os.makedirs(output_dir, exist_ok=True)
        
        # Generate filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"recording_{timestamp}.wav"
        output_path = os.path.join(output_dir, filename)
        
        # Record audio
        audio_data = self.record(duration_seconds)
        
        # Save to file
        if audio_data is not None and self.save_recording(audio_data, output_path):
            return output_path
        return None


class MockAudioRecorder(AudioRecorder):
    """Mock audio recorder for testing without hardware."""
    
    def __init__(self, sample_rate=48000, channels=2):
        """Initialize mock recorder."""
        super().__init__(sample_rate, channels, dtype='int32', device=None)
        self.mock_audio_file = None
    
    def set_mock_audio(self, audio_file_path):
        """
        Set path to audio file to use as mock recording.
        
        :param audio_file_path: Path to existing audio file
        """
        self.mock_audio_file = audio_file_path
        print(f"Mock mode: Will use '{audio_file_path}' as recording")
    
    def record(self, duration_seconds=10):
        """
        Mock recording - copies existing audio file.
        
        :param duration_seconds: Ignored in mock mode
        :return: Mock audio data
        """
        if self.mock_audio_file is None:
            print("Mock mode error: No mock audio file set!")
            return None
        
        print(f"MOCK MODE: Simulating {duration_seconds}s recording...")
        print(f"Loading audio from: {self.mock_audio_file}")
        
        try:
            # Load the mock audio file
            import wavio
            wav = wavio.read(self.mock_audio_file)
            print(f"Mock recording complete. Loaded {len(wav.data)} samples.")
            return wav.data
        except Exception as e:
            print(f"Error loading mock audio: {e}")
            return None

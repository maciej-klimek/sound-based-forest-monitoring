"""
Main monitoring system for forest sound detection.
Integrates sound sensor, audio recording, processing, and AWS communication.
"""

import os
import sys
import json
import time
from datetime import datetime

# Add src directory to path for imports
sys.path.insert(0, os.path.dirname(__file__))

from sound_sensor import SoundSensor, MockSoundSensor
from audio_recorder import AudioRecorder, MockAudioRecorder
from audio_processor import analyze_audio, is_chainsaw_detected
from aws_comunicator import register_device, send_alert

# ML Chainsaw Detector
try:
    import tensorflow as tf
    from chainsaw_detector import preprocess_audio, run_inference
    ML_DETECTOR_AVAILABLE = True
except ImportError as e:
    print(f"Warning: ML detector not available ({e}). Using DSP-only detection.")
    ML_DETECTOR_AVAILABLE = False


class ForestMonitoringSystem:
    """Complete forest monitoring system."""
    
    def __init__(self, config_path="config.json", mock_mode=False):
        """
        Initialize monitoring system.
        
        :param config_path: Path to configuration file
        :param mock_mode: If True, use mock mode for testing
        """
        self.mock_mode = mock_mode
        self.config = self._load_config(config_path)
        
        # Initialize device identity
        self.device_id = None
        self.device_secret = None
        self._load_or_register_device()
        
        # Initialize ML model if available
        self.ml_interpreter = None
        self.ml_input_details = None
        self.ml_output_details = None
        if ML_DETECTOR_AVAILABLE:
            self._load_ml_model()
        
        # Initialize components
        if mock_mode:
            print("\n" + "="*60)
            print("RUNNING IN MOCK MODE - No hardware required")
            print("="*60 + "\n")
            self.sound_sensor = MockSoundSensor(self.config['sensor_pin'])
            self.audio_recorder = MockAudioRecorder(
                sample_rate=self.config['sample_rate'],
                channels=self.config['channels']
            )
        else:
            self.sound_sensor = SoundSensor(self.config['sensor_pin'])
            self.audio_recorder = AudioRecorder(
                sample_rate=self.config['sample_rate'],
                channels=self.config['channels'],
                device=self.config.get('audio_device')
            )
        
        # Create recordings directory
        os.makedirs(self.config['recordings_dir'], exist_ok=True)
    
    def _load_config(self, config_path):
        """Load configuration from file or use defaults."""
        default_config = {
            'latitude': 52.2297,
            'longitude': 21.0122,
            'sensor_pin': 17,
            'sample_rate': 48000,
            'channels': 2,
            'recording_duration': 10,
            'recordings_dir': 'recordings',
            'audio_device': None,
            'chainsaw_threshold': 1000,
            'bandpass_low': 500,
            'bandpass_high': 8000
        }
        
        if os.path.exists(config_path):
            try:
                with open(config_path, 'r') as f:
                    loaded_config = json.load(f)
                    default_config.update(loaded_config)
                    print(f"Configuration loaded from {config_path}")
            except Exception as e:
                print(f"Error loading config: {e}. Using defaults.")
        else:
            print("No config file found. Using default configuration.")
        
        return default_config
    
    def _load_or_register_device(self):
        """Load device identity or register new device."""
        identity_file = "device_identity.json"
        
        if os.path.exists(identity_file):
            try:
                with open(identity_file, 'r') as f:
                    identity = json.load(f)
                    self.device_id = identity.get('deviceId')
                    self.device_secret = identity.get('deviceSecret')
                    print(f"Loaded device ID: {self.device_id}")
                    return
            except Exception as e:
                print(f"Error loading device identity: {e}")
        
        # Register new device
        print("No device identity found. Registering new device...")
        self.device_id, self.device_secret = register_device(
            self.config['latitude'],
            self.config['longitude']
        )
        
        if not self.device_id:
            print("ERROR: Failed to register device!")
            sys.exit(1)
    
    def _load_ml_model(self):
        """Load TensorFlow Lite ML model for chainsaw detection."""
        model_path = self.config.get('ml_model_path', 'chainsaw_model.tflite')
        
        if not os.path.exists(model_path):
            print(f"Warning: ML model not found at '{model_path}'. Using DSP-only detection.")
            return
        
        try:
            print(f"Loading ML chainsaw detector model: {model_path}")
            self.ml_interpreter = tf.lite.Interpreter(model_path=model_path)
            self.ml_interpreter.allocate_tensors()
            self.ml_input_details = self.ml_interpreter.get_input_details()
            self.ml_output_details = self.ml_interpreter.get_output_details()
            print("ML model loaded successfully")
        except Exception as e:
            print(f"Warning: Failed to load ML model: {e}")
            self.ml_interpreter = None
    
    def process_sound_event(self):
        """Process a detected sound event."""
        print("\n" + "="*60)
        print(f"SOUND EVENT DETECTED - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("="*60)
        
        # Record audio
        print("\n[1/4] Recording audio...")
        audio_path = self.audio_recorder.record_and_save(
            duration_seconds=self.config['recording_duration'],
            output_dir=self.config['recordings_dir']
        )
        
        if not audio_path:
            print("ERROR: Failed to record audio!")
            return
        
        # Analyze audio
        print("\n[2/4] Analyzing audio...")
        try:
            analysis = analyze_audio(
                audio_path,
                lowcut=self.config['bandpass_low'],
                highcut=self.config['bandpass_high']
            )
            
            print(f"  Duration: {analysis['duration']:.2f}s")
            print(f"  Peak frequency: {analysis['peak_frequency']:.2f} Hz")
            print(f"  Average energy: {analysis['average_energy']:.2f}")
            
            # Check if it's a chainsaw (DSP analysis)
            is_chainsaw_dsp = is_chainsaw_detected(
                analysis, 
                threshold=self.config['chainsaw_threshold']
            )
            
            if is_chainsaw_dsp:
                print(" DSP: CHAINSAW DETECTED!")
            else:
                print("  DSP: No chainsaw pattern detected")
        
        except Exception as e:
            print(f"ERROR analyzing audio: {e}")
            is_chainsaw_dsp = False
        
        # ML model verification (if DSP detected chainsaw)
        is_chainsaw_ml = False
        if is_chainsaw_dsp and self.ml_interpreter is not None:
            print("\n[3/4] ML Model verification...")
            try:
                ml_score = run_inference(
                    self.ml_interpreter,
                    self.ml_input_details,
                    self.ml_output_details,
                    audio_path
                )
                
                if ml_score is not None:
                    ml_percentage = ml_score * 100
                    ml_threshold = self.config.get('ml_threshold', 0.5)
                    is_chainsaw_ml = ml_score > ml_threshold
                    
                    print(f"  ML confidence: {ml_percentage:.2f}%")
                    if is_chainsaw_ml:
                        print(f"ML CONFIRMED: Chainsaw detected (threshold: {ml_threshold*100:.0f}%)")
                    else:
                        print(f"ML REJECTED: Not a chainsaw (threshold: {ml_threshold*100:.0f}%)")
                else:
                    print("ML inference failed, using DSP result only")
                    is_chainsaw_ml = True  # Fallback to DSP result
            except Exception as e:
                print(f"  ERROR in ML verification: {e}")
                is_chainsaw_ml = True  # Fallback to DSP result
        elif is_chainsaw_dsp:
            # DSP detected but no ML model available
            print("\n[3/4]ML model not available, using DSP result only")
            is_chainsaw_ml = True
        
        # Final decision: Both DSP and ML must agree (if ML available)
        is_chainsaw_confirmed = is_chainsaw_dsp and is_chainsaw_ml
        
        # Send alert to AWS ONLY if chainsaw confirmed
        if is_chainsaw_confirmed:
            print("\n[4/4] Chainsaw CONFIRMED! Sending alert to AWS...")
            success = send_alert(
                device_id=self.device_id,
                latitude=self.config['latitude'],
                longitude=self.config['longitude'],
                audio_file_path=audio_path
            )
            
            if success:
                print("Alert sent successfully!")
            else:
                print("Failed to send alert!")
        else:
            if is_chainsaw_dsp and not is_chainsaw_ml:
                print("\n[4/4] DSP detected but ML rejected - alert NOT sent")
            else:
                print("\n[4/4] No chainsaw detected - alert NOT sent")
            print("Continuing monitoring...")
        
        print("="*60 + "\n")
    
    def run(self):
        """Run the monitoring system."""
        print("\n" + "="*60)
        print("FOREST MONITORING SYSTEM - ACTIVE")
        print("="*60)
        print(f"Device ID: {self.device_id}")
        print(f"Location: ({self.config['latitude']}, {self.config['longitude']})")
        print(f"Mode: {'MOCK' if self.mock_mode else 'HARDWARE'}")
        print("="*60 + "\n")
        
        try:
            # Monitor for sound events
            self.sound_sensor.monitor(callback=self.process_sound_event)
        
        except KeyboardInterrupt:
            print("\nSystem stopped by user.")
        
        finally:
            self.sound_sensor.cleanup()
            print("System shutdown complete.")


def main():
    """Main entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(description='Forest Monitoring System')
    parser.add_argument(
        '--mock', 
        action='store_true', 
        help='Run in mock mode (no hardware required)'
    )
    parser.add_argument(
        '--config', 
        default='config.json',
        help='Path to configuration file'
    )
    
    args = parser.parse_args()
    
    # Create and run system
    system = ForestMonitoringSystem(
        config_path=args.config,
        mock_mode=args.mock
    )
    system.run()


if __name__ == "__main__":
    main()

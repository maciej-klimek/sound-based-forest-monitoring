"""
Simple test script to manually trigger mock sound detection.
This simulates the sound sensor detecting a sound event.
"""

import sys
import os
import time

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from sound_sensor import MockSoundSensor
from audio_recorder import MockAudioRecorder
from main import ForestMonitoringSystem


def test_mock_detection():
    """Test the system with mock sound detection."""
    print("="*60)
    print("MOCK DETECTION TEST")
    print("="*60)
    
    # Create system in mock mode
    system = ForestMonitoringSystem(mock_mode=True)
    
    # Set mock audio file (use a test file)
    mock_audio = os.path.join(
        os.path.dirname(__file__), 
        'test_file', 
        'sample.wav'
    )
    
    if os.path.exists(mock_audio):
        system.audio_recorder.set_mock_audio(mock_audio)
        print(f"\nMock audio file: {mock_audio}")
    else:
        print(f"\nWARNING: Mock audio file not found: {mock_audio}")
        print("The test will proceed but may fail during recording.\n")
    
    # Manually trigger sound detection
    print("\nTriggering mock sound detection in 3 seconds...")
    time.sleep(3)
    
    # Process the event
    system.process_sound_event()
    
    print("\nTest complete!")


if __name__ == "__main__":
    test_mock_detection()

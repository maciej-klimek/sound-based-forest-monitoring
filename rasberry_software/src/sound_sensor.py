"""
Sound sensor module for detecting sound events using GPIO.
Supports both real hardware (RPi.GPIO) and mock mode for testing.
"""

import time


class SoundSensor:
    """Sound sensor interface with GPIO support."""
    
    def __init__(self, sensor_pin=17, mock_mode=False):
        """
        Initialize sound sensor.
        
        :param sensor_pin: GPIO pin number (BCM mode)
        :param mock_mode: If True, use mock mode instead of real GPIO
        """
        self.sensor_pin = sensor_pin
        self.mock_mode = mock_mode
        self.triggered = False
        
        if not mock_mode:
            try:
                import RPi.GPIO as GPIO
                self.GPIO = GPIO
                self._setup_gpio()
            except ImportError:
                print("WARNING: RPi.GPIO not available. Switching to mock mode.")
                self.mock_mode = True
        
        if self.mock_mode:
            print(f"Sound sensor initialized in MOCK MODE (pin {sensor_pin})")
        else:
            print(f"Sound sensor initialized on GPIO pin {sensor_pin}")
    
    def _setup_gpio(self):
        """Setup GPIO pin for sensor."""
        self.GPIO.setmode(self.GPIO.BCM)
        self.GPIO.setup(
            self.sensor_pin, 
            self.GPIO.IN, 
            pull_up_down=self.GPIO.PUD_DOWN
        )
    
    def is_sound_detected(self):
        """
        Check if sound is currently detected.
        
        :return: True if sound detected, False otherwise
        """
        if self.mock_mode:
            # In mock mode, simulate random detection
            import random
            return random.random() < 0.1  # 10% chance of detection
        else:
            return self.GPIO.input(self.sensor_pin) == self.GPIO.HIGH
    
    def wait_for_sound(self, timeout=None):
        """
        Wait for sound detection event.
        
        :param timeout: Maximum time to wait in seconds (None = infinite)
        :return: True if sound detected, False if timeout
        """
        print("Waiting for sound detection...")
        start_time = time.time()
        
        while True:
            if self.is_sound_detected():
                if not self.triggered:
                    print("Sound detected!")
                    self.triggered = True
                    return True
            else:
                self.triggered = False
            
            # Check timeout
            if timeout and (time.time() - start_time) > timeout:
                print("Timeout: No sound detected")
                return False
            
            time.sleep(0.05)  # Small delay to prevent CPU overload
    
    def monitor(self, callback=None, poll_interval=0.05):
        """
        Continuously monitor for sound events.
        
        :param callback: Function to call when sound detected
        :param poll_interval: Time between checks in seconds
        """
        print(f"Monitoring GPIO pin {self.sensor_pin}...")
        print("Press CTRL+C to exit.")
        
        try:
            while True:
                if self.is_sound_detected():
                    if not self.triggered:
                        print("Sound detected!")
                        self.triggered = True
                        if callback:
                            callback()
                else:
                    self.triggered = False
                
                time.sleep(poll_interval)
        
        except KeyboardInterrupt:
            print("\nMonitoring stopped by user.")
        finally:
            self.cleanup()
    
    def cleanup(self):
        """Clean up GPIO resources."""
        if not self.mock_mode:
            try:
                self.GPIO.cleanup()
                print("GPIO cleanup complete.")
            except:
                pass


class MockSoundSensor(SoundSensor):
    """Mock sound sensor for testing without hardware."""
    
    def __init__(self, sensor_pin=17):
        """Initialize mock sensor."""
        super().__init__(sensor_pin, mock_mode=True)
        self.manual_trigger = False
    
    def trigger_sound(self):
        """Manually trigger sound detection (for testing)."""
        self.manual_trigger = True
        print("Mock sensor: Sound triggered!")
    
    def is_sound_detected(self):
        """Check mock sound detection."""
        if self.manual_trigger:
            self.manual_trigger = False
            return True
        return False

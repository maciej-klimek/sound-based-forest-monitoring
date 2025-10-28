# Import necessary libraries
import RPi.GPIO as GPIO  # This library allows us to control the GPIO pins
import time              # This library provides time-related functions, like sleep

# --- Pin Configuration ---

# Set the pin numbering scheme to BCM.
# This means we will refer to pins by their "GPIO" number (e.g., GPIO17)
# rather than their physical pin number on the header.
GPIO.setmode(GPIO.BCM)

# Define the GPIO pin that the sound sensor's digital output (DO) is connected to.
SENSOR_PIN = 17

# Set up the sensor pin as an input.
# GPIO.IN: Configures the pin to read signals.
# pull_up_down=GPIO.PUD_DOWN: This is a good practice. It sets a default state for the pin.
# If the pin is not actively driven HIGH by the sensor, this internal resistor will "pull it down"
# to a LOW state, preventing random "floating" values.
GPIO.setup(SENSOR_PIN, GPIO.IN, pull_up_down=GPIO.PUD_DOWN)


# --- Main Program Logic ---

print("--- Listening Script Initialized ---")
print(f"Monitoring GPIO pin {SENSOR_PIN}...")
print("Press CTRL+C to exit.")

try:
    # A flag variable to track the state. This is used to print the message only once
    # per trigger event, preventing the console from being spammed with "Hello World!"
    # if the sound is continuous.
    triggered = False
    
    # Start an infinite loop to continuously check the sensor's state.
    # The program will stay in this loop until interrupted.
    while True:
        # Check if the signal on the sensor pin is HIGH (logic level 1).
        # A HIGH signal means the sound sensor has detected a sound louder than its threshold.
        if GPIO.input(SENSOR_PIN) == GPIO.HIGH:
            # If the signal is HIGH and we haven't already printed the message for this event...
            if not triggered:
                print("Hello World!")
                triggered = True  # Set the flag to True to indicate we have responded to this event.
        else:
            # If the signal is LOW, it means it's quiet again.
            # Reset the flag so we are ready to detect the next sound event.
            triggered = False
            
        # Add a short delay to the loop.
        # This is crucial to prevent the script from consuming 100% of the CPU
        # by checking the pin state millions of times per second.
        time.sleep(0.05)

except KeyboardInterrupt:
    # This block of code runs when the user presses CTRL+C.
    # It allows for a clean exit from the program.
    print("\nScript terminated by user.")

finally:
    # This block of code will run NO MATTER WHAT when the script exits
    # (either by CTRL+C or by an error).
    # It's extremely important to "clean up" the GPIO pins. This resets all pins
    # we've used back to their default state (inputs), preventing potential issues.
    GPIO.cleanup()
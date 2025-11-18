import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from aws_comunicator import register_device, send_alert, DEVICE_IDENTITY_FILE

# --- TEST CONFIGURATION ---
TEST_LATITUDE = 52.2297  # Example coordinates
TEST_LONGITUDE = 21.0122
TEST_AUDIO_FILE = os.path.join(os.path.dirname(__file__), "test_file", "sample.wav")


# --- MAIN TEST SCRIPT ---
if __name__ == "__main__":
    print("="*50)
    print(" STARTING API COMMUNICATION TEST")
    print("="*50)

    # To ensure we perform a new registration, let's delete the old identity file if it exists
    if os.path.exists(DEVICE_IDENTITY_FILE):
        print(f"Removing old identity file '{DEVICE_IDENTITY_FILE}' to force new registration.")
        os.remove(DEVICE_IDENTITY_FILE)
    
    # === TEST 1: DEVICE REGISTRATION ===
    print("\n>>> Step 1: Testing the register_device() function...")
    # Call the registration function with our test coordinates
    device_id, device_secret = register_device(
        latitude=TEST_LATITUDE,
        longitude=TEST_LONGITUDE
    )
    
    if device_id and device_secret:
        print(">>> Result: OK")
    else:
        print(">>> Result: FAILED")
        
    print("\n" + "-"*50 + "\n")
    
    # === TEST 2: SENDING AN ALERT ===
    # This test will only run if the registration was successful (we have a device_id)
    if device_id:
        print(">>> Step 2: Testing the send_alert() function...")
        
        # Send alert with audio file
        alert_success = send_alert(
            device_id=device_id,
            latitude=TEST_LATITUDE,
            longitude=TEST_LONGITUDE,
            audio_file_path=TEST_AUDIO_FILE
        )
        
        if alert_success:
            print(">>> Result: OK")
        else:
            print(">>> Result: FAILED")
    else:
        print(">>> Step 2: Skipping alert test due to registration failure.")

    print("\n" + "="*50)
    print(" TESTS FINISHED")
    print("="*50)
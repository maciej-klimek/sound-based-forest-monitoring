import requests
import json
import os
import base64
from datetime import datetime

# --- Configuration ---
BASE_URL = "https://uynrsnmjoe.execute-api.eu-north-1.amazonaws.com/"

DEVICE_IDENTITY_FILE = "device_identity.json" # File to store the device's identity (ID and secret)

# --- Communication Functions ---

def register_device(latitude: float, longitude: float):
    """
    Registers a NEW device by sending its coordinates.
    The server assigns a DeviceID and DeviceSecret, which are then saved to a file.
    
    :param latitude: The latitude of the device.
    :param longitude: The longitude of the device.
    :return: A tuple (deviceId, deviceSecret) on success, or (None, None) on failure.
    """
    url = BASE_URL + "/register"
    payload = {
        "lat": latitude,
        "lon": longitude
    }
    
    print(f"Attempting to register a new device at ({latitude}, {longitude})...")
    
    try:
        response = requests.post(url, json=payload)
        response.raise_for_status()  # Raise an exception for bad status codes (4xx or 5xx)
        
        response_data = response.json()
        
        # Extract the ID and secret from the server's response
        received_id = response_data.get("deviceId")
        received_secret = response_data.get("deviceSecret")
        
        if not received_id or not received_secret:
            print("[ERROR] Server response did not contain 'deviceId' or 'deviceSecret'.")
            print(f"Full response: {response_data}")
            return None, None

        print("[SUCCESS] Device registration successful!")
        print(f"  - Received Device ID: {received_id}")
        print(f"  - Received Device Secret: {received_secret}")

        # Save the identity (ID and secret) to a local file for future use
        identity_data = {
            "deviceId": received_id,
            "deviceSecret": received_secret
        }
        with open(DEVICE_IDENTITY_FILE, "w") as f:
            json.dump(identity_data, f)
        print(f"Device identity saved to '{DEVICE_IDENTITY_FILE}'")
        
        return received_id, received_secret
        
    except requests.exceptions.RequestException as e:
        print(f"[ERROR] Device registration failed: {e}")
        return None, None

def send_alert(device_id: str, latitude: float, longitude: float, audio_file_path: str):
    """
    Sends an alert with event data and an audio sample file.
    
    :param device_id: The unique ID of the device sending the alert.
    :param latitude: The latitude of the event.
    :param longitude: The longitude of the event.
    :param audio_file_path: The local path to the audio file to be uploaded.
    :return: True on success, False on failure.
    """
    url = BASE_URL + "/alert"
    
    try:
        # Read and encode audio file to base64
        with open(audio_file_path, 'rb') as audio_file:
            audio_bytes = audio_file.read()
            audio_b64 = base64.b64encode(audio_bytes).decode('utf-8')
        
        # Generate timestamp in ISO 8601 format
        timestamp = datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')
        
        # Prepare JSON payload as expected by backend
        payload = {
            'deviceId': device_id,
            'ts': timestamp,
            'lat': latitude,
            'lon': longitude,
            'audioB64': audio_b64
            # Note: 'distance' is not currently supported by the backend
        }
        
        print(f"Sending alert from device {device_id}...")
        print(f"  - Timestamp: {timestamp}")
        print(f"  - Audio size: {len(audio_bytes)} bytes")
        
        # Send the POST request with JSON payload
        response = requests.post(url, json=payload)
        response.raise_for_status()
        
        print("[SUCCESS] Alert sent successfully!")
        print(f"  - Server response status: {response.status_code}")
        try:
            response_data = response.json()
            print(f"  - Server response: {response_data}")
            if 's3Key' in response_data:
                print(f"  - Audio saved to S3: {response_data['s3Key']}")
        except json.JSONDecodeError:
            print("  - Server did not return a JSON response.")
        return True

    except FileNotFoundError:
        print(f"[ERROR] Audio file not found at: {audio_file_path}")
        return False
    except requests.exceptions.RequestException as e:
        print(f"[ERROR] Failed to send alert: {e}")
        if hasattr(e.response, 'text'):
            print(f"  - Server error details: {e.response.text}")
        return False
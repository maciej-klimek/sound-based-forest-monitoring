import requests
import time
import json
from datetime import datetime, timedelta

REGISTER_URL = "https://i18wwdizmk.execute-api.eu-north-1.amazonaws.com/registered"
ALERT_URL = "https://i18wwdizmk.execute-api.eu-north-1.amazonaws.com/alert"

BASE_LAT = 50.06140
BASE_LON = 19.93830

AUDIO_SAMPLE = "UklGRgAAAABXQVZF..." 


def register_devices(n=5):
    devices = []
    print("Registering devices...")

    for i in range(n):
        body = {
            "lat": BASE_LAT + (i * 0.00005),
            "lon": BASE_LON + (i * 0.00005)
        }

        resp = requests.post(REGISTER_URL, json=body)
        resp.raise_for_status()

        device_id = resp.json().get("deviceId")
        print(f"[{i}] Device registered: {device_id}")

        devices.append(device_id)

    return devices


def send_alerts(devices):
    print("\nSending alerts...\n")

    for i, device_id in enumerate(devices):
        ts = (datetime.utcnow() + timedelta(seconds=i)).isoformat() + "Z"

        body = {
            "deviceId": device_id,
            "lat": BASE_LAT,
            "lon": BASE_LON,
            "ts": ts,
            "audioB64": AUDIO_SAMPLE
        }

        resp = requests.post(ALERT_URL, json=body)
        resp.raise_for_status()

        print(f"[{i}] Alert sent from device {device_id} at {ts}")

        time.sleep(1)


if __name__ == "__main__":
    devices = register_devices(5)
    send_alerts(devices)

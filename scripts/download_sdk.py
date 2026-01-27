
import requests
import os

url = "https://sdk.minepi.com/pi-sdk.js"
output_path = "static/libs/pi-sdk.js"

# Ensure directory exists
os.makedirs(os.path.dirname(output_path), exist_ok=True)

print(f"Downloading Pi SDK from {url}...")
try:
    response = requests.get(url)
    response.raise_for_status()
    with open(output_path, "wb") as f:
        f.write(response.content)
    print(f"✅ Successfully downloaded to {output_path}")
except Exception as e:
    print(f"❌ Error downloading SDK: {e}")

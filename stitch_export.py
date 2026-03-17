import json
import os
import re
import urllib.request
import ssl
import time

API_KEY = "AQ.Ab8RN6IfDt6UftfihWhjTMgrpV-C3-SkJ-axXRZHt4sTvIsafQ"
PROJECT_ID = "16328417227383005102"
OUT_DIR = "apps/demo-app/src/stitch"

TARGET_SCREENS = [
    "CompliHub360 Landing Page",
    "Wizard Step 1: Market Scope",
    "CompliHub360 Results Overview",
    "Engagement Request Modal"
]

def sanitize_filename(name):
    clean = re.sub(r'[^a-zA-Z0-9_\-\s]', '', name)
    return clean.strip().replace(' ', '_').lower() + '.html'

def main():
    print(f"Fetching Stitch screens for project {PROJECT_ID}...")
    url = f"https://stitch.googleapis.com/v1/projects/{PROJECT_ID}/screens"
    
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    
    req = urllib.request.Request(url, headers={"X-Goog-Api-Key": API_KEY})
    try:
        with urllib.request.urlopen(req, context=ctx) as response:
            data = json.loads(response.read().decode())
    except Exception as e:
        print(f"Error fetching screens: {e}")
        return

    screens = data.get("screens", [])
    if not screens:
        print("No screens found in this project.")
        return

    os.makedirs(OUT_DIR, exist_ok=True)
    
    count = 0
    # Process only the most recent screens matching our target names
    for screen in reversed(screens): # reverse to get latest first
        title = screen.get("title", "Untitled")
        
        if title not in TARGET_SCREENS:
            continue
            
        html_info = screen.get("htmlCode")
        
        if html_info and "downloadUrl" in html_info:
            download_url = html_info["downloadUrl"]
            filename = sanitize_filename(title)
            filepath = os.path.join(OUT_DIR, filename)
            
            # If we already downloaded it in this session, skip
            if not os.path.exists(filepath):
                print(f"Downloading: {title} -> {filepath}")
                try:
                    time.sleep(1.5) # Prevent 429 Too Many Requests
                    with urllib.request.urlopen(download_url, context=ctx) as d_response:
                        html_content = d_response.read()
                        with open(filepath, "wb") as f:
                            f.write(html_content)
                    count += 1
                    # Remove from target to avoid duplicates
                    TARGET_SCREENS.remove(title)
                except Exception as e:
                    print(f"  Error downloading {title}: {e}")

    print(f"Successfully exported {count} screens to {OUT_DIR}.")

if __name__ == "__main__":
    main()

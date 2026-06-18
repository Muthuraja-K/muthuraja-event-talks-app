import time
import logging
import urllib.request
import xml.etree.ElementTree as ET
from flask import Flask, jsonify, render_template, request

# Setup basic logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

# Simple in-memory cache
cache = {
    "data": None,
    "last_updated": 0
}
CACHE_DURATION_SECS = 600  # 10 minutes

def fetch_and_parse_feed():
    logging.info(f"Fetching XML feed from: {FEED_URL}")
    req = urllib.request.Request(
        FEED_URL,
        headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) BigQueryReleaseNotesApp/1.0'}
    )
    
    with urllib.request.urlopen(req, timeout=15) as response:
        xml_data = response.read()
        
    logging.info("XML feed fetched successfully. Parsing Atom feed...")
    root = ET.fromstring(xml_data)
    
    # Standard Atom feed namespace
    ns = "{http://www.w3.org/2005/Atom}"
    
    entries = []
    for entry_el in root.findall(f"{ns}entry"):
        title_el = entry_el.find(f"{ns}title")
        id_el = entry_el.find(f"{ns}id")
        updated_el = entry_el.find(f"{ns}updated")
        
        # Extract the alternate link (the main page link)
        link_href = ""
        for link_el in entry_el.findall(f"{ns}link"):
            if link_el.attrib.get("rel") == "alternate":
                link_href = link_el.attrib.get("href", "")
                break
        
        # Fallback to any link if rel="alternate" wasn't explicitly found
        if not link_href:
            link_el = entry_el.find(f"{ns}link")
            if link_el is not None:
                link_href = link_el.attrib.get("href", "")
                
        content_el = entry_el.find(f"{ns}content")
        
        title = title_el.text if title_el is not None else ""
        entry_id = id_el.text if id_el is not None else ""
        updated = updated_el.text if updated_el is not None else ""
        content = content_el.text if content_el is not None else ""
        
        entries.append({
            "id": entry_id,
            "title": title,
            "updated": updated,
            "link": link_href,
            "content": content
        })
        
    logging.info(f"Successfully parsed {len(entries)} release entries.")
    return entries

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    current_time = time.time()
    
    # Use cached data if it exists, is fresh, and refresh is not forced
    if cache["data"] is not None and not force_refresh:
        time_elapsed = current_time - cache["last_updated"]
        if time_elapsed < CACHE_DURATION_SECS:
            logging.info("Serving releases from cache.")
            return jsonify({
                "source": "cache",
                "last_updated": cache["last_updated"],
                "releases": cache["data"]
            })
            
    try:
        releases = fetch_and_parse_feed()
        cache["data"] = releases
        cache["last_updated"] = current_time
        return jsonify({
            "source": "feed",
            "last_updated": current_time,
            "releases": releases
        })
    except Exception as e:
        logging.error(f"Error fetching/parsing feed: {str(e)}", exc_info=True)
        # Fall back to cache if available even if expired, otherwise return error
        if cache["data"] is not None:
            logging.warning("Failed to fetch feed, serving stale cache.")
            return jsonify({
                "source": "stale_cache",
                "error": str(e),
                "last_updated": cache["last_updated"],
                "releases": cache["data"]
            })
        return jsonify({
            "error": "Failed to fetch and parse BigQuery release notes",
            "details": str(e)
        }), 500

if __name__ == '__main__':
    # Running locally on port 5000 in debug mode
    app.run(host='0.0.0.0', port=5000, debug=True)

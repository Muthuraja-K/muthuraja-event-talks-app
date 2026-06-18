# BigQuery Release Pulse 📊

An elegant, real-time dashboard built with **Python Flask** and **plain vanilla HTML5, CSS3, and JavaScript**. The application pulls release updates directly from the official Google Cloud BigQuery feed, parses them, organizes them by date, and offers a selection tool to compose and post updates directly to X (formerly Twitter).

---

## ✨ Features

- **Automated Feed Parsing**: Fetches the official Atom XML feed and decomposes complex update items into structured, individual release cards.
- **Glassmorphic Cyber-Dark UI**: Designed with modern visual aesthetics including background glows, backdrop-filters, custom typography (Outfit & Inter), and fluid scale transitions.
- **Color-Coded Release Categorization**:
  - 🟢 **Feature**: New functionality, enhancements, and general availability transitions.
  - 🟣 **Announcement**: General updates, system notifications, or upcoming feature transitions.
  - 🔴 **Issue / Fix**: Known issues, bug resolutions, and operational updates.
  - 🟡 **Deprecation**: Deprecated commands, retired features, and support window changes.
- **Live Search & Filters**: Search titles, code, or content instantaneously, and filter by update type.
- **Local Cache & Manual Refresh**: Smart in-memory cache valid for 10 minutes to protect API rates, with a force-refresh spinner control to fetch fresh feed data.
- **X/Twitter Composer Integration**: Pre-populates a beautiful modal composition panel with a truncated update summary matching the X API 280-character limit rules (calculating HTTP links as exactly 23 characters).

---

## 🛠️ Technology Stack

- **Backend**: Python 3.13, Flask, Waitress
- **Frontend**: Vanilla JavaScript (ES6+), Vanilla CSS3 (Custom Theme Properties), HTML5 Semantics
- **Icons**: Lucide Icons (CDN)
- **Fonts**: Outfit & Inter (Google Fonts)

---

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- Git

### Installation

1. **Clone or download the project files**:
   ```bash
   git clone <your-repository-url>
   cd muthuraja-event-talks-app
   ```

2. **Initialize and Activate Virtual Environment**:
   ```bash
   # Create environment
   python -m venv .venv
   
   # Activate on Windows (PowerShell)
   .\.venv\Scripts\activate
   
   # Activate on macOS/Linux
   source .venv/bin/activate
   ```

3. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Launch the Server**:
   ```bash
   python app.py
   ```

5. **Open in Browser**: Visit [http://127.0.0.1:5000](http://127.0.0.1:5000) to access the live dashboard.

---

## 📸 Project Interface Details

- **Responsive Viewports**: Supports mobile, tablet, and desktop views natively.
- **Compose Modal**: Edit and customize the generated tweet with dynamic character limit safety gauges (shows warnings when approaching 280 characters).
- **Official Docs Tracking**: Quick link redirects at the bottom of each card back to the official Google Cloud documentation anchors.

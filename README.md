# Shell_Acworth Employee Time Clock

A mobile-friendly employee check-in/check-out system with Google Sheets integration.

## Setup Instructions

### Step 1: Create the Google Sheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new spreadsheet
3. Rename it to "Shell_Acworth Time Clock"

### Step 2: Set Up the Sheet Tabs

Create 3 tabs (sheets) with these exact names:
- `TimeLog`
- `Employees`
- `WeeklyPayroll`

### Step 3: Set Up Column Headers

**TimeLog tab** (Row 1):
| A | B | C | D | E | F | G |
|---|---|---|---|---|---|---|
| Timestamp | Employee ID | Employee Name | Action | Latitude | Longitude | Location Valid |

**Employees tab** (Row 1):
| A | B | C | D |
|---|---|---|---|
| Employee ID | Name | PIN | Hourly Rate |

Add your 5 employees starting row 2, for example:
| Employee ID | Name | PIN | Hourly Rate |
|-------------|------|-----|-------------|
| E001 | John Smith | 1234 | 15 |
| E002 | Jane Doe | 5678 | 15 |
| ... | ... | ... | 15 |

**WeeklyPayroll tab** (Row 1):
| A | B | C | D | E | F |
|---|---|---|---|---|---|
| Week Starting | Employee ID | Employee Name | Total Hours | Hourly Rate | Total Pay |

### Step 4: Add the Google Apps Script

1. In your Google Sheet, go to **Extensions > Apps Script**
2. Delete any existing code
3. Copy the entire contents of `google-apps-script.js` into the editor
4. Click **Save** (💾 icon)
5. Click **Deploy > New deployment**
6. Select type: **Web app**
7. Settings:
   - Description: "Shell_Acworth Time Clock API"
   - Execute as: **Me**
   - Who has access: **Anyone**
8. Click **Deploy**
9. **Copy the Web App URL** - you'll need this!

### Step 5: Configure the Web App

1. Open `index.html`
2. Find this line near the top:
   ```javascript
   const API_URL = 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE';
   ```
3. Replace with your actual Web App URL from Step 4

### Step 6: Host the Web App

**Option A: GitHub Pages (Free)**
1. Create a GitHub repository
2. Upload `index.html`
3. Enable GitHub Pages in repository settings
4. Share the URL with employees

**Option B: Google Sites**
1. Create a new Google Site
2. Embed the HTML using an embed block

**Option C: Any web hosting**
Upload `index.html` to any web server

### Step 7: Employee Usage

1. Employees open the web app on their phone
2. Enter their Employee ID and PIN
3. Allow location access when prompted
4. Tap "Check In" when arriving at work
5. Tap "Check Out" when leaving

## Configuration

- **Work Location:** 21 Golf Crest Dr, Acworth, GA 30101
- **Coordinates:** 34.0659, -84.6769 (approximate)
- **Geofence Radius:** 100 meters
- **Pay Rate:** $15/hour
- **Pay Period:** Monday - Sunday

## Files

- `index.html` - The mobile web app
- `google-apps-script.js` - Backend code for Google Sheets
- `README.md` - This file

# Calendar Monitor - Node.js Application

A standalone web application to monitor team calendar utilization for On The Fuze.

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Google Cloud Project with Calendar API enabled

### Installation

1. **Clone or download the project**
```bash
mkdir calendar-monitor
cd calendar-monitor
```

2. **Install dependencies**
```bash
npm install
```

3. **Create `.env` file**
```bash
cp .env.example .env
```

4. **Configure `.env` with your credentials**
```env
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/oauth2callback
PORT=3000
THRESHOLD=30
```

5. **Start the application**
```bash
npm start
```

6. **Open browser**
```
http://localhost:3000
```

## 📁 Project Structure

```
calendar-monitor/
├── server.js              # Main application server
├── package.json           # Dependencies
├── .env                   # Configuration (create this)
├── .env.example          # Configuration template
├── views/
│   └── index.ejs         # Web interface
├── public/               # Static files (if needed)
└── README.md            # This file
```

## 🔧 Google Cloud Setup

### Step 1: Create Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project: "Calendar Monitor - On The Fuze"
3. Enable **Google Calendar API**

### Step 2: Configure OAuth

1. Go to **APIs & Services** → **OAuth consent screen**
2. Select **Internal** (for @onthefuze.com only)
3. Fill in:
   - App name: Calendar Monitor
   - User support email: Your email
   - Developer contact: Your email

4. Add scopes:
   - `https://www.googleapis.com/auth/calendar.readonly`
   - `https://www.googleapis.com/auth/calendar.events.readonly`

### Step 3: Create Credentials

1. **APIs & Services** → **Credentials**
2. **Create Credentials** → **OAuth client ID**
3. Application type: **Web application**
4. Name: "Calendar Monitor"
5. Authorized redirect URIs:
   ```
   http://localhost:3000/oauth2callback
   ```
   
   For production, also add:
   ```
   https://your-domain.com/oauth2callback
   ```

6. Copy **Client ID** and **Client Secret** to `.env` file

## 🎯 How to Use

### First Time Setup

1. **Start the application**: `npm start`
2. **Open browser**: `http://localhost:3000`
3. **Click "Authenticate with Google"**
4. **Sign in** with your @onthefuze.com account
5. **Allow** calendar access
6. You'll be redirected back to the dashboard

### Daily Usage

1. **Open**: `http://localhost:3000`
2. **Click "Check All Calendars"**
3. **View results**:
   - Average utilization
   - Members below threshold
   - Detailed breakdown

### Automatic Daily Checks

The app runs automatically at **9 AM Colombia time** and logs results to console.

To see scheduled check logs:
```bash
npm start
# Leave running and check console at 9 AM
```

## 📊 Features

### What It Monitors
- ✅ 24 team members (8 Engineering + 16 Software)
- ✅ Working hours: 9 AM - 6 PM
- ✅ Excludes lunch: 12 PM - 2 PM
- ✅ Focuses on 30min/1hr blocks
- ✅ Filters out meetings

### Utilization Calculation
```
Total Blocks: 14 (7 hours × 2 blocks per hour)
Filled Blocks: Non-meeting events / 30min
Utilization: (Filled Blocks / 14) × 100
```

### Results Display
- Average team utilization
- Members below threshold
- Individual breakdowns
- Event counts
- Error reporting

## 🔄 Development Mode

Run with auto-restart on file changes:
```bash
npm run dev
```

Requires `nodemon` (included in devDependencies)

## 🐛 Troubleshooting

### "Not authenticated" error
**Solution:**
- Click "Authenticate with Google" button
- Complete OAuth flow
- Refresh page

### "Error getting tokens"
**Check:**
- Client ID and Secret are correct in `.env`
- Redirect URI matches Google Console exactly
- OAuth consent screen is configured

### "Failed to fetch calendar"
**Verify:**
- Calendar API is enabled
- Calendars are shared with your account
- Team members exist in organization
- Email addresses are correct

### Port already in use
**Solution:**
```bash
# Change PORT in .env file
PORT=3001

# Or kill process using port 3000
# On Mac/Linux:
lsof -ti:3000 | xargs kill

# On Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Scheduled checks not running
**Verify:**
- Server is running continuously
- Time zone is set to "America/Bogota"
- Check server logs for cron execution

## 🚀 Production Deployment

### Deploy to Heroku

1. **Create Heroku app**
```bash
heroku create calendar-monitor-onthefuze
```

2. **Set environment variables**
```bash
heroku config:set GOOGLE_CLIENT_ID=your_client_id
heroku config:set GOOGLE_CLIENT_SECRET=your_client_secret
heroku config:set GOOGLE_REDIRECT_URI=https://your-app.herokuapp.com/oauth2callback
heroku config:set THRESHOLD=30
```

3. **Deploy**
```bash
git push heroku main
```

4. **Update Google Console**
- Add production redirect URI to OAuth credentials

### Deploy to any VPS

1. **Install Node.js** on server
2. **Copy files** to server
3. **Install dependencies**: `npm install`
4. **Configure `.env`** with production values
5. **Use PM2** to keep running:
```bash
npm install -g pm2
pm2 start server.js --name calendar-monitor
pm2 save
pm2 startup
```

### Environment Variables for Production
```env
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=https://your-domain.com/oauth2callback
PORT=3000
THRESHOLD=30
NODE_ENV=production
```

## 📝 Customization

### Change Threshold
Edit `.env`:
```env
THRESHOLD=40
```

### Change Working Hours
Edit `server.js` → `calculateUtilization()`:
```javascript
const TOTAL_BLOCKS = 14; // Change based on hours
// Modify lunch exclusion hours
if (hour >= 12 && hour < 14) return false;
```

### Change Scheduled Time
Edit `server.js` → `cron.schedule()`:
```javascript
cron.schedule('0 10 * * *', async () => { // 10 AM instead of 9 AM
```

Cron format: `minute hour day month weekday`

### Add/Remove Team Members
Edit `server.js` → `TEAM_MEMBERS` array:
```javascript
const TEAM_MEMBERS = [
  { name: 'New Person', email: 'new@onthefuze.com', role: 'Engineer' },
  // ...
];
```

## 🔒 Security Notes

- **Tokens stored in memory** - use database in production
- **OAuth tokens** - implement token refresh
- **HTTPS required** for production
- **Environment variables** - never commit `.env` file
- **Calendar access** - read-only permissions only

## 📞 Support

**Common Issues:**
- Check console logs for errors
- Verify Google Cloud Console settings
- Test with single calendar first
- Review calendar sharing permissions

**Need Help?**
- Check Google Calendar API docs
- Review OAuth 2.0 flow documentation
- Contact workspace admin for permissions

## 📄 Scripts

```json
{
  "start": "node server.js",      // Production
  "dev": "nodemon server.js"      // Development
}
```

## 🎓 API Endpoints

- `GET /` - Dashboard homepage
- `GET /auth` - Start OAuth flow
- `GET /oauth2callback` - OAuth callback
- `GET /api/check-calendars` - Check all calendars (JSON)

## 📊 Response Format

```json
{
  "checked": [...],
  "needsAttention": [...],
  "totalUtilization": 1234.5,
  "averageUtilization": "67.8",
  "errors": 0,
  "timestamp": "2024-12-05T14:30:00.000Z"
}
```

---

**Version**: 1.0.0  
**License**: Internal Use - On The Fuze  
**Last Updated**: December 2024
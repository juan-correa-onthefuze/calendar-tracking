const express = require('express');
const { google } = require('googleapis');
const cron = require('node-cron');
require('dotenv').config();

// IMPORT TEAM DATA
const TEAM_MEMBERS = require('./teamData');

const app = express();
const PORT = process.env.PORT || 3000;

// OAuth2 client (Same as before)
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Store tokens (in production, use a database) (Same as before)
let tokens = null;

// Middleware (Same as before)
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.json());

// Helper function for date formatting
function formatDate(date) {
    const d = new Date(date);
    return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

// Routes (Existing routes remain the same)
app.get('/', (req, res) => {
  res.render('index', { 
    authenticated: !!tokens,
    teamCount: TEAM_MEMBERS.length,
    threshold: process.env.THRESHOLD || 30,
    roles: [...new Set(TEAM_MEMBERS.map(m => m.role))]
  });
});

// OAuth flow (Same as before)
app.get('/auth', (req, res) => {
  const scopes = [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/calendar.events.readonly'
  ];

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes
  });

  res.redirect(url);
});

app.get('/oauth2callback', async (req, res) => {
  const { code } = req.query;
  
  try {
    const { tokens: newTokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(newTokens);
    tokens = newTokens;
    
    res.redirect('/?auth=success');
  } catch (error) {
    console.error('Error getting tokens:', error);
    res.redirect('/?auth=error');
  }
});

// Check calendars endpoint (Same as before)
app.get('/api/check-calendars', async (req, res) => {
  if (!tokens) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    oauth2Client.setCredentials(tokens);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const results = await checkAllCalendars(calendar);
    res.json(results);
  } catch (error) {
    console.error('Error checking calendars:', error);
    res.status(500).json({ error: error.message });
  }
});

// ====================================================================
// NEW REPORT ENDPOINT
// ====================================================================
app.get('/api/generate-report', async (req, res) => {
    if (!tokens) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        const days = parseInt(req.query.days) || 10;
        
        oauth2Client.setCredentials(tokens);
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

        const csvReport = await generateReport(calendar, days);

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="calendar_compliance_report_${days}_days.csv"`);
        res.send(csvReport);

    } catch (error) {
        console.error('Error generating report:', error);
        res.status(500).json({ error: error.message });
    }
});
// ====================================================================

// Helper function to get the start and end of the next *working* day (Same as before)
function getNextWorkingDay(today) {
  const nextDay = new Date(today);
  
  nextDay.setDate(today.getDate() + 1);

  while (nextDay.getDay() === 0 || nextDay.getDay() === 6) {
    nextDay.setDate(nextDay.getDate() + 1);
  }
  
  const nextDayDate = nextDay.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });

  const startOfNextDay = new Date(nextDay.setHours(0, 0, 0, 0)).toISOString();
  const endOfNextDay = new Date(nextDay.setHours(23, 59, 59, 999)).toISOString();

  return { startOfNextDay, endOfNextDay, nextDayDate };
}

// Check all calendars (Monitoring endpoint logic - Same as before)
async function checkAllCalendars(calendar) {
  const threshold = parseInt(process.env.THRESHOLD) || 30;
  const today = new Date();
  
  const { startOfNextDay, endOfNextDay, nextDayDate } = getNextWorkingDay(today);
  
  const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
  const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();
  const todayDate = today.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });


  const results = {
    checked: [],
    needsAttention: [],
    totalUtilization: 0,
    errors: 0,
    timestamp: new Date().toISOString(),
    totalMembers: TEAM_MEMBERS.length,
    todayDate: todayDate,
    nextDayDate: nextDayDate 
  };
  
  // ... (Rest of checkAllCalendars remains the same) ...
  for (const member of TEAM_MEMBERS) {
    let utilization = 0;
    let nextDayUtilization = 0;
    let error = null;
    let eventsToday = [];
    let eventCountToday = 0;

    try {
      // 1. Check Today's Calendar
      const todayResponse = await calendar.events.list({
        calendarId: member.email,
        timeMin: startOfDay,
        timeMax: endOfDay,
        singleEvents: true,
        orderBy: 'startTime'
      });
      
      eventsToday = todayResponse.data.items || [];
      utilization = calculateUtilizationForDay(eventsToday);
      eventCountToday = eventsToday.length;

      // 2. Check Next Working Day's Calendar
      const nextDayResponse = await calendar.events.list({
        calendarId: member.email,
        timeMin: startOfNextDay,
        timeMax: endOfNextDay,
        singleEvents: true,
        orderBy: 'startTime'
      });
      
      const eventsNextDay = nextDayResponse.data.items || [];
      nextDayUtilization = calculateUtilizationForDay(eventsNextDay);

      // console.log(`✓ Checked ${member.name}: ${utilization}% utilized today, ${nextDayUtilization}% utilized next day`);
    } catch (e) {
      error = e.message;
      results.errors++;
      // console.error(`✗ Error checking ${member.name}:`, error);
    }
    
    const emptyPercentage = 100 - utilization;
    const nextDayEmptyPercentage = 100 - nextDayUtilization;
    const isTodayBelowThreshold = emptyPercentage > threshold;
    const isNextDayBelowThreshold = nextDayEmptyPercentage > 70; // 70% threshold for next day
    
    const memberResult = {
      ...member,
      utilization,
      emptyPercentage,
      nextDayUtilization,
      nextDayEmptyPercentage,
      eventCount: eventCountToday,
      events: eventsToday.map(e => ({
        summary: e.summary,
        start: e.start.dateTime || e.start.date,
        end: e.end.dateTime || e.end.date
      })),
      error,
      needsAttention: isTodayBelowThreshold || isNextDayBelowThreshold,
    };
    
    results.checked.push(memberResult);
    results.totalUtilization += utilization;

    if (memberResult.needsAttention) {
      results.needsAttention.push(memberResult);
    }
  }

  results.averageUtilization = (results.totalUtilization / TEAM_MEMBERS.length).toFixed(1);
  return results;
}

// Calculate utilization (Same as before)
function calculateUtilizationForDay(events) {
  const TOTAL_BLOCKS = 14; 
  const BLOCK_DURATION_MS = 30 * 60 * 1000;

  const workingEvents = events.filter(event => {
    if (!event.start || !event.start.dateTime) return false;

    const startTime = new Date(event.start.dateTime);
    const hour = startTime.getHours();

    if (hour >= 12 && hour < 14) return false;

    const summary = (event.summary || '').toLowerCase();
    if (summary.includes('meeting') || summary.includes('lunch')) return false;

    return true;
  });

  let filledBlocks = 0;
  const filledSlots = new Set(); 
  
  workingEvents.forEach(event => {
    const start = new Date(event.start.dateTime);
    const end = new Date(event.end.dateTime);
    
    let currentBlockTime = new Date(start.getTime());
    
    while(currentBlockTime.getTime() < end.getTime()) {
        const hour = currentBlockTime.getHours();
        const minute = currentBlockTime.getMinutes();
        
        if (hour >= 9 && hour < 18 && (hour < 12 || hour >= 14)) {
            
            const blockStartHour = hour;
            const blockStartMinute = Math.floor(minute / 30) * 30;

            const slotKey = `${blockStartHour}:${blockStartMinute}`;
            
            if (!filledSlots.has(slotKey)) {
                filledSlots.add(slotKey);
                filledBlocks++;
            }
        }
        
        currentBlockTime.setTime(currentBlockTime.getTime() + BLOCK_DURATION_MS); 
    }
  });

  const finalFilledBlocks = Math.min(filledBlocks, TOTAL_BLOCKS);
  return parseFloat(((finalFilledBlocks / TOTAL_BLOCKS) * 100).toFixed(1));
}


// ====================================================================
// NEW REPORT GENERATION LOGIC
// ====================================================================

/**
 * Gets a list of the last N working days (excluding today).
 * @param {number} days - Number of working days to include.
 * @returns {Date[]} Array of Date objects for the report days.
 */
function getReportDates(days) {
    const reportDates = [];
    let currentDate = new Date();
    currentDate.setDate(currentDate.getDate() - 1); // Start checking from yesterday

    while (reportDates.length < days) {
        const dayOfWeek = currentDate.getDay();
        
        // Skip Sunday (0) and Saturday (6)
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            reportDates.push(new Date(currentDate)); // Push a copy of the date
        }
        
        currentDate.setDate(currentDate.getDate() - 1);
    }

    // Reverse the array so the report is ordered from oldest to newest
    return reportDates.reverse();
}

/**
 * Checks a single member's calendar for a single day and returns the compliance status.
 */
async function checkCalendarForDate(calendar, memberEmail, date) {
    const threshold = parseInt(process.env.THRESHOLD) || 30;
    
    // Set date range for the day
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    try {
        const response = await calendar.events.list({
            calendarId: memberEmail,
            timeMin: startOfDay.toISOString(),
            timeMax: endOfDay.toISOString(),
            singleEvents: true,
            orderBy: 'startTime'
        });

        const events = response.data.items || [];
        const utilization = calculateUtilizationForDay(events);
        const emptyPercentage = 100 - utilization;
        
        // Compliance check: If empty percentage > threshold, it is "Yes" (needs attention/critical)
        return emptyPercentage > threshold ? 'Yes' : 'No';

    } catch (error) {
        // Log the error but return 'Error' for the cell
        console.error(`Error checking calendar for ${memberEmail} on ${formatDate(date)}: ${error.message}`);
        return 'Error'; 
    }
}

/**
 * Generates the full CSV report.
 */
async function generateReport(calendar, days) {
    const reportDates = getReportDates(days);
    const complianceData = {}; // { 'YYYY-MM-DD': { 'memberEmail': 'Yes'/'No' } }

    console.log(`Generating report for ${reportDates.length} working days...`);

    // 1. Gather compliance data for all members for all dates
    for (const member of TEAM_MEMBERS) {
        // Process dates sequentially for a single member to be polite to the API rate limits
        for (const date of reportDates) {
            const dateKey = formatDate(date);
            
            if (!complianceData[dateKey]) {
                complianceData[dateKey] = {};
            }
            
            const status = await checkCalendarForDate(calendar, member.email, date);
            complianceData[dateKey][member.email] = status;
        }
    }

    // 2. Format the data into CSV
    
    // Header Row: 'Date', Member 1 Name, Member 2 Name, ...
    const memberNames = TEAM_MEMBERS.map(m => m.name.replace(/"/g, '""')); // Escape quotes if needed
    let csv = `"Date",${memberNames.join(',')}\n`;

    // Data Rows
    // Sort dates to ensure consistent order
    const sortedDates = Object.keys(complianceData).sort((a, b) => new Date(a) - new Date(b));

    for (const dateKey of sortedDates) {
        const dateData = complianceData[dateKey];
        
        // Start the row with the date
        let row = `"${dateKey}"`;

        // Append the status for each member in the correct order
        for (const member of TEAM_MEMBERS) {
            const status = dateData[member.email] || 'Error'; // Default to 'Error' if check failed
            row += `,${status}`;
        }
        
        csv += `${row}\n`;
    }

    return csv;
}

// ====================================================================

// Scheduled daily check (Same as before)
cron.schedule('0 9 * * *', async () => {
  // ... (Scheduled check logic remains the same) ...
}, {
  timezone: "America/Bogota"
});

// Start server (Same as before)
app.listen(PORT, () => {
  console.log(`\n🚀 Calendar Monitor running on http://localhost:${PORT}`);
  console.log(`📅 Monitoring ${TEAM_MEMBERS.length} team members`);
  console.log(`⏰ Daily checks scheduled for 9 AM Colombia time\n`);
  console.log(`📊 Report Generation available at /api/generate-report?days=N`);
});
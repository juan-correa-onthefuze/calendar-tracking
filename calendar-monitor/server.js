const express = require('express');
const { google } = require('googleapis');
const cron = require('node-cron');
require('dotenv').config();

// IMPORT TEAM DATA
const TEAM_MEMBERS = require('./teamData');

const app = express();
const PORT = process.env.PORT || 3000;

// OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Store tokens (in production, use a database)
let tokens = null;

// Middleware
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.json());

// Helper function for date formatting
function formatDate(date) {
    const d = new Date(date);
    return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

// Routes
app.get('/', (req, res) => {
  res.render('index', { 
    authenticated: !!tokens,
    teamCount: TEAM_MEMBERS.length,
    threshold: process.env.THRESHOLD || 30,
    roles: [...new Set(TEAM_MEMBERS.map(m => m.role))]
  });
});

// OAuth flow
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

// Check calendars endpoint - NOW ACCEPTS A DATE PARAMETER
app.get('/api/check-calendars', async (req, res) => {
  if (!tokens) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    oauth2Client.setCredentials(tokens);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Get the date from query parameter, or default to today
    const dateParam = req.query.date;
    const targetDate = dateParam ? new Date(dateParam) : new Date();

    const results = await checkAllCalendars(calendar, targetDate);
    res.json(results);
  } catch (error) {
    console.error('Error checking calendars:', error);
    res.status(500).json({ error: error.message });
  }
});

// Generate report endpoint
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

// Check all calendars for a specific date
async function checkAllCalendars(calendar, targetDate) {
  const threshold = parseInt(process.env.THRESHOLD) || 30;
  
  // Set the date range for the target date ONLY
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);
  
  const dateString = targetDate.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric', year: 'numeric' });

  const results = {
    checked: [],
    needsAttention: [],
    totalUtilization: 0,
    errors: 0,
    timestamp: new Date().toISOString(),
    totalMembers: TEAM_MEMBERS.length,
    targetDate: dateString,
    targetDateISO: targetDate.toISOString()
  };
  
  for (const member of TEAM_MEMBERS) {
    let utilization = 0;
    let error = null;
    let events = [];
    let eventCount = 0;

    try {
      // Check ONLY the target date's calendar - NO next day checking
      const response = await calendar.events.list({
        calendarId: member.email,
        timeMin: startOfDay.toISOString(),
        timeMax: endOfDay.toISOString(),
        singleEvents: true,
        orderBy: 'startTime'
      });
      
      events = response.data.items || [];
      const calculationResult = calculateUtilizationForDay(events);
      utilization = calculationResult.utilization;
      eventCount = events.length;

    } catch (e) {
      error = e.message;
      results.errors++;
    }
    
    const emptyPercentage = 100 - utilization;
    
    // Get calculation details
    const calculationResult = calculateUtilizationForDay(events);
    
    // needsAttention is ONLY based on the selected day's empty percentage
    // NO next day checking - next day status does NOT affect this
    const needsAttention = emptyPercentage > threshold;
    
    const memberResult = {
      ...member,
      utilization: calculationResult.utilization,
      emptyPercentage,
      eventCount,
      events: events.map(e => ({
        summary: e.summary,
        start: e.start.dateTime || e.start.date,
        end: e.end.dateTime || e.end.date
      })),
      oversizedBlocks: calculationResult.oversizedBlocks,
      hasOversizedBlocks: calculationResult.hasOversizedBlocks,
      error,
      needsAttention, // Based ONLY on selected day
    };
    
    results.checked.push(memberResult);
    results.totalUtilization += utilization;

    // Add to needsAttention list ONLY if the SELECTED day exceeds threshold
    if (memberResult.needsAttention) {
      results.needsAttention.push(memberResult);
    }
  }

  results.averageUtilization = (results.totalUtilization / TEAM_MEMBERS.length).toFixed(1);
  return results;
}

// Calculate utilization and detect oversized blocks
function calculateUtilizationForDay(events) {
  const TOTAL_BLOCKS = 14; 
  const BLOCK_DURATION_MS = 30 * 60 * 1000;
  const MAX_BLOCK_DURATION_MS = 60 * 60 * 1000; // 60 minutes max

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
  const oversizedBlocks = []; // Track blocks longer than 60 minutes
  
  workingEvents.forEach(event => {
    const start = new Date(event.start.dateTime);
    const end = new Date(event.end.dateTime);
    const durationMs = end.getTime() - start.getTime();
    const durationMinutes = Math.round(durationMs / (60 * 1000));
    
    // Check if block is longer than 60 minutes
    if (durationMs > MAX_BLOCK_DURATION_MS) {
      oversizedBlocks.push({
        summary: event.summary || 'Untitled Event',
        start: start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        end: end.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        duration: durationMinutes
      });
    }
    
    let currentBlockTime = new Date(start.getTime());
    
    while(currentBlockTime.getTime() < end.getTime()) {
        const hour = currentBlockTime.getHours();
        const minute = currentBlockTime.getMinutes();
        
// NEW WORKING RANGE: 7:00 AM → 6:00 PM
    if (hour >= 7 && hour < 18 && (hour < 12 || hour >= 14)) {            
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
  const utilization = parseFloat(((finalFilledBlocks / TOTAL_BLOCKS) * 100).toFixed(1));
  
  return {
    utilization,
    oversizedBlocks,
    hasOversizedBlocks: oversizedBlocks.length > 0
  };
}

// REPORT GENERATION LOGIC

/**
 * Gets a list of the last N working days (excluding today).
 */
function getReportDates(days) {
    const reportDates = [];
    let currentDate = new Date();
    currentDate.setDate(currentDate.getDate() - 1); // Start checking from yesterday

    while (reportDates.length < days) {
        const dayOfWeek = currentDate.getDay();
        
        // Skip Sunday (0) and Saturday (6)
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            reportDates.push(new Date(currentDate));
        }
        
        currentDate.setDate(currentDate.getDate() - 1);
    }

    return reportDates.reverse();
}

/**
 * Checks a single member's calendar for a single day and returns the compliance status.
 */
async function checkCalendarForDate(calendar, memberEmail, date) {
    const threshold = parseInt(process.env.THRESHOLD) || 30;
    
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
        const calculationResult = calculateUtilizationForDay(events);
        const emptyPercentage = 100 - calculationResult.utilization;
        
        return emptyPercentage > threshold ? 'Yes' : 'No';

    } catch (error) {
        console.error(`Error checking calendar for ${memberEmail} on ${formatDate(date)}: ${error.message}`);
        return 'Error'; 
    }
}

/**
 * Generates the full CSV report.
 */
async function generateReport(calendar, days) {
    const reportDates = getReportDates(days);
    const complianceData = {};

    console.log(`Generating report for ${reportDates.length} working days...`);

    for (const member of TEAM_MEMBERS) {
        for (const date of reportDates) {
            const dateKey = formatDate(date);
            
            if (!complianceData[dateKey]) {
                complianceData[dateKey] = {};
            }
            
            const status = await checkCalendarForDate(calendar, member.email, date);
            complianceData[dateKey][member.email] = status;
        }
    }

    const memberNames = TEAM_MEMBERS.map(m => m.name.replace(/"/g, '""'));
    let csv = `"Date",${memberNames.join(',')}\n`;

    const sortedDates = Object.keys(complianceData).sort((a, b) => new Date(a) - new Date(b));

    for (const dateKey of sortedDates) {
        const dateData = complianceData[dateKey];
        
        let row = `"${dateKey}"`;

        for (const member of TEAM_MEMBERS) {
            const status = dateData[member.email] || 'Error';
            row += `,${status}`;
        }
        
        csv += `${row}\n`;
    }

    return csv;
}

// Scheduled daily check
cron.schedule('0 9 * * *', async () => {
  if (!tokens) {
    console.log('⚠️ Skipping scheduled check - not authenticated');
    return;
  }

  console.log('🔍 Running scheduled calendar check...');
  
  try {
    oauth2Client.setCredentials(tokens);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const results = await checkAllCalendars(calendar, new Date());
    
    console.log(`✓ Check complete: ${results.needsAttention.length} members need attention`);
  } catch (error) {
    console.error('✗ Scheduled check failed:', error.message);
  }
}, {
  timezone: "America/Bogota"
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Calendar Monitor running on http://localhost:${PORT}`);
  console.log(`📅 Monitoring ${TEAM_MEMBERS.length} team members`);
  console.log(`⏰ Daily checks scheduled for 9 AM Colombia time\n`);
  console.log(`📊 Report Generation available at /api/generate-report?days=N`);
});
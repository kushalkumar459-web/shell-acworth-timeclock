/**
 * Shell_Acworth Employee Time Clock - Google Apps Script
 * 
 * This script handles all backend operations for the time clock system.
 * Deploy as a Web App to use with the mobile frontend.
 */

// ============ CONFIGURATION ============
const CONFIG = {
  // Work location (21 Golf Crest Dr, Acworth, GA 30101)
  WORK_LATITUDE: 34.0659,
  WORK_LONGITUDE: -84.6769,
  
  // Geofence radius in meters
  GEOFENCE_RADIUS: 100,
  
  // Default hourly rate
  DEFAULT_RATE: 15,
  
  // Sheet names
  SHEETS: {
    TIME_LOG: 'TimeLog',
    EMPLOYEES: 'Employees',
    WEEKLY_PAYROLL: 'WeeklyPayroll'
  }
};

// ============ WEB APP HANDLERS ============

/**
 * Handle GET requests (for testing)
 */
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: 'ok',
    message: 'Shell_Acworth Time Clock API is running'
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Handle POST requests from the mobile app
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    let result;
    
    switch (data.action) {
      case 'checkIn':
        result = recordCheckIn(data);
        break;
      case 'checkOut':
        result = recordCheckOut(data);
        break;
      case 'verifyEmployee':
        result = verifyEmployee(data);
        break;
      case 'getStatus':
        result = getEmployeeStatus(data);
        break;
      case 'getWeeklyReport':
        result = getWeeklyReport(data);
        break;
      default:
        result = { success: false, error: 'Unknown action' };
    }
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ============ EMPLOYEE FUNCTIONS ============

/**
 * Verify employee credentials
 */
function verifyEmployee(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEETS.EMPLOYEES);
  const employees = sheet.getDataRange().getValues();
  
  for (let i = 1; i < employees.length; i++) {
    if (employees[i][0] == data.employeeId && employees[i][2] == data.pin) {
      return {
        success: true,
        employee: {
          id: employees[i][0],
          name: employees[i][1],
          rate: employees[i][3] || CONFIG.DEFAULT_RATE
        }
      };
    }
  }
  
  return { success: false, error: 'Invalid Employee ID or PIN' };
}

/**
 * Get employee's current check-in status
 */
function getEmployeeStatus(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEETS.TIME_LOG);
  const logs = sheet.getDataRange().getValues();
  
  // Find the last action for this employee
  let lastAction = null;
  let lastTime = null;
  
  for (let i = logs.length - 1; i >= 1; i--) {
    if (logs[i][1] == data.employeeId) {
      lastAction = logs[i][3];
      lastTime = logs[i][0];
      break;
    }
  }
  
  const isCheckedIn = lastAction === 'CHECK_IN';
  
  return {
    success: true,
    isCheckedIn: isCheckedIn,
    lastAction: lastAction,
    lastTime: lastTime ? new Date(lastTime).toISOString() : null
  };
}

// ============ CHECK IN/OUT FUNCTIONS ============

/**
 * Record a check-in
 */
function recordCheckIn(data) {
  // Verify location
  const locationValid = isWithinGeofence(data.latitude, data.longitude);
  
  if (!locationValid) {
    return {
      success: false,
      error: 'You are not at the work location. Please move closer to check in.',
      distance: calculateDistance(
        data.latitude, data.longitude,
        CONFIG.WORK_LATITUDE, CONFIG.WORK_LONGITUDE
      )
    };
  }
  
  // Check if already checked in
  const status = getEmployeeStatus(data);
  if (status.isCheckedIn) {
    return {
      success: false,
      error: 'You are already checked in. Please check out first.'
    };
  }
  
  // Record the check-in
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEETS.TIME_LOG);
  const timestamp = new Date();
  
  sheet.appendRow([
    timestamp,
    data.employeeId,
    data.employeeName,
    'CHECK_IN',
    data.latitude,
    data.longitude,
    'YES'
  ]);
  
  return {
    success: true,
    message: 'Checked in successfully!',
    timestamp: timestamp.toISOString()
  };
}

/**
 * Record a check-out
 */
function recordCheckOut(data) {
  // Verify location
  const locationValid = isWithinGeofence(data.latitude, data.longitude);
  
  if (!locationValid) {
    return {
      success: false,
      error: 'You are not at the work location. Please move closer to check out.',
      distance: calculateDistance(
        data.latitude, data.longitude,
        CONFIG.WORK_LATITUDE, CONFIG.WORK_LONGITUDE
      )
    };
  }
  
  // Check if checked in
  const status = getEmployeeStatus(data);
  if (!status.isCheckedIn) {
    return {
      success: false,
      error: 'You are not checked in. Please check in first.'
    };
  }
  
  // Record the check-out
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEETS.TIME_LOG);
  const timestamp = new Date();
  
  sheet.appendRow([
    timestamp,
    data.employeeId,
    data.employeeName,
    'CHECK_OUT',
    data.latitude,
    data.longitude,
    'YES'
  ]);
  
  // Calculate hours worked this session
  const checkInTime = new Date(status.lastTime);
  const hoursWorked = (timestamp - checkInTime) / (1000 * 60 * 60);
  
  return {
    success: true,
    message: 'Checked out successfully!',
    timestamp: timestamp.toISOString(),
    hoursWorked: hoursWorked.toFixed(2)
  };
}

// ============ LOCATION FUNCTIONS ============

/**
 * Check if coordinates are within the geofence
 */
function isWithinGeofence(lat, lng) {
  const distance = calculateDistance(lat, lng, CONFIG.WORK_LATITUDE, CONFIG.WORK_LONGITUDE);
  return distance <= CONFIG.GEOFENCE_RADIUS;
}

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in meters
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}

// ============ PAYROLL FUNCTIONS ============

/**
 * Calculate weekly payroll
 * Run this manually or set up a weekly trigger
 */
function calculateWeeklyPayroll() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const timeLog = ss.getSheetByName(CONFIG.SHEETS.TIME_LOG);
  const employees = ss.getSheetByName(CONFIG.SHEETS.EMPLOYEES);
  const payroll = ss.getSheetByName(CONFIG.SHEETS.WEEKLY_PAYROLL);
  
  // Get the Monday of the current week
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  monday.setHours(0, 0, 0, 0);
  
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  
  // Get all time logs
  const logs = timeLog.getDataRange().getValues();
  
  // Get employee data
  const empData = employees.getDataRange().getValues();
  const employeeMap = {};
  for (let i = 1; i < empData.length; i++) {
    employeeMap[empData[i][0]] = {
      name: empData[i][1],
      rate: empData[i][3] || CONFIG.DEFAULT_RATE
    };
  }
  
  // Calculate hours per employee
  const hoursWorked = {};
  let currentCheckIn = {};
  
  for (let i = 1; i < logs.length; i++) {
    const timestamp = new Date(logs[i][0]);
    const empId = logs[i][1];
    const action = logs[i][3];
    
    // Only process logs from this week
    if (timestamp < monday || timestamp > sunday) continue;
    
    if (action === 'CHECK_IN') {
      currentCheckIn[empId] = timestamp;
    } else if (action === 'CHECK_OUT' && currentCheckIn[empId]) {
      const hours = (timestamp - currentCheckIn[empId]) / (1000 * 60 * 60);
      hoursWorked[empId] = (hoursWorked[empId] || 0) + hours;
      delete currentCheckIn[empId];
    }
  }
  
  // Write to payroll sheet
  const weekLabel = Utilities.formatDate(monday, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  
  for (const empId in hoursWorked) {
    const emp = employeeMap[empId];
    if (emp) {
      const totalHours = hoursWorked[empId].toFixed(2);
      const totalPay = (hoursWorked[empId] * emp.rate).toFixed(2);
      
      payroll.appendRow([
        weekLabel,
        empId,
        emp.name,
        totalHours,
        emp.rate,
        totalPay
      ]);
    }
  }
  
  return { success: true, message: 'Payroll calculated for week of ' + weekLabel };
}

/**
 * Get weekly report for an employee
 */
function getWeeklyReport(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const timeLog = ss.getSheetByName(CONFIG.SHEETS.TIME_LOG);
  
  // Get the Monday of the current week
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  monday.setHours(0, 0, 0, 0);
  
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  
  const logs = timeLog.getDataRange().getValues();
  
  let totalHours = 0;
  let currentCheckIn = null;
  const sessions = [];
  
  for (let i = 1; i < logs.length; i++) {
    const timestamp = new Date(logs[i][0]);
    const empId = logs[i][1];
    const action = logs[i][3];
    
    if (empId != data.employeeId) continue;
    if (timestamp < monday || timestamp > sunday) continue;
    
    if (action === 'CHECK_IN') {
      currentCheckIn = timestamp;
    } else if (action === 'CHECK_OUT' && currentCheckIn) {
      const hours = (timestamp - currentCheckIn) / (1000 * 60 * 60);
      totalHours += hours;
      sessions.push({
        date: Utilities.formatDate(currentCheckIn, Session.getScriptTimeZone(), 'EEE MM/dd'),
        checkIn: Utilities.formatDate(currentCheckIn, Session.getScriptTimeZone(), 'HH:mm'),
        checkOut: Utilities.formatDate(timestamp, Session.getScriptTimeZone(), 'HH:mm'),
        hours: hours.toFixed(2)
      });
      currentCheckIn = null;
    }
  }
  
  return {
    success: true,
    weekOf: Utilities.formatDate(monday, Session.getScriptTimeZone(), 'yyyy-MM-dd'),
    totalHours: totalHours.toFixed(2),
    sessions: sessions
  };
}

// ============ TRIGGERS ============

/**
 * Set up automatic weekly payroll calculation
 * Run this function once to set up the trigger
 */
function setupWeeklyPayrollTrigger() {
  // Delete existing triggers
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'calculateWeeklyPayroll') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // Create new trigger - runs every Sunday at 11 PM
  ScriptApp.newTrigger('calculateWeeklyPayroll')
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.SUNDAY)
    .atHour(23)
    .create();
    
  return { success: true, message: 'Weekly payroll trigger set up for Sunday 11 PM' };
}

// ============ UTILITY FUNCTIONS ============

/**
 * Test function - run this to verify setup
 */
function testSetup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = [CONFIG.SHEETS.TIME_LOG, CONFIG.SHEETS.EMPLOYEES, CONFIG.SHEETS.WEEKLY_PAYROLL];
  
  const results = [];
  sheets.forEach(name => {
    const sheet = ss.getSheetByName(name);
    results.push({
      name: name,
      exists: sheet !== null
    });
  });
  
  Logger.log('Setup test results:');
  Logger.log(JSON.stringify(results, null, 2));
  
  return results;
}

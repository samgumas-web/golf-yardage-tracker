// GolfYards — Google Apps Script backend
// ─────────────────────────────────────────────────────────────
// SETUP (one time):
//   1. Open your Google Sheet
//   2. Extensions → Apps Script → paste this entire file → Save
//   3. Deploy → New deployment → Web app
//      Execute as: Me
//      Who has access: Anyone
//   4. Click Deploy → copy the /exec URL
//   5. In the GolfYards app (Holes tab → Google Sheets Sync) paste the URL
//
// Tabs created automatically: Training Data, Profiles, Shots, Clubs, Course Holes
//
// ALL traffic uses GET (works cross-origin without CORS preflight issues).
// Writes: ?action=write&type=<type>&data=<JSON>
// Reads:  ?action=course_holes&courseId=<id>

function doGet(e) {
  try {
    const action = e.parameter.action;
    const ss     = SpreadsheetApp.getActiveSpreadsheet();

    // ── Writes ────────────────────────────────────────────────
    if (action === 'write') {
      const type = e.parameter.type;
      const data = JSON.parse(e.parameter.data);
      if      (type === 'training')     syncTraining(ss, data);
      else if (type === 'profile')      syncProfile(ss, data);
      else if (type === 'shot')         syncShot(ss, data);
      else if (type === 'club')         syncClub(ss, data);
      else if (type === 'course_holes') syncCourseHoles(ss, data);
      return jsonOut({ ok: true });
    }

    // ── Reads ─────────────────────────────────────────────────
    if (action === 'course_holes') {
      const courseId = e.parameter.courseId;
      const sheet    = ss.getSheetByName('Course Holes');
      if (!sheet) return jsonOut(null);
      const rows = sheet.getDataRange().getValues();
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] === courseId) {
          return jsonOut({ courseId: rows[i][0], courseName: rows[i][1], updatedAt: rows[i][2], holes: JSON.parse(rows[i][3]) });
        }
      }
      return jsonOut(null);
    }

    return jsonOut({ ok: false, err: 'unknown action' });
  } catch (err) {
    return jsonOut({ ok: false, err: err.message });
  }
}

// ── Tab writers ───────────────────────────────────────────────

function syncTraining(ss, d) {
  const headers = ['Timestamp','User Email','Type','Rot (dps)','Acc (m/s²)','Stable (s)'];
  appendRow(ss, 'Training Data', headers, [d.timestamp, d.user_email, d.type, d.rot_dps, d.acc_ms2, d.stable_secs]);
}

function syncProfile(ss, d) {
  appendRow(ss, 'Profiles', ['Timestamp','Email','Created'], [d.timestamp, d.email, d.created]);
}

function syncShot(ss, d) {
  const headers = ['Timestamp','User Email','Club','Yards','Hole','Shot Date'];
  appendRow(ss, 'Shots', headers, [d.timestamp, d.user_email, d.club, d.yards, d.hole, d.shot_date]);
}

function syncClub(ss, d) {
  const headers = ['Timestamp','User Email','Club Name','Manual Yards','Avg Yards','Shot Count'];
  appendRow(ss, 'Clubs', headers, [d.timestamp, d.user_email, d.club_name, d.manual_yards, d.avg_yards, d.shot_count]);
}

function syncCourseHoles(ss, d) {
  const headers = ['Course ID','Course Name','Updated At','Holes JSON'];
  let sheet = ss.getSheetByName('Course Holes');
  if (!sheet) {
    sheet = ss.insertSheet('Course Holes');
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, 4).setFontWeight('bold').setBackground('#1a472a').setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  }
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === d.courseId) {
      sheet.getRange(i + 1, 1, 1, 4).setValues([[d.courseId, d.courseName, d.updatedAt, d.holesJson]]);
      return;
    }
  }
  sheet.appendRow([d.courseId, d.courseName, d.updatedAt, d.holesJson]);
}

// ── Helpers ───────────────────────────────────────────────────

function appendRow(ss, tabName, headers, row) {
  let sheet = ss.getSheetByName(tabName);
  if (!sheet) {
    sheet = ss.insertSheet(tabName);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#1a472a').setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  }
  sheet.appendRow(row);
}

function jsonOut(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

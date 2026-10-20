/**
 * Booking admin for the court booking website - Google Apps Script web app.
 *
 * Lets the website's /admin page read and update the booked-slots sheet, but
 * only for someone who knows the admin PIN. The PIN lives in this script's
 * properties (on Google's side), never in the website.
 *
 * SETUP (once, about 5 minutes) - full steps in the README, "Admin page":
 *  1. Open the booked-slots Google Sheet > Extensions > Apps Script.
 *  2. Replace everything in Code.gs with this file and click Save.
 *  3. Project Settings (gear) > Script properties > Add property:
 *       ADMIN_PIN = a PIN of at least 6 characters that only staff know.
 *  4. Deploy > New deployment > type "Web app":
 *       Execute as: Me    Who has access: Anyone
 *     Authorize when asked, then copy the Web app URL (ends in /exec).
 *  5. Put that URL in Vercel as VITE_ADMIN_SCRIPT_URL and redeploy the site.
 * After editing this script later: Deploy > Manage deployments > Edit > New version.
 */

var HEADERS = ["Court", "Date", "Start", "End", "Status", "Reference"];
var STATUSES = ["Held", "Confirmed", "Cancelled"];
var MAX_FAILED_PINS = 10;
var LOCKOUT_SECONDS = 15 * 60;

/* ----------------------------- web app entry ----------------------------- */

function doGet() {
  return json_({ ok: true, service: "booking-admin" });
}

function doPost(e) {
  var req;
  try {
    req = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ ok: false, code: "bad_request", error: "Bad request." });
  }

  var cache = CacheService.getScriptCache();
  var failed = Number(cache.get("failed_pins") || 0);
  if (failed >= MAX_FAILED_PINS) {
    return json_({ ok: false, code: "locked", error: "Too many wrong PINs. Try again in 15 minutes." });
  }
  var pin = PropertiesService.getScriptProperties().getProperty("ADMIN_PIN");
  if (!pin || String(pin).length < 6) {
    return json_({
      ok: false,
      code: "setup",
      error: "The admin PIN isn't set up. In Apps Script, add ADMIN_PIN (6+ characters) under Project Settings > Script properties.",
    });
  }
  if (!safeEqual_(String(req.pin || ""), String(pin))) {
    cache.put("failed_pins", String(failed + 1), LOCKOUT_SECONDS);
    return json_({ ok: false, code: "auth", error: "Wrong PIN." });
  }
  cache.remove("failed_pins");

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sheet = getSheet_();
    if (req.action === "list") return json_({ ok: true, rows: listRows_(sheet) });
    if (req.action === "add") return json_(addRow_(sheet, req.booking || {}));
    if (req.action === "setStatus") return json_(setStatus_(sheet, req.row, req.fingerprint, req.status));
    return json_({ ok: false, code: "bad_request", error: "Unknown action." });
  } catch (err) {
    return json_({ ok: false, code: "error", error: String((err && err.message) || err) });
  } finally {
    lock.releaseLock();
  }
}

/* ------------------------------ sheet access ----------------------------- */

function getSheet_() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  }
  return sheet;
}

function headerIndex_(sheet) {
  var header = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getDisplayValues()[0];
  return indexHeaders(header);
}

function readAll_(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  return sheet.getRange(2, 1, lastRow - 1, Math.max(sheet.getLastColumn(), HEADERS.length)).getDisplayValues();
}

function listRows_(sheet) {
  return rowsFromValues(readAll_(sheet), headerIndex_(sheet));
}

function addRow_(sheet, booking) {
  var idx = headerIndex_(sheet);
  var problem = validateBooking(booking);
  if (problem) return { ok: false, code: "invalid", error: problem };
  var rows = rowsFromValues(readAll_(sheet), idx);
  var dup = findActiveReference(rows, booking.reference);
  if (dup) return { ok: false, code: "duplicate", error: "This booking reference is already in the schedule.", conflict: dup };
  var clash = findConflict(rows, booking);
  if (clash && !booking.force) {
    return { ok: false, code: "conflict", error: "This overlaps another booking.", conflict: clash };
  }
  var width = Math.max(sheet.getLastColumn(), HEADERS.length);
  var values = [];
  for (var c = 0; c < width; c++) values.push("");
  values[idx.court] = booking.court;
  values[idx.date] = booking.date;
  values[idx.start] = booking.start;
  values[idx.end] = booking.end;
  values[idx.status] = booking.status;
  values[idx.reference] = booking.reference || "";
  var rowNumber = sheet.getLastRow() + 1;
  var range = sheet.getRange(rowNumber, 1, 1, width);
  range.setNumberFormat("@"); // keep dates/times as typed text
  range.setValues([values]);
  return { ok: true, row: rowNumber };
}

function setStatus_(sheet, row, fingerprint, status) {
  if (STATUSES.indexOf(status) < 0) return { ok: false, code: "invalid", error: "Unknown status." };
  row = Number(row);
  if (!(row >= 2 && row <= sheet.getLastRow())) return { ok: false, code: "stale", error: "That row no longer exists. Refresh." };
  var idx = headerIndex_(sheet);
  var width = Math.max(sheet.getLastColumn(), HEADERS.length);
  var current = rowsFromValues([sheet.getRange(row, 1, 1, width).getDisplayValues()[0]], idx, row)[0];
  if (fingerprintOf(current) !== fingerprint) {
    return { ok: false, code: "stale", error: "The sheet changed since you loaded it. Refresh and try again." };
  }
  if (status !== "Cancelled") {
    var others = listRows_(sheet).filter(function (r) { return r.row !== row; });
    var clash = findConflict(others, current);
    if (clash) return { ok: false, code: "conflict", error: "Another active booking now uses this time.", conflict: clash };
  }
  var cell = sheet.getRange(row, idx.status + 1);
  cell.setNumberFormat("@");
  cell.setValue(status);
  return { ok: true };
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function safeEqual_(a, b) {
  var diff = a.length ^ b.length;
  for (var i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

/* ------------------- pure helpers (unit-tested in the app) ------------------- */

function indexHeaders(header) {
  var find = function (name) {
    for (var i = 0; i < header.length; i++) if (String(header[i]).trim().toLowerCase() === name) return i;
    return -1;
  };
  var idx = { court: find("court"), date: find("date"), start: find("start"), end: find("end"), status: find("status"), reference: find("reference") };
  for (var key in idx) {
    if (idx[key] < 0) throw new Error("The sheet's first row must have these headers: " + HEADERS.join(", ") + ".");
  }
  return idx;
}

function rowsFromValues(values, idx, firstRow) {
  var start = firstRow || 2;
  var rows = [];
  for (var i = 0; i < values.length; i++) {
    var v = values[i];
    var r = {
      row: start + i,
      court: String(v[idx.court] || "").trim(),
      date: String(v[idx.date] || "").trim(),
      start: String(v[idx.start] || "").trim(),
      end: String(v[idx.end] || "").trim(),
      status: String(v[idx.status] || "").trim(),
      reference: String(v[idx.reference] || "").trim(),
    };
    if (r.court || r.date || r.start || r.end || r.status || r.reference) rows.push(r);
  }
  return rows;
}

function fingerprintOf(r) {
  return [r.court, r.date, r.start, r.end, r.reference].join("|");
}

function validateBooking(b) {
  if (!b || typeof b !== "object") return "Missing booking.";
  if (!/^[A-Za-z0-9 -]{1,40}$/.test(String(b.court || ""))) return "Choose a court.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(b.date || ""))) return "Date must look like 2026-10-24.";
  if (!/^\d{2}:\d{2}$/.test(String(b.start || "")) || !/^\d{2}:\d{2}$/.test(String(b.end || ""))) return "Times must look like 18:00.";
  if (timeToMinutes(b.end) <= timeToMinutes(b.start)) return "End time must be after the start time.";
  if (STATUSES.indexOf(b.status) < 0 || b.status === "Cancelled") return "Status must be Held or Confirmed.";
  if (b.reference && !/^[A-Za-z0-9-]{1,24}$/.test(String(b.reference))) return "Reference can only contain letters, numbers and dashes.";
  return null;
}

function isActive(r) {
  return !/cancel|releas|unavailable|void|reject|declin/i.test(r.status || "");
}

function courtKey(value) {
  var v = String(value || "").trim().toLowerCase();
  var digits = v.match(/\d+/);
  return digits ? digits[0] : v;
}

function normalizeDate(value) {
  var v = String(value || "").trim();
  var m = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return m[1] + "-" + pad2(m[2]) + "-" + pad2(m[3]);
  m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return m[3] + "-" + pad2(m[1]) + "-" + pad2(m[2]);
  return v.toLowerCase();
}

function pad2(n) {
  return String(n).length === 1 ? "0" + n : String(n);
}

function timeToMinutes(value) {
  var m = String(value || "").trim().toLowerCase().match(/^(\d{1,2})(?::(\d{2}))?(?::\d{2})?\s*(am|pm)?$/);
  if (!m) return NaN;
  var h = Number(m[1]);
  var min = Number(m[2] || 0);
  if (m[3] === "am" && h === 12) h = 0;
  if (m[3] === "pm" && h !== 12) h += 12;
  return h * 60 + min;
}

function findActiveReference(rows, reference) {
  var ref = String(reference || "").trim().toUpperCase();
  if (!ref) return null;
  for (var i = 0; i < rows.length; i++) {
    if (isActive(rows[i]) && rows[i].reference.toUpperCase() === ref) return rows[i];
  }
  return null;
}

/** Returns the first active row that overlaps the booking on the same court and date, or null. */
function findConflict(rows, b) {
  var start = timeToMinutes(b.start);
  var end = timeToMinutes(b.end);
  if (end === 0) end = 24 * 60;
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    if (!isActive(r) || courtKey(r.court) !== courtKey(b.court) || normalizeDate(r.date) !== normalizeDate(b.date)) continue;
    var rs = timeToMinutes(r.start);
    var re = timeToMinutes(r.end);
    if (re === 0) re = 24 * 60;
    if (start < re && end > rs) return r;
  }
  return null;
}

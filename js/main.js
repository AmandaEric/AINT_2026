/*
 * ============================================================
 * main.js - START-UP (load last)
 * Runs once everything else has loaded: sets up the timer display,
 * disables the question buttons, and starts the admin page.
 * ============================================================
 */

// ==========================================
// MAIN: runs last, after every other file has loaded
// ==========================================

updateTimerDisplay();

setQuestionButtonsEnabled(false);

initAdminPage();

console.log("AINT script loaded successfully.");

// ✅ Reference the correct object populated by start/fetch
if (typeof exam !== "undefined" && exam.testQuestions) {
    console.log("Saved questions:", exam.testQuestions);
}
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

console.log("Saved questions:", state.questions);
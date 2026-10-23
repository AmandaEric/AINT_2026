
/*
 * proctoring.js
 * First version of AINT's free proctoring system.
 *
 * Detects:
 * - Leaving the exam tab
 * - Returning to the exam tab
 * - Exiting fullscreen
 *
 * Events are stored in the browser for now.
 * We will connect them to the backend and MySQL next.
 */

window.aintProctoringEvents = [];

let proctoringActive = false;

function recordProctoringEvent(type, details = "") {
    if (!proctoringActive) return;

    const event = {
        type: type,
        details: details,
        timestamp: new Date().toISOString()
    };

    window.aintProctoringEvents.push(event);

    console.warn("AINT Proctoring Event:", event);
}

function startProctoring() {
    if (proctoringActive) return;

    proctoringActive = true;
    window.aintProctoringEvents = [];

    console.log("AINT proctoring started.");
}

function stopProctoring() {
    proctoringActive = false;

    console.log(
        "AINT proctoring stopped. Events:",
        window.aintProctoringEvents
    );
}

// Detect when the student leaves or returns to the exam tab.
document.addEventListener("visibilitychange", () => {
    if (!proctoringActive) return;

    if (document.hidden) {
        recordProctoringEvent(
            "TAB_HIDDEN",
            "Student left or hid the exam tab."
        );
    } else {
        recordProctoringEvent(
            "TAB_VISIBLE",
            "Student returned to the exam tab."
        );
    }
});

// Detect when the student exits fullscreen.
document.addEventListener("fullscreenchange", () => {
    if (!proctoringActive) return;

    if (!document.fullscreenElement) {
        recordProctoringEvent(
            "FULLSCREEN_EXIT",
            "Exam is no longer in fullscreen."
        );
    }
});

// Make the functions available to student-exam.js.
window.startProctoring = startProctoring;
window.stopProctoring = stopProctoring;

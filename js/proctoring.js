/*
 * proctoring.js
 * AINT's browser-based proctoring system.
 *
 * Detects:
 * - Leaving the browser window (WINDOW_BLUR)
 * - Returning to the browser window (WINDOW_FOCUS)
 * - Exiting fullscreen (FULLSCREEN_EXIT)
 *
 * Approved and unauthorized website monitoring will be handled
 * by the AINT Chrome extension.
 *
 * The extension will compare visited URLs against the approved
 * websites saved for the student's test.
 */

window.aintProctoringEvents = [];

let proctoringActive = false;

// How long the window must stay unfocused before it is flagged.
// The pause also lets a tab switch be recognised (see below), and
// ignores a very quick flicker of focus. Raise it for fewer flags.
const WINDOW_BLUR_DELAY_MS = 400;

let blurTimer = null;
let windowBlurRecorded = false;
let proctoringPausedUntil = 0;

async function sendProctoringEvent(event) {
    if (!exam.testCode) {
        console.warn("Cannot save proctoring event: no test code.");
        return;
    }

    try {
        const response = await fetch(
            `${BACKEND_URL}/api/tests/${encodeURIComponent(exam.testCode)}/proctoring-events`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    type: event.type,
                    details: event.details,
                    timestamp: event.timestamp,
                    attemptId: exam.attemptId
                })
            }
        );

        if (!response.ok) {
            console.error(
                "Could not save proctoring event:",
                response.status
            );
        }
    } catch (error) {
        console.error("Proctoring event connection error:", error);
    }
}

function recordProctoringEvent(type, details = "") {
    if (!proctoringActive) return;

    const event = {
        type: type,
        details: details,
        timestamp: new Date().toISOString()
    };

    window.aintProctoringEvents.push(event);

    console.warn("AINT Proctoring Event:", event);
    sendProctoringEvent(event);
}

function startProctoring() {
    if (proctoringActive) return;

    proctoringActive = true;
    window.aintProctoringEvents = [];

    windowBlurRecorded = false;
    clearTimeout(blurTimer);
    blurTimer = null;
    windowNotMaximizedRecorded = false;
    clearInterval(sizeCheckTimer);
    sizeCheckTimer = setInterval(checkWindowSize, 1000);

    console.log("AINT proctoring started.");
}

function stopProctoring() {
    proctoringActive = false;

    clearTimeout(blurTimer);
    blurTimer = null;
    windowBlurRecorded = false;
    clearInterval(sizeCheckTimer);
    sizeCheckTimer = null;
    showMaximizeBanner(false);

    console.log(
        "AINT proctoring stopped. Events:",
        window.aintProctoringEvents
    );
}

// Optional: ignore window-focus changes for a few seconds.
// Browser pop-ups (confirm and alert boxes, the microphone permission
// prompt) can take focus from the page. Call this just before one:
//   pauseProctoring(5000);
function pauseProctoring(milliseconds = 3000) {
    proctoringPausedUntil = Date.now() + milliseconds;
}
// document.addEventListener("visibilitychange", () => {
//     if (!proctoringActive) return;
//     if (document.hidden) {
//         recordProctoringEvent("TAB_HIDDEN", "Student switched to another tab.");
//     } else {
//         recordProctoringEvent("TAB_VISIBLE", "Student returned to the exam tab.");
//     }
// });


// ------------------------------------------
// WINDOW: the whole browser window lost or regained focus
// ------------------------------------------
window.addEventListener("blur", () => {
    if (!proctoringActive) return;

    clearTimeout(blurTimer);

    blurTimer = setTimeout(() => {
        blurTimer = null;

        if (!proctoringActive) return;

        // Switching tabs also blurs the window. TAB_HIDDEN already
        // covers that, so do not flag it a second time.
        if (document.hidden) return;

        // Focus came back before the delay ended.
        if (document.hasFocus()) return;

        // A pop-up was expected (see pauseProctoring).
        if (Date.now() < proctoringPausedUntil) return;

        if (windowBlurRecorded) return;
        windowBlurRecorded = true;

        recordProctoringEvent(
            "WINDOW_BLUR",
            "Student left the exam window (clicked another window or app)."
        );
    }, WINDOW_BLUR_DELAY_MS);
});

window.addEventListener("focus", () => {
    clearTimeout(blurTimer);
    blurTimer = null;

    if (!proctoringActive) return;

    // Only report a return if the departure was reported.
    if (windowBlurRecorded) {
        windowBlurRecorded = false;

        recordProctoringEvent(
            "WINDOW_FOCUS",
            "Student returned to the exam window."
        );
    }
});

// ------------------------------------------
// FULLSCREEN: the student exited fullscreen
// ------------------------------------------
document.addEventListener("fullscreenchange", () => {
    if (!proctoringActive) return;
    if (!window.aintFullscreenRequired) return;   // approved sites: fullscreen not required

    if (!document.fullscreenElement) {
        recordProctoringEvent(
            "FULLSCREEN_EXIT",
            "Exam is no longer in fullscreen."
        );
    }
});
// ------------------------------------------
// WINDOW SIZE: the browser window must stay full size
// ------------------------------------------
const MAXIMIZE_TOLERANCE_PX = 40;

let windowNotMaximizedRecorded = false;
let sizeCheckTimer = null;

function isWindowMaximized() {
    return (
        window.outerWidth  >= screen.availWidth  - MAXIMIZE_TOLERANCE_PX &&
        window.outerHeight >= screen.availHeight - MAXIMIZE_TOLERANCE_PX
    );
}

function showMaximizeBanner(show) {
    let banner = document.getElementById("aint-maximize-banner");

    if (!show) {
        if (banner) banner.remove();
        return;
    }

    if (!banner) {
        banner = document.createElement("div");
        banner.id = "aint-maximize-banner";
        banner.textContent =
            "Your window is not full size. Please maximize it now. This has been reported.";
        banner.style.cssText =
            "position:fixed;top:0;left:0;right:0;z-index:99999;padding:12px;" +
            "background:#c62828;color:#fff;text-align:center;font:16px Arial,sans-serif;";
        document.body.appendChild(banner);
    }
}

function checkWindowSize() {
    if (!proctoringActive) return;

    const maximized = isWindowMaximized();

    if (!maximized && !windowNotMaximizedRecorded) {
        windowNotMaximizedRecorded = true;
        showMaximizeBanner(true);
        recordProctoringEvent(
            "WINDOW_NOT_MAXIMIZED",
            `Browser window is not full size (${window.outerWidth}x${window.outerHeight} on a ${screen.availWidth}x${screen.availHeight} screen).`
        );
    } else if (maximized && windowNotMaximizedRecorded) {
        windowNotMaximizedRecorded = false;
        showMaximizeBanner(false);
        recordProctoringEvent(
            "WINDOW_MAXIMIZED",
            "Student made the window full size again."
        );
    }
}

window.addEventListener("resize", checkWindowSize);
window.isWindowMaximized = isWindowMaximized;

// Make the functions available to student-exam.js.
window.startProctoring = startProctoring;
window.stopProctoring = stopProctoring;
window.pauseProctoring = pauseProctoring;
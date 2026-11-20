
/*
 * AINT background.js
 *
 * Monitors active Chrome tabs during AINT exams.
 *
 * Improvements:
 * - Does not flag websites just because they were already open.
 * - Checks the active tab in the focused Chrome window.
 * - Detects when a student switches Chrome windows.
 * - Detects navigation to unauthorized websites.
 * - Ignores approved websites.
 * - Records unauthorized activity with the correct attempt ID.
 */

const activeExams = new Map();

const AINT_HOSTS = new Set([
    "aint2026-production.up.railway.app"
]);

/* ==========================================
   RECEIVE EXAM START AND STOP MESSAGES
========================================== */

chrome.runtime.onMessage.addListener((message, sender) => {

    const examTabId = sender.tab?.id;

    if (examTabId === undefined) return;

    if (message?.type === "AINT_PROCTORING_START") {

        const payload = message.payload || {};

        if (!payload.testCode || !payload.attemptId) {
            console.error("AINT: Missing exam information.");
            return;
        }

        activeExams.set(examTabId, {
            backendUrl: payload.backendUrl || "",
            testCode: payload.testCode,
            attemptId: payload.attemptId,

            // Remember the window containing the AINT exam.
            examWindowId: sender.tab.windowId,

            allowedTabs: Array.isArray(payload.allowedTabs)
                ? payload.allowedTabs
                : [],

            reportedUrls: new Set()
        });

        console.log(
            "AINT monitoring started:",
            payload.testCode,
            "Attempt:",
            payload.attemptId,
            "Exam window:",
            sender.tab.windowId
        );

        /*
         * IMPORTANT:
         * Do not scan every open tab here.
         * Existing background tabs are not automatically
         * considered unauthorized activity.
         */

    }

    if (message?.type === "AINT_PROCTORING_STOP") {

        activeExams.delete(examTabId);

        console.log(
            "AINT monitoring stopped for tab:",
            examTabId
        );
    }
});


/* ==========================================
   CHECK WHETHER A WEBSITE IS APPROVED
========================================== */

function isApprovedUrl(url, allowedTabs) {

    try {

        const visited = new URL(url);

        // Always allow the AINT exam website.
        if (AINT_HOSTS.has(visited.hostname)) {
            return true;
        }

        return allowedTabs.some((approved) => {

            const approvedUrl = String(
                approved.allowed_url || ""
            ).trim();

            if (!approvedUrl) return false;

            let approvedParsed;

            try {
                approvedParsed = new URL(
                    approvedUrl.includes("://")
                        ? approvedUrl
                        : `https://${approvedUrl}`
                );
            } catch {
                return false;
            }

            const matchType = String(
                approved.match_type || "EXACT"
            ).toUpperCase();

            if (matchType === "DOMAIN") {

                return (
                    visited.hostname === approvedParsed.hostname ||
                    visited.hostname.endsWith(
                        "." + approvedParsed.hostname
                    )
                );
            }

            if (matchType === "PREFIX") {

                const normalizedPrefix = approvedUrl.includes("://")
                    ? approvedUrl
                    : `https://${approvedUrl}`;

                return url.startsWith(normalizedPrefix);
            }

            // Default: exact hostname, origin, and path.
            return (
                visited.origin === approvedParsed.origin &&
                visited.pathname.replace(/\/$/, "") ===
                approvedParsed.pathname.replace(/\/$/, "")
            );
        });

    } catch {
        return false;
    }
}


/* ==========================================
   RECORD AN UNAUTHORIZED WEBSITE
========================================== */

async function recordUnauthorized(exam, url, tabId) {

    const key = `${tabId}:${url}`;

    // Do not record the same URL repeatedly.
    if (exam.reportedUrls.has(key)) return;

    exam.reportedUrls.add(key);

    try {

        const response = await fetch(
            `${exam.backendUrl}/api/tests/${encodeURIComponent(exam.testCode)}/proctoring-events`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    type: "UNAUTHORIZED_WEBSITE_ACTIVE",
                    details: `Unauthorized website accessed: ${url}`,
                    url: url,
                    timestamp: new Date().toISOString(),
                    attemptId: exam.attemptId
                })
            }
        );

        if (!response.ok) {

            exam.reportedUrls.delete(key);

            console.error(
                "AINT: Failed to record website.",
                response.status
            );

            return;
        }

        console.log(
            "AINT: Unauthorized website recorded:",
            url
        );

    } catch (error) {

        exam.reportedUrls.delete(key);

        console.error(
            "AINT: Could not contact the server.",
            error
        );
    }
}


/* ==========================================
   CHECK ONE ACTIVE TAB
========================================== */

function checkTab(tab) {

    if (!tab || !tab.url || tab.id === undefined) return;

    // Only inspect normal HTTP and HTTPS websites.
    if (
        !tab.url.startsWith("http://") &&
        !tab.url.startsWith("https://")
    ) {
        return;
    }

    // Only inspect the active tab in a focused window.
    if (!tab.active) return;

    for (const [examTabId, exam] of activeExams.entries()) {

        // Never flag the student's own AINT exam tab.
        if (tab.id === examTabId) continue;

        if (isApprovedUrl(tab.url, exam.allowedTabs)) {
            continue;
        }

        recordUnauthorized(
            exam,
            tab.url,
            tab.id
        );
    }
}


/* ==========================================
   CHECK WHETHER A TAB'S WINDOW IS FOCUSED
========================================== */

function checkFocusedTab(tab) {

    if (!tab || tab.windowId === undefined) return;

    chrome.windows.get(tab.windowId, (browserWindow) => {

        if (chrome.runtime.lastError) {
            return;
        }

        // Ignore tabs in background Chrome windows.
        if (!browserWindow || !browserWindow.focused) {
            return;
        }

        checkTab(tab);
    });
}


/* ==========================================
   MONITOR WEBSITE NAVIGATION
========================================== */

// Check when a tab navigates or finishes loading.
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {

    if (changeInfo.url || changeInfo.status === "complete") {
        checkFocusedTab(tab);
    }

});


// Check when the active tab changes within a Chrome window.
chrome.tabs.onActivated.addListener(async (activeInfo) => {

    try {

        const tab = await chrome.tabs.get(activeInfo.tabId);

        checkFocusedTab(tab);

    } catch (error) {

        console.error(
            "AINT: Could not inspect tab.",
            error
        );
    }

});


/* ==========================================
   MONITOR CHROME WINDOW SWITCHING
========================================== */

// Detect when the student brings another Chrome window
// to the foreground.
chrome.windows.onFocusChanged.addListener((windowId) => {

    // Ignore when no Chrome window is focused.
    if (windowId === chrome.windows.WINDOW_ID_NONE) {
        return;
    }

    chrome.tabs.query(
        {
            active: true,
            windowId: windowId
        },
        (tabs) => {

            if (chrome.runtime.lastError) {
                return;
            }

            if (tabs.length > 0) {
                checkTab(tabs[0]);
            }

        }
    );

});


/* ==========================================
   REMOVE EXAM TRACKING WHEN AINT CLOSES
========================================== */

chrome.tabs.onRemoved.addListener((tabId) => {

    activeExams.delete(tabId);

    console.log(
        "AINT: Removed exam tracking for tab:",
        tabId
    );

});

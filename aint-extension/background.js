
/*
 * AINT background.js
 *
 * Monitors browser tabs during active AINT exams.
 * Ignores approved websites.
 * Records unauthorized website activity.
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
            allowedTabs: Array.isArray(payload.allowedTabs)
                ? payload.allowedTabs
                : [],
            reportedUrls: new Set()
        });

        console.log(
            "AINT monitoring started:",
            payload.testCode,
            "Attempt:",
            payload.attemptId
        );

        checkAllTabs(true);
    }

    if (message?.type === "AINT_PROCTORING_STOP") {

        activeExams.delete(examTabId);

        console.log("AINT monitoring stopped for tab:", examTabId);
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

                return url.startsWith(approvedUrl);
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

async function recordUnauthorized(exam, url, tabId, eventType) {

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
                    type: eventType,
                    details: `Unauthorized website visited: ${url}`,
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

        console.log("AINT: Unauthorized website recorded:", url);

    } catch (error) {

        exam.reportedUrls.delete(key);

        console.error(
            "AINT: Could not contact the server.",
            error
        );
    }
}

/* ==========================================
   CHECK ONE BROWSER TAB
========================================== */

function checkTab(tab, initialScan = false) {

    if (!tab || !tab.url || tab.id === undefined) return;

    // Only inspect normal HTTP and HTTPS websites.
    if (
        !tab.url.startsWith("http://") &&
        !tab.url.startsWith("https://")
    ) {
        return;
    }

    for (const [examTabId, exam] of activeExams.entries()) {

        // Never flag the student's own AINT exam tab.
        if (tab.id === examTabId) continue;

        if (!isApprovedUrl(tab.url, exam.allowedTabs)) {

            const eventType = initialScan
                ? "UNAUTHORIZED_TAB_ALREADY_OPEN"
                : "UNAUTHORIZED_WEBSITE_ACTIVE";

            recordUnauthorized(
                exam,
                tab.url,
                tab.id,
                eventType
            );
        }
    }
}


/* ==========================================
   CHECK ALL OPEN TABS
========================================== */

function checkAllTabs(initialScan = false) {

    chrome.tabs.query({}, (tabs) => {

        for (const tab of tabs) {
            checkTab(tab, initialScan);
        }

    });
}


/* ==========================================
   MONITOR WEBSITE NAVIGATION
========================================== */

// Check when a tab navigates or finishes loading.
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {

    if (changeInfo.url || changeInfo.status === "complete") {
        checkTab(tab);
    }

});


// Check when the student switches tabs.
chrome.tabs.onActivated.addListener(async (activeInfo) => {

    try {

        const tab = await chrome.tabs.get(activeInfo.tabId);

        checkTab(tab);

    } catch (error) {

        console.error("AINT: Could not inspect tab.", error);

    }

});


// Remove exam tracking when the AINT tab closes.
chrome.tabs.onRemoved.addListener((tabId) => {

    activeExams.delete(tabId);

});

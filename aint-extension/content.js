
/*
 * AINT content.js
 * Connects the AINT page to the Chrome extension.
 */

window.addEventListener("message", (event) => {

    if (event.source !== window) return;
    if (event.origin !== window.location.origin) return;

    const message = event.data;

    if (!message || message.source !== "AINT_PAGE") return;

    // Respond to the installation check.
    if (message.type === "AINT_EXTENSION_CHECK") {
        window.postMessage(
            {
                source: "AINT_EXTENSION",
                type: "AINT_EXTENSION_READY"
            },
            window.location.origin
        );

        return;
    }

    // Forward exam START and STOP messages.
    if (
        message.type === "AINT_PROCTORING_START" ||
        message.type === "AINT_PROCTORING_STOP"
    ) {
        chrome.runtime.sendMessage({
            type: message.type,
            payload: {
                ...(message.payload || {}),
                backendUrl:
                    message.payload?.backendUrl || window.location.origin
            }
        });
    }
});

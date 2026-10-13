/*
 * ============================================================
 * admin-login.js - ADMIN LOGIN
 * Email + one-time-code login, the saved login token, adminFetch()
 * (fetch with the token attached), screen switching, and logout.
 * ============================================================
 */

// ==========================================
// ADMIN: LOGIN (email + one-time code)
// ==========================================

// The login token lives in sessionStorage, so it is
// forgotten when the tab is closed
const admin = {
    token: sessionStorage.getItem("adminToken"),
    email: sessionStorage.getItem("adminEmail"),
    pendingEmail: null
};


function setLoginMessage(text) {
    if (el.loginMessage) {
        el.loginMessage.textContent = text;
    }
}


// After login there are three screens, and only one shows at a time:
//   "menu"   = choose: create a new test OR view/edit an existing one
//   "create" = enter test name + questions
//   "tests"  = my tests, with results and editing
function showAdminScreen(name) {

    if (el.adminMenu) {
        el.adminMenu.hidden = name !== "menu";
    }

    if (el.createScreen) {
        el.createScreen.hidden = name !== "create";
    }

    if (el.testsScreen) {
        el.testsScreen.hidden = name !== "tests";
    }
}


// Show the admin page OR the login screen
function showAdminPanel(loggedIn) {

    if (el.adminLogin) {
        el.adminLogin.hidden = loggedIn;
    }

    if (el.adminPanel) {
        el.adminPanel.hidden = !loggedIn;
    }

    if (loggedIn) {

        if (el.adminEmailLabel) {
            el.adminEmailLabel.textContent = admin.email;
        }

        // Always land on the menu first
            showAdminScreen("menu");
    }
}


// Empty the results and edit areas
function clearTestViews() {

    if (el.resultsList) {
        el.resultsList.innerHTML = "";
    }

    if (el.editView) {
        el.editView.innerHTML = "";
        el.editView.dataset.code = "";
    }
}


// Show the "enter your email" step or the "enter the code" step
function showLoginStep(step) {

    if (el.loginStepEmail) {
        el.loginStepEmail.hidden = step !== "email";
    }

    if (el.loginStepCode) {
        el.loginStepCode.hidden = step !== "code";
    }
}


// fetch() for admin-only routes: adds the login token
async function adminFetch(path, options) {

    options = options || {};

    const response = await fetch(
        `${BACKEND_URL}${path}`,
        {

            method: options.method || "GET",

            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + admin.token
            },

            body: options.body

        }
    );

    // Logged out or session expired
    if (response.status === 401) {

        logoutAdmin(false);

        setLoginMessage("Your session expired. Please log in again.");

        throw new Error("Your session expired. Please log in again.");
    }

    return response;
}


// Step 1: ask the server to email a code
async function requestLoginCode() {

    const email =
        el.loginEmail
            ? el.loginEmail.value.trim().toLowerCase()
            : "";

    if (email === "") {
        setLoginMessage("Enter your email address.");
        return;
    }

    if (el.sendCodeButton) {
        el.sendCodeButton.disabled = true;
    }

    setLoginMessage("Sending code...");

    try {

        const response = await fetch(
            `${BACKEND_URL}/api/admin/request-code`,
            {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({ email: email })

            }
        );

        const data =
            await response.json().catch(function () { return {}; });

        if (!response.ok) {
            throw new Error(
                data.error || `Server responded with ${response.status}`
            );
        }

        admin.pendingEmail = email;

        if (el.loginSentTo) {
            el.loginSentTo.textContent = email;
        }

        if (el.loginCode) {
            el.loginCode.value = "";
        }

        showLoginStep("code");

        // New admin: a code was just emailed. Returning admin: use the old one.
        setLoginMessage(
            data.status === "existing"
                ? "Welcome back. Enter the code you were emailed when you first signed up."
                : "We emailed you a permanent login code. Enter it below."
        );

        if (el.loginCode) {
            el.loginCode.focus();
        }

    } catch (error) {

        console.error("REQUEST CODE ERROR:", error);

        setLoginMessage(
            error instanceof TypeError
                ? "Could not reach the server. Make sure the backend is running."
                : error.message
        );

    }

    if (el.sendCodeButton) {
        el.sendCodeButton.disabled = false;
    }
}


// Step 2: check the code
async function verifyLoginCode() {

    const code =
        el.loginCode
            ? el.loginCode.value.trim()
            : "";

    if (code === "") {
        setLoginMessage("Enter your login code.");
        return;
    }

    if (el.verifyCodeButton) {
        el.verifyCodeButton.disabled = true;
    }

    try {

        const response = await fetch(
            `${BACKEND_URL}/api/admin/verify`,
            {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    email: admin.pendingEmail,
                    code: code
                })

            }
        );

        const data =
            await response.json().catch(function () { return {}; });

        if (!response.ok) {
            throw new Error(
                data.error || `Server responded with ${response.status}`
            );
        }

        admin.token = data.token;
        admin.email = data.email;

        sessionStorage.setItem("adminToken", admin.token);
        sessionStorage.setItem("adminEmail", admin.email);

        setLoginMessage("");

        showAdminPanel(true);

    } catch (error) {

        console.error("VERIFY ERROR:", error);

        setLoginMessage(
            error instanceof TypeError
                ? "Could not reach the server. Make sure the backend is running."
                : error.message
        );

    }

    if (el.verifyCodeButton) {
        el.verifyCodeButton.disabled = false;
    }
}


function logoutAdmin(tellServer) {

    // Invalidate the token on the server too
    if (tellServer && admin.token) {

        fetch(
            `${BACKEND_URL}/api/admin/logout`,
            {
                method: "POST",
                headers: {
                    "Authorization": "Bearer " + admin.token
                }
            }
        ).catch(function () {});

    }

    admin.token = null;
    admin.email = null;
    admin.pendingEmail = null;

    sessionStorage.removeItem("adminToken");
    sessionStorage.removeItem("adminEmail");

    // Clear anything private from the screen
    if (el.myTests) {
        el.myTests.innerHTML = "";
    }

    clearTestViews();

    if (el.createdTest) {
        el.createdTest.innerHTML = "";
    }

    if (el.loginEmail) {
        el.loginEmail.value = "";
    }

    showLoginStep("email");

    showAdminPanel(false);
}


// ------------------------------------------
// BUTTONS
// ------------------------------------------

on(el.sendCodeButton, "click", requestLoginCode);

on(el.verifyCodeButton, "click", verifyLoginCode);

on(el.backToEmailButton, "click", function () {
    setLoginMessage("");
    showLoginStep("email");
});

on(el.logoutButton, "click", function () {
    logoutAdmin(true);
});

// Enter key submits each step
on(el.loginEmail, "keydown", function (event) {
    if (event.key === "Enter") {
        requestLoginCode();
    }
});

on(el.loginCode, "keydown", function (event) {
    if (event.key === "Enter") {
        verifyLoginCode();
    }
});

function initAdminPage() {
    if (!el.adminLogin || !el.adminPanel) return;

    showLoginStep("email");
    showAdminPanel(Boolean(admin.token));
}
/*
 * ============================================================
 * core.js - SHARED FOUNDATION (load first)
 * Helpers (on, escapeHtml), the 'el' object holding every DOM element,
 * BACKEND_URL, shared limits, the shared 'state' and 'exam' objects,
 * and recordAnswer().
 * Every other file depends on this one.
 * ============================================================
 */

// ==========================================
// UTILS: small helpers used everywhere
// ==========================================

// Add an event listener only if the element exists on this page
// (the student page and admin page share the same scripts)
function on(element, eventName, handler) {
    if (element) {
        element.addEventListener(eventName, handler);
    }
}

// Stops question/answer text from being read as HTML
function escapeHtml(text) {
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

// ==========================================
// LIMITS: one place to change them in the browser
// ==========================================

// These must match the limits in server.js
// (MAX_QUESTION_LENGTH, MAX_GUIDELINES_LENGTH, DEFAULT_POINTS, MAX_POINTS).
// The server is the one that really enforces them.
const AINT_LIMITS = {
    defaultPoints: 10,
    maxPoints: 100,
    maxQuestionLength: 1000,
    maxGuidelinesLength: 5000
};

// ==========================================
// ELEMENTS: every DOM element the app uses
// ==========================================

const el = {

    // Timer
    timer: document.querySelector(".timer"),
    startButton: document.querySelector(".start"),
    nextButton: document.querySelector("#next-button"),

    // Question
    questionText: document.querySelector(".question-text"),
    questionImage: document.getElementById("question-image"),

    // Student response
    listenButton: document.querySelector(".listen"),
    responseBox: document.querySelector(".response"),
    wordCount: document.getElementById("wordCount"),

    // AI evaluation
    evaluateButton: document.querySelector(".evaluate"),
    evaluationBox: document.querySelector(".evaluation"),

    // Avatar
    mouth: document.getElementById("ai-avatar"),

    // Admin question lists
    objectiveList: document.getElementById("objectiveList"),
    semiList: document.getElementById("semiList"),
    qualitativeList: document.getElementById("qualitativeList"),

    // Clear all questions
    clearQuestions: document.querySelector(".clearQuestion"),

    // Admin question inputs
    objectiveInput: document.getElementById("objectiveInput"),
    semiInput: document.getElementById("semiInput"),
    qualitativeInput: document.getElementById("qualitativeInput"),
    grading_guidelines: document.getElementById("grading_guidelines"),

    // Admin points and image inputs (one pair per category)
    objectivePoints: document.getElementById("objectivePoints"),
    semiPoints: document.getElementById("semiPoints"),
    qualitativePoints: document.getElementById("qualitativePoints"),
    objectiveImage: document.getElementById("objectiveImage"),
    semiImage: document.getElementById("semiImage"),
    qualitativeImage: document.getElementById("qualitativeImage"),

    // Admin add buttons
    objectiveAdd: document.getElementById("objectiveAdd"),
    semiAdd: document.getElementById("semiAdd"),
    qualitativeAdd: document.getElementById("qualitativeAdd"),
    guidelinesAdd: document.getElementById("guidelinesAdd"),

    // Student exam information
    studentName: document.querySelector(".student-name"),
    testCodeInput: document.querySelector(".test-code"),
    examInfo: document.querySelector(".exam-info"),

    // AI avatar container
    avatarContainer: document.querySelector(".avatar-container"),

    // Admin: login screen and page
    adminLogin: document.getElementById("adminLogin"),
    adminPanel: document.getElementById("adminPanel"),
    loginStepEmail: document.getElementById("loginStepEmail"),
    loginStepCode: document.getElementById("loginStepCode"),
    loginEmail: document.getElementById("loginEmail"),
    loginCode: document.getElementById("loginCode"),
    loginSentTo: document.getElementById("loginSentTo"),
    loginMessage: document.getElementById("loginMessage"),
    sendCodeButton: document.getElementById("sendCodeButton"),
    verifyCodeButton: document.getElementById("verifyCodeButton"),
    backToEmailButton: document.getElementById("backToEmailButton"),
    logoutButton: document.getElementById("logoutButton"),
    adminEmailLabel: document.getElementById("adminEmailLabel"),

    // Admin: create a test, my tests, results
    testName: document.getElementById("testName"),
    createTest: document.getElementById("createTest"),
    createdTest: document.getElementById("createdTest"),
    myTests: document.getElementById("myTests"),
    resultsList: document.getElementById("resultsList"),
    editView: document.getElementById("editView"),

    // Admin: the three screens after login, and the buttons between them
    adminMenu: document.getElementById("adminMenu"),
    createScreen: document.getElementById("createScreen"),
    testsScreen: document.getElementById("testsScreen"),
    menuCreateButton: document.getElementById("menuCreateButton"),
    menuViewButton: document.getElementById("menuViewButton"),
    createBackButton: document.getElementById("createBackButton"),
    testsBackButton: document.getElementById("testsBackButton"),
};

// ==========================================
// STATE: config and data shared between files
// ==========================================

// On your own computer the page talks to the local server.
// On a host such as Railway, the page and the API share an address,
// so the URL is empty and requests stay on the same site.
const BACKEND_URL =
    location.hostname === "127.0.0.1" || location.hostname === "localhost"
        ? "http://localhost:3000"
        : "";

// Older versions of the admin page saved a question draft in the browser.
// admin-tests.js now keeps its draft in memory, so this is only kept
// because main.js still reads state.questions. Bad saved data is ignored.
function loadSavedQuestions() {
    try {
        const saved = JSON.parse(localStorage.getItem("aintQuestions"));

        if (saved && typeof saved === "object") {
            return saved;
        }
    } catch {
        // fall through to the empty default
    }

    return {
        objective: [],
        semi: [],
        qualitative: []
    };
}

const state = {

    // Timer
    seconds: 0,
    timerInterval: null,
    testRunning: false,

    // Legacy admin draft (see loadSavedQuestions above)
    questions: loadSavedQuestions(),

    // Questions currently available to the student.
    // Each one is { id, category, text, points, image }.
    selectedQuestions: [],

    // Speech recognition
    recognition: null,
    isListening: false
};

// Current question category
let currentCategory = null;


// ------------------------------------------
// EXAM LOG (everything sent to the AI for grading)
// ------------------------------------------

// log                = one entry per question asked
//                      { id, category, question, points,
//                        exchanges: [{ question, answer }] }
// current            = the entry for the question on screen right now
// testCode           = the code the student entered
// testQuestions      = that test's questions, sent by the server.
//                      Each is { id, text, points, image }.
// gradingGuidelines  = the teacher's grading guidelines for this test
// timerEnabled       = true if the test has a time limit
// timeLimitSeconds   = the time limit, in seconds (0 when there is none)
// lastRecordedAnswer = stops the same answer being saved twice
// finishing          = true while the exam is being submitted
const exam = {
    log: [],
    current: null,
    submitted: false,
    finishing: false,
    lastRecordedAnswer: null,
    testCode: null,

    // Allowed attempts
    attemptId: null,
    studentName: "",
    attemptNumber: null,
    maxAttempts: null,

    gradingGuidelines: "",
    timerEnabled: false,
    timeLimitSeconds: 0,
    testQuestions: {
        objective: [],
        semi: [],
        qualitative: []
    }
};

// Save one answer under the current question.
// "question" is whatever is on screen, which is the follow-up
// question if the AI asked one.
function recordAnswer(question, answer) {

    if (!exam.current || !answer) {
        return;
    }

    const last =
        exam.current.exchanges[
            exam.current.exchanges.length - 1
        ];

    // Don't save the same answer twice
    if (last && last.question === question && last.answer === answer) {
        return;
    }

    exam.current.exchanges.push({
        question: question,
        answer: answer
    });
}
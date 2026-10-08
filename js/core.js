/*
 * ============================================================
 * core.js - SHARED FOUNDATION (load first)
 * Helpers (on, escapeHtml), the 'el' object holding every DOM element,
 * BACKEND_URL, the shared 'state' and 'exam' objects, and recordAnswer().
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
// ELEMENTS: every DOM element the app uses
// ==========================================

const el = {

    // Timer
    timer: document.querySelector(".timer"),
    startButton: document.querySelector(".start"),

    // Question category buttons
    objective: document.querySelector(".objective"),
    semiButton: document.querySelector(".semi"),
    qualatativeButton: document.querySelector(".qualitative"),

    // Question
    questionText: document.querySelector(".question-text"),

    // Student response
    listenButton: document.querySelector(".listen"),
    responseBox: document.querySelector(".response"),

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

    // Admin add buttons
    objectiveAdd: document.getElementById("objectiveAdd"),
    semiAdd: document.getElementById("semiAdd"),
    qualitativeAdd: document.getElementById("qualitativeAdd"),

    studentName: document.querySelector(".student-name"),

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

const BACKEND_URL = "http://localhost:3000";

const state = {

    // Timer
    seconds: 0,
    timerInterval: null,
    testRunning: false,

    // Question bank (the admin's draft, saved in the browser)
    questions: JSON.parse(
        localStorage.getItem("aintQuestions")
    ) || {
        objective: [],
        semi: [],
        qualitative: []
    },

    // Questions currently available to student
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

// log           = one entry per question asked
//                 { category, question, exchanges: [{ question, answer }] }
// current       = the entry for the question on screen right now
// testCode      = the code the student entered
// testQuestions = that test's questions, sent by the server
const exam = {
    log: [],
    current: null,
    submitted: false,
    testCode: null,
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
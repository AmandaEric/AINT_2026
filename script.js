// // ==========================================
// // ELEMENTS
// // ==========================================

// const el = {

//     // Timer
//     timer: document.querySelector(".timer"),
//     startButton: document.querySelector(".start"),

//     // Question category buttons
//     objective: document.querySelector(".objective"),
//     semiButton: document.querySelector(".semi"),
//     qualatativeButton: document.querySelector(".qualitative"),

//     // Question
//     questionText: document.querySelector(".question-text"),

//     // Student response
//     listenButton: document.querySelector(".listen"),
//     responseBox: document.querySelector(".response"),

//     // AI evaluation
//     evaluateButton: document.querySelector(".evaluate"),
//     evaluationBox: document.querySelector(".evaluation"),

//     // Avatar
//     mouth: document.getElementById("ai-avatar"),

//     // Admin question lists
//     objectiveList: document.getElementById("objectiveList"),
//     semiList: document.getElementById("semiList"),
//     qualitativeList: document.getElementById("qualitativeList"),

//     // Clear all questions
//     clearQuestions: document.querySelector(".clearQuestion"),

//     // Admin question inputs
//     objectiveInput: document.getElementById("objectiveInput"),
//     semiInput: document.getElementById("semiInput"),
//     qualitativeInput: document.getElementById("qualitativeInput"),

//     // Admin add buttons
//     objectiveAdd: document.getElementById("objectiveAdd"),
//     semiAdd: document.getElementById("semiAdd"),
//     qualitativeAdd: document.getElementById("qualitativeAdd"),

//     studentName: document.querySelector(".student-name"),

//     // Admin: login screen and page
//     adminLogin: document.getElementById("adminLogin"),
//     adminPanel: document.getElementById("adminPanel"),
//     loginStepEmail: document.getElementById("loginStepEmail"),
//     loginStepCode: document.getElementById("loginStepCode"),
//     loginEmail: document.getElementById("loginEmail"),
//     loginCode: document.getElementById("loginCode"),
//     loginSentTo: document.getElementById("loginSentTo"),
//     loginMessage: document.getElementById("loginMessage"),
//     sendCodeButton: document.getElementById("sendCodeButton"),
//     verifyCodeButton: document.getElementById("verifyCodeButton"),
//     backToEmailButton: document.getElementById("backToEmailButton"),
//     logoutButton: document.getElementById("logoutButton"),
//     adminEmailLabel: document.getElementById("adminEmailLabel"),

//     // Admin: create a test, my tests, results
//     testName: document.getElementById("testName"),
//     createTest: document.getElementById("createTest"),
//     createdTest: document.getElementById("createdTest"),
//     myTests: document.getElementById("myTests"),
//     resultsList: document.getElementById("resultsList"),
//     editView: document.getElementById("editView"),

//     // Admin: the three screens after login, and the buttons between them
//     adminMenu: document.getElementById("adminMenu"),
//     createScreen: document.getElementById("createScreen"),
//     testsScreen: document.getElementById("testsScreen"),
//     menuCreateButton: document.getElementById("menuCreateButton"),
//     menuViewButton: document.getElementById("menuViewButton"),
//     createBackButton: document.getElementById("createBackButton"),
//     testsBackButton: document.getElementById("testsBackButton"),
// };

// // ==========================================
// // HELPER FUNCTION
// // ==========================================

// function on(element, eventName, handler) {

//     if (element) {
//         element.addEventListener(eventName, handler);
//     }

// }

// // ==========================================
// // BACKEND
// // ==========================================

// const BACKEND_URL = "http://localhost:3000";

// // ==========================================
// // STATE
// // ==========================================

// const state = {

//     // Timer
//     seconds: 0,
//     timerInterval: null,
//     testRunning: false,

//     // Question bank
//     questions: JSON.parse(
//         localStorage.getItem("aintQuestions")
//     ) || {
//         objective: [],
//         semi: [],
//         qualitative: []
//     },

//     // Questions currently available to student
//     selectedQuestions: [],

//     // Speech recognition
//     recognition: null,
//     isListening: false
// };


// // Current question category
// let currentCategory = null;


// // ==========================================
// // EXAM LOG (everything sent to the AI for grading)
// // ==========================================

// // log     = one entry per question asked
// //           { category, question, exchanges: [{ question, answer }] }
// // current = the entry for the question on screen right now
// // testCode      = the code the student entered
// // testQuestions = that test's questions, sent by the server
// const exam = {
//     log: [],
//     current: null,
//     submitted: false,
//     testCode: null,
//     testQuestions: {
//         objective: [],
//         semi: [],
//         qualitative: []
//     }
// };


// // Save one answer under the current question.
// // "question" is whatever is on screen, which is the follow-up
// // question if the AI asked one.
// function recordAnswer(question, answer) {

//     if (!exam.current || !answer) {
//         return;
//     }

//     const last =
//         exam.current.exchanges[
//             exam.current.exchanges.length - 1
//         ];

//     // Don't save the same answer twice
//     if (last && last.question === question && last.answer === answer) {
//         return;
//     }

//     exam.current.exchanges.push({
//         question: question,
//         answer: answer
//     });
// }

// // ==========================================
// // TIMER
// // ==========================================

// function updateTimerDisplay() {

//     if (!el.timer) {
//         return;
//     }

//     const minutes = Math.floor(
//         state.seconds / 60
//     );

//     const seconds = state.seconds % 60;

//     el.timer.textContent =
//         `${minutes}:${String(seconds).padStart(2, "0")}`;
// }


// function startTimer() {

//     state.testRunning = true;

//     if (el.startButton) {
//         el.startButton.textContent = "Stop Test";
//     }

//     setQuestionButtonsEnabled(true);

//     // Allow the student to type an answer
//     if (el.responseBox) {
//         el.responseBox.disabled = false;
//     }

//     // Allow speech recognition
//     if (el.listenButton) {
//         el.listenButton.disabled = false;
//     }

//     state.timerInterval = setInterval(() => {

//         state.seconds++;

//         updateTimerDisplay();

//     }, 1000);
// }


// function stopTimer() {

//     state.testRunning = false;

//     if (el.startButton) {
//         el.startButton.textContent = "Start Test";
//     }

//     clearInterval(state.timerInterval);

//     setQuestionButtonsEnabled(false);

//     if (
//         state.isListening &&
//         state.recognition
//     ) {
//         state.recognition.stop();
//     }

//     if (el.listenButton) {
//         el.listenButton.disabled = true;
//     }

//     if (el.evaluateButton) {
//         el.evaluateButton.disabled = true;
//     }
// }


// function setQuestionButtonsEnabled(enabled) {

//     if (el.objective) {
//         el.objective.disabled = !enabled;
//     }

//     if (el.semiButton) {
//         el.semiButton.disabled = !enabled;
//     }

//     if (el.qualatativeButton) {
//         el.qualatativeButton.disabled = !enabled;
//     }
// }


// // Start / Stop button
// on(
//     el.startButton,
//     "click",
//     async () => {

//         // ---------- START ----------
//         if (!state.testRunning) {

//             if (
//                 el.studentName &&
//                 !el.studentName.value.trim()
//             ) {
//                 alert("Please enter your name first.");
//                 return;
//             }

//             // Ask for the test code
//             const code = (
//                 prompt("Enter your test code:") || ""
//             ).trim().toUpperCase();

//             if (!code) {
//                 return;
//             }

//             // Check the code and get that test's questions
//             el.startButton.disabled = true;

//             try {

//                 const response = await fetch(
//                     `${BACKEND_URL}/api/tests/${encodeURIComponent(code)}/start`,
//                     { method: "POST" }
//                 );

//                 if (response.status === 404) {

//                     alert("That test code was not found. Check it and try again.");

//                     return;
//                 }

//                 if (!response.ok) {

//                     throw new Error(
//                         `Server responded with ${response.status}`
//                     );

//                 }

//                 const data = await response.json();

//                 exam.testCode = code;
//                 exam.testQuestions = data.questions;

//             } catch (error) {

//                 console.error("START ERROR:", error);

//                 alert("Could not reach the server. Make sure the backend is running.");

//                 return;

//             } finally {

//                 el.startButton.disabled = false;

//             }

//             // Fresh attempt
//             exam.log = [];
//             exam.current = null;
//             exam.submitted = false;

//             state.seconds = 0;
//             state.selectedQuestions = [];

//             updateTimerDisplay();

//             startTimer();

//             return;
//         }


//         // ---------- STOP = FINISH AND SUBMIT ----------
//         if (
//             !confirm(
//                 "Finish the exam and submit it for grading?"
//             )
//         ) {
//             return;
//         }

//         // Save an answer that was typed or spoken
//         // but never sent with the Evaluate button
//         if (el.responseBox && el.questionText) {

//             recordAnswer(
//                 el.questionText.textContent,
//                 el.responseBox.value.trim()
//             );

//         }

//         stopTimer();

//         // Stop the avatar mid-sentence
//         if ("speechSynthesis" in window) {
//             speechSynthesis.cancel();
//         }

//         await submitExam();

//     }
// );


// // ==========================================
// // SUBMIT EXAM FOR GRADING
// // ==========================================

// async function submitExam() {

//     if (exam.submitted) {
//         return;
//     }

//     if (exam.log.length === 0) {

//         if (el.evaluationBox) {

//             el.evaluationBox.innerHTML =
//                 "<p>No questions were answered, so nothing was submitted.</p>";

//         }

//         return;
//     }

//     if (el.evaluationBox) {

//         el.evaluationBox.innerHTML =
//             "<p>Submitting your exam for grading...</p>";

//     }

//     try {

//         const response = await fetch(
//             `${BACKEND_URL}/api/tests/${encodeURIComponent(exam.testCode)}/submit`,
//             {

//                 method: "POST",

//                 headers: {
//                     "Content-Type": "application/json"
//                 },

//                 body: JSON.stringify({

//                     studentName:
//                         el.studentName
//                             ? el.studentName.value.trim()
//                             : "",

//                     durationSeconds:
//                         state.seconds,

//                     log:
//                         exam.log

//                 })

//             }
//         );

//         if (!response.ok) {

//             throw new Error(
//                 `Server responded with ${response.status}`
//             );

//         }

//         exam.submitted = true;

//         if (el.questionText) {

//             el.questionText.textContent =
//                 "The exam is finished.";

//         }

//         if (el.evaluationBox) {

//             el.evaluationBox.innerHTML = `

//                 <h4>Exam submitted</h4>

//                 <p>
//                     Thank you. Your professor will share your results.
//                 </p>

//             `;

//         }

//     } catch (error) {

//         console.error(
//             "SUBMIT ERROR:",
//             error
//         );

//         if (el.evaluationBox) {

//             el.evaluationBox.innerHTML = `

//                 <h4>Submission problem</h4>

//                 <p>
//                     Your exam was not submitted. Keep this page open.
//                 </p>

//                 <button
//                     type="button"
//                     onclick="submitExam()">

//                     Try again

//                 </button>

//             `;

//         }

//     }
// }

// // Make submitExam available
// // to the generated "Try again" button
// window.submitExam =
//     submitExam;


// // ==========================================
// // QUESTION BANK
// // ==========================================


// // Save questions to browser
// function saveQuestions() {

//     localStorage.setItem(
//         "aintQuestions",
//         JSON.stringify(state.questions)
//     );
// }


// // Add a question
// function addQuestion(category, input) {

//     if (!input) {
//         return;
//     }

//     const question = input.value.trim();

//     if (question === "") {

//         alert("Please enter a question.");

//         return;
//     }


//     // Add question
//     state.questions[category].push(question);


//     // Save question
//     saveQuestions();


//     // Clear input
//     input.value = "";


//     // Immediately display question
//     displayQuestions();


//     console.log(
//         "Added question:",
//         question
//     );
// }


// // Delete one question
// function deleteQuestion(category, index) {

//     state.questions[category].splice(
//         index,
//         1
//     );

//     saveQuestions();

//     displayQuestions();
// }


// // Delete all questions
// function clearAllQuestions() {

//     const confirmed = confirm(
//         "Are you sure you want to delete ALL questions?"
//     );

//     if (!confirmed) {
//         return;
//     }


//     state.questions = {

//         objective: [],

//         semi: [],

//         qualitative: []

//     };


//     saveQuestions();

//     displayQuestions();
// }


// // Display all question categories
// function displayQuestions() {

//     displayCategory(
//         el.objectiveList,
//         "objective"
//     );

//     displayCategory(
//         el.semiList,
//         "semi"
//     );

//     displayCategory(
//         el.qualitativeList,
//         "qualitative"
//     );
// }


// // Display one category
// function displayCategory(
//     listElement,
//     category
// ) {

//     if (!listElement) {
//         return;
//     }


//     // Clear current display
//     listElement.innerHTML = "";


//     // Get questions
//     const questions =
//         state.questions[category];


//     // Display each question
//     questions.forEach(
//         (question, index) => {

//             const row =
//                 document.createElement("div");

//             row.className =
//                 "saved-question";


//             row.innerHTML = `

//                 <p>${question}</p>

//                 <button
//                     type="button"
//                     onclick="deleteQuestion('${category}', ${index})">

//                     Delete

//                 </button>

//             `;


//             listElement.appendChild(row);

//         }
//     );
// }


// // Make deleteQuestion available
// // to the generated buttons
// window.deleteQuestion =
//     deleteQuestion;


// // ==========================================
// // ADMIN BUTTONS
// // ==========================================


// // Objective Add
// on(
//     el.objectiveAdd,
//     "click",
//     () => {

//         addQuestion(
//             "objective",
//             el.objectiveInput
//         );

//     }
// );


// // Semi-Objective Add
// on(
//     el.semiAdd,
//     "click",
//     () => {

//         addQuestion(
//             "semi",
//             el.semiInput
//         );

//     }
// );


// // Qualitative Add
// on(
//     el.qualitativeAdd,
//     "click",
//     () => {

//         addQuestion(
//             "qualitative",
//             el.qualitativeInput
//         );

//     }
// );


// // Clear all
// on(
//     el.clearQuestions,
//     "click",
//     clearAllQuestions
// );


// // Display saved questions
// // when page loads
// displayQuestions();


// // ==========================================
// // STUDENT QUESTION SYSTEM
// // ==========================================


// // Add an entire category
// // (uses the questions loaded from the server for this test code)
// function addCategory(category) {

//     const questions =
//         exam.testQuestions[category];


//     if (
//         !questions ||
//         questions.length === 0
//     ) {

//         if (el.questionText) {

//             el.questionText.textContent =
//                 `No questions available in the ${category} category.`;

//         }

//         return;
//     }


//     // Add questions that have not
//     // already been selected
//     questions.forEach(
//         question => {

//             if (
//                 !state.selectedQuestions
//                     .includes(question)
//             ) {

//                 state.selectedQuestions.push(
//                     question
//                 );

//             }

//         }
//     );
// }


// // Ask next question
// function askNextQuestion() {

//     if (!el.questionText) {
//         return;
//     }


//     if (
//         state.selectedQuestions.length === 0
//     ) {

//         el.questionText.textContent =
//             "No more questions available.";

//         return;
//     }


//     // Save an answer that was typed or spoken
//     // for the previous question but never evaluated
//     if (exam.current && el.responseBox) {

//         recordAnswer(
//             el.questionText.textContent,
//             el.responseBox.value.trim()
//         );

//     }


//     // Clear the response box for the new question
//     if (el.responseBox) {
//         el.responseBox.value = "";
//     }


//     // Pick random question
//     const randomIndex =
//         Math.floor(
//             Math.random() *
//             state.selectedQuestions.length
//         );


//     const question =
//         state.selectedQuestions.splice(
//             randomIndex,
//             1
//         )[0];


//     // Start a new entry in the exam log
//     exam.current = {
//         category: currentCategory,
//         question: question,
//         exchanges: []
//     };

//     exam.log.push(exam.current);


//     // Display question
//     el.questionText.textContent =
//         question;


//     // Speak question
//     speakQuestion(question);


//     // Animate mouth
//     // animateMouth(question);


//     // Enable response controls
//     if (el.responseBox) {
//         el.responseBox.disabled = false;
//     }

//     if (el.listenButton) {
//         el.listenButton.disabled = false;
//     }

//     if (el.evaluateButton) {
//         el.evaluateButton.disabled = false;
//     }


//     // Reset evaluation
//     if (el.evaluationBox) {

//         el.evaluationBox.innerHTML =
//             "<p>Waiting for student response...</p>";

//     }
// }


// // Objective button
// on(
//     el.objective,
//     "click",
//     () => {

//         currentCategory =
//             "objective";

//         addCategory(
//             "objective"
//         );

//         askNextQuestion();

//     }
// );


// // Semi-objective button
// on(
//     el.semiButton,
//     "click",
//     () => {

//         currentCategory =
//             "semi";

//         addCategory(
//             "semi"
//         );

//         askNextQuestion();

//     }
// );


// // Qualitative button
// on(
//     el.qualatativeButton,
//     "click",
//     () => {

//         currentCategory =
//             "qualitative";

//         addCategory(
//             "qualitative"
//         );

//         askNextQuestion();

//     }
// );


// // ==========================================
// // TEXT TO SPEECH
// // ==========================================

// let currentUtterance = null;

// function speakQuestion(text) {

//     if (!("speechSynthesis" in window)) {
//         alert("Text-to-speech is not supported by this browser.");
//         return;
//     }

//     speechSynthesis.cancel();

//     const speech = new SpeechSynthesisUtterance(text);
//     speech.rate = 1;
//     speech.pitch = 1;
//     speech.volume = 1;

//     currentUtterance = speech;

//     // Ignore events from an old utterance that got cancelled
//     speech.onstart = function () {
//         if (currentUtterance !== speech) return;
//         startTalkingAnimation(text);
//     };

//     // Fires at each word (where the browser/voice supports it)
//     speech.onboundary = function (event) {
//         if (currentUtterance !== speech) return;
//         handleBoundary(event, text, speech.rate);
//     };

//     speech.onend = function () {
//         if (currentUtterance !== speech) return;
//         stopTalkingAnimation();
//     };

//     speech.onerror = function () {
//         if (currentUtterance !== speech) return;
//         stopTalkingAnimation();
//     };

//     speechSynthesis.speak(speech);
// }
// function normalizeMathForSpeech(text) {
//     return text
//         .replace(/\+/g, " plus ")
//         .replace(/-/g, " minus ")
//         .replace(/\*/g, " times ")
//         .replace(/÷/g, " divided by ")
//         .replace(/\//g, " divided by ")
//         .replace(/=/g, " equals ")
//         .replace(/%/g, " percent ")
//         .replace(/\^/g, " to the power of ")
//         .replace(/√/g, " square root of ")
//         .replace(/\s+/g, " ")
//         .trim();
// }

// // ==========================================
// // MOUTH ANIMATION + BLINKING
// // ==========================================

// const FRAME_PATH = "ai_speech_frames/";

// const FRAMES = {
//     a: FRAME_PATH + "A(ah).png",
//     e: FRAME_PATH + "E(ee).png",
//     i: FRAME_PATH + "I(ee).png",
//     l: FRAME_PATH + "L(el).png",
//     m: FRAME_PATH + "M(mmm).png",
//     o: FRAME_PATH + "O(oh).png",
//     u: FRAME_PATH + "U(oo).png",
//     smile: FRAME_PATH + "smile.png",
//     eyesClosed: FRAME_PATH + "eyes_closed.png",
//     idle: FRAME_PATH + "eyes_open_neutral.png",
// };
// const mouthImg = el.mouth;
// // Preload every frame so there is no flicker the first time one shows
// Object.values(FRAMES).forEach(function (src) {
//     const img = new Image();
//     img.src = src;
// });

// let isTalking = false;
// let mouthTimers = [];      // timeouts for the current word / fallback timeline
// let boundaryMode = false;  // true once the browser sends word-boundary events
// let lastBoundaryTime = 0;
// let lastWordDuration = 300;

// function showFrame(key) {
//     if (mouthImg) {
//         mouthImg.src = FRAMES[key];
//     }
// }

// function clearMouthTimers() {
//     mouthTimers.forEach(clearTimeout);
//     mouthTimers = [];
// }


// // ------------------------------------------
// // LETTERS -> MOUTH SHAPES
// // ------------------------------------------

// // Turns one word into a list of mouth shapes. Sounds that look the
// // same on the lips share a frame:
// //   M  = m, b, p (lips closed)
// //   L  = l, n, t, d, r, th (tongue visible)
// //   U  = oo, w, q (rounded, small)
// //   O  = o, ow, oa, ou, sh, ch (rounded, open)
// //   E  = ee, ea, ie, e
// //   A  = a, ai, ay
// //   I  = i, y
// //   smile = everything else (s, k, f, g, ...)
// function wordToShapes(word) {

//     let w = word.toLowerCase().replace(/[^a-z]/g, "");

//     // Silent trailing "e" (like "make", "time")
//     if (w.length > 3 && w.endsWith("e") && !"aeiouy".includes(w[w.length - 2])) {
//         w = w.slice(0, -1);
//     }

//     const shapes = [];
//     let i = 0;

//     while (i < w.length) {

//         const two = w.substr(i, 2);
//         const c = w[i];
//         let shape;
//         let step = 1;

//         if (["ee", "ea", "ie", "ei"].includes(two)) { shape = "e"; step = 2; }
//         else if (["oo", "ew", "ue"].includes(two))  { shape = "u"; step = 2; }
//         else if (["oa", "ow", "ou"].includes(two))  { shape = "o"; step = 2; }
//         else if (["ai", "ay"].includes(two))        { shape = "a"; step = 2; }
//         else if (two === "th")                      { shape = "l"; step = 2; }
//         else if (["sh", "ch", "zh"].includes(two))  { shape = "o"; step = 2; }
//         else if ("aeiou".includes(c))               { shape = c; }
//         else if (c === "y")                         { shape = i === 0 ? "smile" : "i"; }
//         else if ("wq".includes(c))                  { shape = "u"; }
//         else if ("mbp".includes(c))                 { shape = "m"; }
//         else if ("lntdr".includes(c))               { shape = "l"; }
//         else                                        { shape = "smile"; }

//         // Skip repeats so the mouth doesn't flicker on the same frame
//         if (shapes[shapes.length - 1] !== shape) {
//             shapes.push(shape);
//         }

//         i += step;
//     }

//     return shapes;
// }


// // ------------------------------------------
// // MAIN MODE: sync to word boundaries
// // ------------------------------------------

// function handleBoundary(event, text, rate) {

//     // Some browsers report other boundary types too - only use words
//     if (event.name && event.name !== "word") {
//         return;
//     }

//     // First boundary: the browser supports it, so drop the fallback timeline
//     if (!boundaryMode) {
//         boundaryMode = true;
//     }

//     clearMouthTimers();

//     // Figure out which word is being spoken
//     let word;

//     if (event.charLength) {
//         word = text.substr(event.charIndex, event.charLength);
//     } else {
//         const match = text.slice(event.charIndex).match(/^[\w']+/);
//         word = match ? match[0] : "";
//     }

//     // Use the time since the last word as the estimate for this one
//     const now = performance.now();

//     if (lastBoundaryTime) {
//         lastWordDuration = Math.min(Math.max(now - lastBoundaryTime, 120), 700);
//     }

//     lastBoundaryTime = now;

//     const shapes = wordToShapes(word);

//     if (shapes.length === 0) {
//         return;
//     }

//     // Spread the shapes across the word, but not too fast or too slow
//     const step = Math.min(Math.max(lastWordDuration / shapes.length, 60), 140);

//     shapes.forEach(function (shape, index) {
//         mouthTimers.push(setTimeout(function () {
//             if (isTalking) showFrame(shape);
//         }, index * step));
//     });

//     // Close the mouth briefly at the end of the word; the next
//     // boundary event cancels this if another word follows right away
//     mouthTimers.push(setTimeout(function () {
//         if (isTalking) showFrame("idle");
//     }, shapes.length * step + 30));
// }


// // ------------------------------------------
// // FALLBACK: some voices never send boundary events
// // ------------------------------------------

// function playFallbackTimeline(text) {

//     const SHAPE_MS = 75;
//     const SPACE_MS = 90;
//     const PUNCT_MS = 250;

//     let time = 0;

//     // Split into words and punctuation/spaces, keeping the separators
//     const parts = text.split(/([\s,.;:?!]+)/);

//     parts.forEach(function (part) {

//         if (part === "") return;

//         if (/^[\s,.;:?!]+$/.test(part)) {

//             const pause = /[,.;:?!]/.test(part) ? PUNCT_MS : SPACE_MS;
//             const at = time;

//             mouthTimers.push(setTimeout(function () {
//                 if (isTalking && !boundaryMode) showFrame("idle");
//             }, at));

//             time += pause;
//             return;
//         }

//         wordToShapes(part).forEach(function (shape) {

//             const at = time;

//             mouthTimers.push(setTimeout(function () {
//                 if (isTalking && !boundaryMode) showFrame(shape);
//             }, at));

//             time += SHAPE_MS;
//         });
//     });
// }


// // ------------------------------------------
// // START / STOP TALKING
// // ------------------------------------------

// function startTalkingAnimation(text) {

//     if (!mouthImg) {
//         return;
//     }

//     clearMouthTimers();

//     isTalking = true;
//     boundaryMode = false;
//     lastBoundaryTime = 0;
//     lastWordDuration = 300;

//     // Runs until a real boundary event shows up (then boundaryMode
//     // takes over and this timeline stops updating the image)
//     playFallbackTimeline(text);
// }

// function stopTalkingAnimation() {

//     clearMouthTimers();

//     isTalking = false;
//     boundaryMode = false;

//     showFrame("idle");
// }


// // ------------------------------------------
// // IDLE FACE + BLINKING
// // ------------------------------------------

// showFrame("idle");

// function scheduleBlink() {

//     // Blink every 2.5 - 6 seconds
//     const delay = 2500 + Math.random() * 3500;

//     setTimeout(function () {

//         // Only blink when not talking (mouth frames have their own eyes)
//         if (!isTalking) {

//             showFrame("eyesClosed");

//             setTimeout(function () {
//                 if (!isTalking) showFrame("idle");
//             }, 140);
//         }

//         scheduleBlink();

//     }, delay);
// }

// scheduleBlink();


// // ==========================================
// // SPEECH TO TEXT
// // ==========================================

// const SpeechRecognition =
//     window.SpeechRecognition ||
//     window.webkitSpeechRecognition;


// if (SpeechRecognition) {

//     state.recognition =
//         new SpeechRecognition();


//     state.recognition.continuous =
//         true;


//     state.recognition.interimResults =
//         true;


//     state.recognition.lang =
//         "en-US";


//     state.recognition.onstart =
//         () => {

//             state.isListening =
//                 true;

//             if (el.listenButton) {

//                 el.listenButton.textContent =
//                     "Stop Listening";

//             }

//         };


//     state.recognition.onend =
//         () => {

//             state.isListening =
//                 false;

//             if (el.listenButton) {

//                 el.listenButton.textContent =
//                     "Start Listening";

//             }

//         };


//     state.recognition.onerror = (event) => {

//         console.error("Speech recognition error:", event.error);

//         state.isListening = false;

//         if (el.listenButton) {
//             el.listenButton.textContent = "Start Listening";
//         }

//         if (el.evaluationBox) {
//             el.evaluationBox.innerHTML =
//                 `<p>Speech recognition error: ${event.error}</p>`;
//         }
//     };


//     state.recognition.onresult =
//         (event) => {

//             let finalTranscript =
//                 "";


//             for (
//                 let i = event.resultIndex;
//                 i < event.results.length;
//                 i++
//             ) {

//                 if (
//                     event.results[i].isFinal
//                 ) {

//                     finalTranscript +=
//                         event.results[i][0]
//                             .transcript + " ";

//                 }

//             }


//             if (
//                 finalTranscript &&
//                 el.responseBox
//             ) {

//                 el.responseBox.value +=
//                     finalTranscript;

//             }

//         };

// }


// // Listen button
// on(
//     el.listenButton,
//     "click",
//     () => {

//         if (!state.recognition) {

//             if (el.evaluationBox) {

//                 el.evaluationBox.innerHTML =
//                     "<p>Speech recognition is not supported by this browser. Please type your answer.</p>";

//             }

//             return;
//         }


//         if (state.isListening) {

//             state.recognition.stop();

//         } else {

//             state.recognition.start();

//         }

//     }
// );


// // ==========================================
// // AI EVALUATION
// // ==========================================

// async function handleEvaluate() {

//     const answer =
//         el.responseBox.value.trim();


//     // Make sure student answered
//     if (answer === "") {

//         el.evaluationBox.innerHTML =
//             "<p>Please provide an answer before evaluating.</p>";

//         return;
//     }


//     // Save the question BEFORE
//     // the AI changes it
//     const originalQuestion =
//         el.questionText.textContent;


//     // Record this answer for grading at the end of the exam
//     recordAnswer(
//         originalQuestion,
//         answer
//     );


//     // Show loading
//     el.evaluationBox.innerHTML =
//         "<p>AI is thinking...</p>";


//     el.evaluateButton.disabled =
//         true;


//     try {

//         console.log(
//             "Sending answer to AI..."
//         );


//         const response =
//             await fetch(
//                 `${BACKEND_URL}/api/generate-followup`,
//                 {

//                     method: "POST",

//                     headers: {
//                         "Content-Type":
//                             "application/json"
//                     },

//                     body: JSON.stringify({

//                         originalQuestion:
//                             originalQuestion,

//                         studentResponse:
//                             answer,

//                         category:
//                             currentCategory

//                     })

//                 }
//             );


//         if (!response.ok) {

//             throw new Error(
//                 `Server responded with ${response.status}`
//             );

//         }


//         const data =
//             await response.json();


//         console.log(
//             "AI RESPONSE:",
//             data
//         );


//         // ==================================
//         // FOLLOW-UP QUESTION
//         // ==================================

//         if (
//             data.needsFollowUp &&
//             data.followUpQuestion
//         ) {

//             el.evaluationBox.innerHTML = `

//                 <h4>Follow-up Question</h4>

//                 <p>
//                     ${data.followUpQuestion}
//                 </p>

//             `;


//             // Show follow-up
//             el.questionText.textContent =
//                 data.followUpQuestion;


//             // Clear answer
//             el.responseBox.value =
//                 "";


//             // Speak follow-up
//             speakQuestion(
//                 data.followUpQuestion
//             );


//             // Animate mouth
//             // animateMouth(
//             //     data.followUpQuestion
//             // );

//         }


//         // ==================================
//         // NO FOLLOW-UP
//         // ==================================

//         else {

//             el.evaluationBox.innerHTML = `

//                 <h4>AI Evaluation</h4>

//                 <p>
//                     ${data.evaluation}
//                 </p>

//                 <p>
//                     <strong>Score:</strong>
//                     ${data.score}
//                 </p>

//                 <p>
//                     No follow-up question is needed.
//                 </p>

//             `;

//         }


//     } catch (error) {

//         console.error(
//             "AI ERROR:",
//             error
//         );


//         el.evaluationBox.innerHTML = `

//             <h4>AI Connection Error</h4>

//             <p>
//                 Could not connect to the AI.
//             </p>

//             <p>
//                 Make sure aiGuide.js is running.
//             </p>

//         `;

//     }


//     el.evaluateButton.disabled =
//         false;
// }


// // Evaluate button
// on(
//     el.evaluateButton,
//     "click",
//     handleEvaluate
// );


// // ==========================================
// // ADMIN: LOGIN (email + one-time code)
// // ==========================================

// // Stops question/answer text from being read as HTML
// function escapeHtml(text) {

//     return String(text)
//         .replace(/&/g, "&amp;")
//         .replace(/</g, "&lt;")
//         .replace(/>/g, "&gt;")
//         .replace(/"/g, "&quot;");

// }


// // The login token lives in sessionStorage, so it is
// // forgotten when the tab is closed
// const admin = {
//     token: sessionStorage.getItem("adminToken"),
//     email: sessionStorage.getItem("adminEmail"),
//     pendingEmail: null
// };


// function setLoginMessage(text) {

//     if (el.loginMessage) {
//         el.loginMessage.textContent = text;
//     }

// }


// // After login there are three screens, and only one shows at a time:
// //   "menu"   = choose: create a new test OR view/edit an existing one
// //   "create" = enter test name + questions
// //   "tests"  = my tests, with results and editing
// function showAdminScreen(name) {

//     if (el.adminMenu) {
//         el.adminMenu.hidden = name !== "menu";
//     }

//     if (el.createScreen) {
//         el.createScreen.hidden = name !== "create";
//     }

//     if (el.testsScreen) {
//         el.testsScreen.hidden = name !== "tests";
//     }

// }


// // Show the admin page OR the login screen
// function showAdminPanel(loggedIn) {

//     if (el.adminLogin) {
//         el.adminLogin.hidden = loggedIn;
//     }

//     if (el.adminPanel) {
//         el.adminPanel.hidden = !loggedIn;
//     }

//     if (loggedIn) {

//         if (el.adminEmailLabel) {
//             el.adminEmailLabel.textContent = admin.email;
//         }

//         // Always land on the menu first
//         showAdminScreen("menu");

//     }

// }


// // Empty the results and edit areas
// function clearTestViews() {

//     if (el.resultsList) {
//         el.resultsList.innerHTML = "";
//     }

//     if (el.editView) {
//         el.editView.innerHTML = "";
//         el.editView.dataset.code = "";
//     }

// }


// // Show the "enter your email" step or the "enter the code" step
// function showLoginStep(step) {

//     if (el.loginStepEmail) {
//         el.loginStepEmail.hidden = step !== "email";
//     }

//     if (el.loginStepCode) {
//         el.loginStepCode.hidden = step !== "code";
//     }

// }


// // fetch() for admin-only routes: adds the login token
// async function adminFetch(path, options) {

//     options = options || {};

//     const response = await fetch(
//         `${BACKEND_URL}${path}`,
//         {

//             method: options.method || "GET",

//             headers: {
//                 "Content-Type": "application/json",
//                 "Authorization": "Bearer " + admin.token
//             },

//             body: options.body

//         }
//     );

//     // Logged out or session expired
//     if (response.status === 401) {

//         logoutAdmin(false);

//         setLoginMessage("Your session expired. Please log in again.");

//         throw new Error("Your session expired. Please log in again.");
//     }

//     return response;
// }


// // Step 1: ask the server to email a code
// async function requestLoginCode() {

//     const email =
//         el.loginEmail
//             ? el.loginEmail.value.trim().toLowerCase()
//             : "";

//     if (email === "") {

//         setLoginMessage("Enter your email address.");

//         return;
//     }

//     if (el.sendCodeButton) {
//         el.sendCodeButton.disabled = true;
//     }

//     setLoginMessage("Sending code...");

//     try {

//         const response = await fetch(
//             `${BACKEND_URL}/api/admin/request-code`,
//             {

//                 method: "POST",

//                 headers: {
//                     "Content-Type": "application/json"
//                 },

//                 body: JSON.stringify({ email: email })

//             }
//         );

//         const data =
//             await response.json().catch(function () { return {}; });

//         if (!response.ok) {

//             throw new Error(
//                 data.error || `Server responded with ${response.status}`
//             );

//         }

//         admin.pendingEmail = email;

//         if (el.loginSentTo) {
//             el.loginSentTo.textContent = email;
//         }

//         if (el.loginCode) {
//             el.loginCode.value = "";
//         }

//         showLoginStep("code");

//         setLoginMessage("");

//         if (el.loginCode) {
//             el.loginCode.focus();
//         }

//     } catch (error) {

//         console.error("REQUEST CODE ERROR:", error);

//         setLoginMessage(
//             error instanceof TypeError
//                 ? "Could not reach the server. Make sure the backend is running."
//                 : error.message
//         );

//     }

//     if (el.sendCodeButton) {
//         el.sendCodeButton.disabled = false;
//     }
// }


// // Step 2: check the code
// async function verifyLoginCode() {

//     const code =
//         el.loginCode
//             ? el.loginCode.value.trim()
//             : "";

//     if (code === "") {

//         setLoginMessage("Enter the 6-digit code from your email.");

//         return;
//     }

//     if (el.verifyCodeButton) {
//         el.verifyCodeButton.disabled = true;
//     }

//     try {

//         const response = await fetch(
//             `${BACKEND_URL}/api/admin/verify`,
//             {

//                 method: "POST",

//                 headers: {
//                     "Content-Type": "application/json"
//                 },

//                 body: JSON.stringify({
//                     email: admin.pendingEmail,
//                     code: code
//                 })

//             }
//         );

//         const data =
//             await response.json().catch(function () { return {}; });

//         if (!response.ok) {

//             throw new Error(
//                 data.error || `Server responded with ${response.status}`
//             );

//         }

//         admin.token = data.token;
//         admin.email = data.email;

//         sessionStorage.setItem("adminToken", admin.token);
//         sessionStorage.setItem("adminEmail", admin.email);

//         setLoginMessage("");

//         showAdminPanel(true);

//     } catch (error) {

//         console.error("VERIFY ERROR:", error);

//         setLoginMessage(
//             error instanceof TypeError
//                 ? "Could not reach the server. Make sure the backend is running."
//                 : error.message
//         );

//     }

//     if (el.verifyCodeButton) {
//         el.verifyCodeButton.disabled = false;
//     }
// }


// function logoutAdmin(tellServer) {

//     // Invalidate the token on the server too
//     if (tellServer && admin.token) {

//         fetch(
//             `${BACKEND_URL}/api/admin/logout`,
//             {
//                 method: "POST",
//                 headers: {
//                     "Authorization": "Bearer " + admin.token
//                 }
//             }
//         ).catch(function () {});

//     }

//     admin.token = null;
//     admin.email = null;
//     admin.pendingEmail = null;

//     sessionStorage.removeItem("adminToken");
//     sessionStorage.removeItem("adminEmail");

//     // Clear anything private from the screen
//     if (el.myTests) {
//         el.myTests.innerHTML = "";
//     }

//     clearTestViews();

//     if (el.createdTest) {
//         el.createdTest.innerHTML = "";
//     }

//     if (el.loginEmail) {
//         el.loginEmail.value = "";
//     }

//     showLoginStep("email");

//     showAdminPanel(false);
// }


// on(el.sendCodeButton, "click", requestLoginCode);

// on(el.verifyCodeButton, "click", verifyLoginCode);

// on(
//     el.backToEmailButton,
//     "click",
//     function () {

//         setLoginMessage("");

//         showLoginStep("email");

//     }
// );

// on(
//     el.logoutButton,
//     "click",
//     function () {
//         logoutAdmin(true);
//     }
// );

// // Enter key submits each step
// on(
//     el.loginEmail,
//     "keydown",
//     function (event) {

//         if (event.key === "Enter") {
//             requestLoginCode();
//         }

//     }
// );

// on(
//     el.loginCode,
//     "keydown",
//     function (event) {

//         if (event.key === "Enter") {
//             verifyLoginCode();
//         }

//     }
// );


// // ==========================================
// // ADMIN: CREATE A TEST
// // ==========================================

// // Sends the questions the admin entered to the server.
// // The server saves them under the logged-in email
// // and answers with the test code.
// async function createTest() {

//     if (!el.createdTest) {
//         return;
//     }

//     const total =
//         state.questions.objective.length +
//         state.questions.semi.length +
//         state.questions.qualitative.length;

//     if (total === 0) {

//         alert("Add at least one question first.");

//         return;
//     }

//     const name =
//         el.testName
//             ? el.testName.value.trim()
//             : "";

//     if (el.createTest) {
//         el.createTest.disabled = true;
//     }

//     try {

//         const response = await adminFetch(
//             "/api/tests",
//             {

//                 method: "POST",

//                 body: JSON.stringify({
//                     name: name,
//                     questions: state.questions
//                 })

//             }
//         );

//         const data = await response.json();

//         if (!response.ok) {

//             throw new Error(
//                 data.error || `Server responded with ${response.status}`
//             );

//         }

//         el.createdTest.innerHTML = `

//             <h4>Test created</h4>

//             <p>
//                 Give this code to your students:
//                 <strong style="font-size: 1.6em; letter-spacing: 3px;">
//                     ${escapeHtml(data.code)}
//                 </strong>
//             </p>

//             <p>
//                 Results are emailed to ${escapeHtml(admin.email)}
//                 and saved under "My Tests" below.
//             </p>

//         `;

//         // The questions now live on the server, so clear the
//         // draft to keep it from mixing into the next test
//         state.questions = {
//             objective: [],
//             semi: [],
//             qualitative: []
//         };

//         saveQuestions();

//         displayQuestions();

//         if (el.testName) {
//             el.testName.value = "";
//         }

//     } catch (error) {

//         console.error(
//             "CREATE TEST ERROR:",
//             error
//         );

//         el.createdTest.innerHTML =
//             `<p>Could not create the test: ${escapeHtml(error.message)}</p>`;

//     }

//     if (el.createTest) {
//         el.createTest.disabled = false;
//     }
// }


// on(
//     el.createTest,
//     "click",
//     createTest
// );


// // ==========================================
// // ADMIN: MY TESTS (pick one to view)
// // ==========================================

// async function loadMyTests() {

//     if (!el.myTests) {
//         return;
//     }

//     el.myTests.innerHTML =
//         "<p>Loading your tests...</p>";

//     try {

//         const response =
//             await adminFetch("/api/admin/tests");

//         if (!response.ok) {

//             throw new Error(
//                 `Server responded with ${response.status}`
//             );

//         }

//         const data =
//             await response.json();

//         if (data.tests.length === 0) {

//             el.myTests.innerHTML =
//                 "<p>You haven't created any tests yet.</p>";

//             return;
//         }

//         el.myTests.innerHTML = data.tests.map(function (t) {

//             return `

//                 <div class="saved-question">

//                     <p>
//                         <strong>${escapeHtml(t.name || "Untitled test")}</strong>
//                         &mdash; code
//                         <strong>${escapeHtml(t.code)}</strong>
//                     </p>

//                     <p>
//                         ${t.questionCount} questions
//                         &mdash; ${t.submitted} submitted
//                         ${t.average !== null
//                             ? "&mdash; average " + t.average + "%"
//                             : ""}
//                         &mdash; created
//                         ${escapeHtml(new Date(t.createdAt).toLocaleDateString())}
//                     </p>

//                     <button
//                         type="button"
//                         data-action="results"
//                         data-code="${escapeHtml(t.code)}">

//                         View results

//                     </button>

//                     <button
//                         type="button"
//                         data-action="edit"
//                         data-code="${escapeHtml(t.code)}">

//                         Edit questions

//                     </button>

//                 </div>

//             `;

//         }).join("");

//     } catch (error) {

//         console.error(
//             "LOAD TESTS ERROR:",
//             error
//         );

//         // adminFetch already handled an expired session
//         if (admin.token) {

//             el.myTests.innerHTML =
//                 "<p>Could not load your tests. Is the backend running?</p>";

//         }

//     }
// }


// // One listener for every button in the My Tests list
// on(
//     el.myTests,
//     "click",
//     function (event) {

//         const button =
//             event.target.closest("button[data-code]");

//         if (!button) {
//             return;
//         }

//         if (button.dataset.action === "edit") {
//             loadEditView(button.dataset.code);
//         } else {
//             loadResults(button.dataset.code);
//         }

//     }
// );


// // ==========================================
// // ADMIN: RESULTS FOR ONE TEST
// // ==========================================

// async function loadResults(code) {

//     if (!el.resultsList) {
//         return;
//     }

//     // Only one of the two views shows at a time
//     if (el.editView) {
//         el.editView.innerHTML = "";
//         el.editView.dataset.code = "";
//     }

//     el.resultsList.innerHTML =
//         "<p>Loading results...</p>";

//     try {

//         const response = await adminFetch(
//             `/api/tests/${encodeURIComponent(code)}/results`
//         );

//         if (response.status === 404) {

//             el.resultsList.innerHTML =
//                 "<p>Test not found.</p>";

//             return;
//         }

//         if (!response.ok) {

//             throw new Error(
//                 `Server responded with ${response.status}`
//             );

//         }

//         const data =
//             await response.json();

//         const subs =
//             data.submissions;

//         const title =
//             `<h3>${escapeHtml(data.name || "Untitled test")} ` +
//             `(${escapeHtml(data.code)})</h3>`;

//         if (subs.length === 0) {

//             el.resultsList.innerHTML =
//                 title +
//                 "<p>No students have submitted yet.</p>";

//             return;
//         }

//         // Class average (only graded exams)
//         const graded =
//             subs.filter(function (s) {
//                 return s.percent !== null;
//             });

//         const average = graded.length
//             ? Math.round(
//                 graded.reduce(function (sum, s) {
//                     return sum + s.percent;
//                 }, 0) / graded.length
//             )
//             : null;

//         const header =
//             title +
//             `<p>${subs.length} submitted` +
//             (average !== null
//                 ? ` &mdash; class average ${average}%`
//                 : "") +
//             "</p>";

//         el.resultsList.innerHTML = header + subs.map(function (r) {

//             const score = r.gradingFailed
//                 ? "Grading failed (answers saved)"
//                 : r.percent + "%";

//             const details = r.questions.map(function (q, i) {

//                 const answers =
//                     (q.exchanges || []).map(function (e) {

//                         return "<p><em>" +
//                             escapeHtml(e.question) +
//                             "</em><br>" +
//                             escapeHtml(e.answer) +
//                             "</p>";

//                     }).join("") ||
//                     "<p><em>No answer given</em></p>";

//                 return "<div><strong>" +
//                     (i + 1) + ". " +
//                     escapeHtml(q.question) +
//                     "</strong>" +
//                     (q.score !== undefined
//                         ? " &mdash; " + q.score + "/10"
//                         : "") +
//                     answers +
//                     (q.feedback
//                         ? "<p>" + escapeHtml(q.feedback) + "</p>"
//                         : "") +
//                     "</div>";

//             }).join("");

//             return "<details class='saved-question'>" +
//                 "<summary><strong>" +
//                 escapeHtml(r.studentName) +
//                 "</strong> &mdash; " + score +
//                 " &mdash; " +
//                 escapeHtml(new Date(r.submittedAt).toLocaleString()) +
//                 (r.emailSent ? "" : " &mdash; email not sent") +
//                 "</summary>" +
//                 (r.summary
//                     ? "<p>" + escapeHtml(r.summary) + "</p>"
//                     : "") +
//                 details +
//                 "</details>";

//         }).join("");

//     } catch (error) {

//         console.error(error);

//         if (admin.token) {

//             el.resultsList.innerHTML =
//                 "<p>Could not load results. Is the backend running?</p>";

//         }

//     }
// }


// // ==========================================
// // ADMIN: EDIT AN EXISTING TEST
// // ==========================================

// const CATEGORY_LABELS = {
//     objective: "Objective",
//     semi: "Semi-objective",
//     qualitative: "Qualitative"
// };


// // Sends an add / delete / rename request and reports any error
// async function sendEdit(path, method, body) {

//     const response = await adminFetch(
//         path,
//         {
//             method: method,
//             body: body ? JSON.stringify(body) : undefined
//         }
//     );

//     if (!response.ok) {

//         const data =
//             await response.json().catch(function () { return {}; });

//         throw new Error(
//             data.error || `Server responded with ${response.status}`
//         );

//     }
// }


// async function loadEditView(code) {

//     if (!el.editView) {
//         return;
//     }

//     // Only one of the two views shows at a time
//     if (el.resultsList) {
//         el.resultsList.innerHTML = "";
//     }

//     el.editView.innerHTML =
//         "<p>Loading test...</p>";

//     try {

//         const response = await adminFetch(
//             `/api/tests/${encodeURIComponent(code)}/edit`
//         );

//         if (response.status === 404) {

//             el.editView.innerHTML =
//                 "<p>Test not found.</p>";

//             return;
//         }

//         if (!response.ok) {

//             throw new Error(
//                 `Server responded with ${response.status}`
//             );

//         }

//         const data =
//             await response.json();

//         el.editView.dataset.code = data.code;

//         const sections = Object.keys(CATEGORY_LABELS).map(function (cat) {

//             const label = CATEGORY_LABELS[cat];

//             const items =
//                 data.questions[cat].map(function (q) {

//                     return `

//                         <div class="saved-question">

//                             <p>${escapeHtml(q.text)}</p>

//                             <button
//                                 type="button"
//                                 data-action="delete-question"
//                                 data-id="${Number(q.id)}">

//                                 Delete

//                             </button>

//                         </div>

//                     `;

//                 }).join("") ||
//                 "<p><em>No questions in this category.</em></p>";

//             return `

//                 <h4>${label}</h4>

//                 ${items}

//                 <input
//                     type="text"
//                     id="editInput-${cat}"
//                     placeholder="Add a ${label.toLowerCase()} question">

//                 <button
//                     type="button"
//                     data-action="add-question"
//                     data-category="${cat}">

//                     Add Question

//                 </button>

//             `;

//         }).join("");

//         const warning = data.submitted > 0
//             ? `<p><em>${data.submitted} student(s) have already taken this test.
//                Their results keep the questions they were asked.
//                Changes only affect students who take it from now on.</em></p>`
//             : "";

//         el.editView.innerHTML = `

//             <h3>Editing: ${escapeHtml(data.name || "Untitled test")}
//                 (${escapeHtml(data.code)})</h3>

//             ${warning}

//             <input
//                 type="text"
//                 id="editName"
//                 placeholder="Test name"
//                 value="${escapeHtml(data.name)}">

//             <button
//                 type="button"
//                 data-action="rename">

//                 Save name

//             </button>

//             ${sections}

//         `;

//     } catch (error) {

//         console.error(
//             "LOAD EDIT ERROR:",
//             error
//         );

//         if (admin.token) {

//             el.editView.innerHTML =
//                 "<p>Could not load the test. Is the backend running?</p>";

//         }

//     }
// }


// // One listener for every button inside the edit view
// on(
//     el.editView,
//     "click",
//     async function (event) {

//         const button =
//             event.target.closest("button[data-action]");

//         if (!button) {
//             return;
//         }

//         const code = el.editView.dataset.code;

//         const encoded = encodeURIComponent(code);

//         const action = button.dataset.action;

//         button.disabled = true;

//         try {

//             if (action === "add-question") {

//                 const category = button.dataset.category;

//                 const input =
//                     document.getElementById("editInput-" + category);

//                 const text =
//                     input ? input.value.trim() : "";

//                 if (text === "") {

//                     alert("Please enter a question.");

//                     return;
//                 }

//                 await sendEdit(
//                     `/api/tests/${encoded}/questions`,
//                     "POST",
//                     { category: category, text: text }
//                 );

//             } else if (action === "delete-question") {

//                 if (!confirm("Delete this question?")) {
//                     return;
//                 }

//                 await sendEdit(
//                     `/api/tests/${encoded}/questions/${button.dataset.id}`,
//                     "DELETE"
//                 );

//             } else if (action === "rename") {

//                 const nameInput =
//                     document.getElementById("editName");

//                 await sendEdit(
//                     `/api/tests/${encoded}`,
//                     "PATCH",
//                     { name: nameInput ? nameInput.value.trim() : "" }
//                 );

//             }

//             // Show the updated test
//             await loadEditView(code);

//         } catch (error) {

//             console.error(
//                 "EDIT ERROR:",
//                 error
//             );

//             alert(error.message);

//         } finally {

//             button.disabled = false;

//         }

//     }
// );


// // ==========================================
// // ADMIN: MENU BUTTONS
// // ==========================================

// on(
//     el.menuCreateButton,
//     "click",
//     function () {

//         showAdminScreen("create");

//     }
// );

// on(
//     el.menuViewButton,
//     "click",
//     function () {

//         clearTestViews();

//         showAdminScreen("tests");

//         loadMyTests();

//     }
// );

// on(
//     el.createBackButton,
//     "click",
//     function () {

//         if (el.createdTest) {
//             el.createdTest.innerHTML = "";
//         }

//         showAdminScreen("menu");

//     }
// );

// on(
//     el.testsBackButton,
//     "click",
//     function () {

//         clearTestViews();

//         showAdminScreen("menu");

//     }
// );


// // ==========================================
// // ADMIN PAGE START-UP
// // ==========================================

// // Runs on page load. Shows the login screen unless the saved
// // token is still valid. (Only does something on the admin page.)
// async function initAdminPage() {

//     if (!el.adminLogin) {
//         return;
//     }

//     showLoginStep("email");

//     if (!admin.token) {

//         showAdminPanel(false);

//         return;
//     }

//     // Check the saved token with the server before trusting it
//     try {

//         const response =
//             await adminFetch("/api/admin/tests");

//         if (!response.ok) {
//             throw new Error("Not logged in");
//         }

//         admin.email =
//             (await response.json()).email || admin.email;

//         showAdminPanel(true);

//     } catch (error) {

//         showAdminPanel(false);

//     }
// }


// // ==========================================
// // INITIAL SETUP
// // ==========================================

// updateTimerDisplay();

// setQuestionButtonsEnabled(false);

// initAdminPage();

// console.log(
//     "AINT script loaded successfully."
// );

// console.log(
//     "Saved questions:",
//     state.questions
// );
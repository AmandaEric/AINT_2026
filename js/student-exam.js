/*
 * ============================================================
 * student-exam.js - THE STUDENT'S EXAM FLOW
 * Optional countdown timer, Start/Stop button, submitting the exam
 * for grading, picking and asking questions, and the Evaluate
 * button that gets AI follow-up questions.
 *
 * Requires avatar-speech.js to be loaded BEFORE this file
 * (provides speakAsAvatar and stopAvatarSpeech).
 * ============================================================
 */
// ==========================================
// STUDENT: REPLAY QUESTION AUDIO
// ==========================================

// The replay button (id="replayButton" in main.html) lets the student
// hear the current question again. It replays whatever was last spoken
// by safeSpeak(): a normal question or an AI follow-up question.
//
// How it works:
//   - safeSpeak() saves its text in lastSpokenText and enables the button
//   - clicking the button speaks lastSpokenText again
//   - stopTimer() disables the button when the exam ends or is stopped

const replayButton = document.getElementById("replayButton");

// The text of the question that was spoken most recently
let lastSpokenText = "";
// True while the student still needs to answer an AI follow-up.
let followUpNeedsAnswer = false;

// Turn the replay button on or off
function setReplayEnabled(enabled) {
    if (replayButton) {
        replayButton.disabled = !enabled;
    }
}

// Speak the current question again
function replayQuestion() {

    // Nothing to replay yet, or the exam is not running
    if (!lastSpokenText || !state.testRunning) {
        return;
    }

    // Cut off any speech that is still playing, so the two don't overlap
    if (typeof stopAvatarSpeech === "function") {
        stopAvatarSpeech();
    }

    // Short delay: browsers can drop speech that starts the instant
    // the previous speech is cancelled
    setTimeout(function () {
        safeSpeak(lastSpokenText);
    }, 100);
}

// Disabled until the first question has been spoken
setReplayEnabled(false);

on(replayButton, "click", replayQuestion);
// ==========================================
// STUDENT: TIMER
// ==========================================

// state.seconds always counts UP (elapsed time, sent to the server).
// If the test has a time limit, the display counts DOWN from it.
// If the test has no time limit, the timer is hidden.
function updateTimerDisplay() {

    if (!el.timer) {
        return;
    }

    if (!exam.timerEnabled) {
        el.timer.style.display = "none";
        return;
    }

    el.timer.style.display = "";

    const remaining = Math.max(0, exam.timeLimitSeconds - state.seconds);
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;

    el.timer.textContent =
        `${minutes}:${String(seconds).padStart(2, "0")}`;
}


function setQuestionButtonsEnabled(enabled) {
    if (el.nextButton) {
        el.nextButton.disabled =
            !enabled || followUpNeedsAnswer;
    }
}


function startTimer() {

    state.testRunning = true;

    if (el.startButton) {
        el.startButton.textContent = "Stop Test";
    }

    setQuestionButtonsEnabled(true);

    // Allow the student to type an answer
    if (el.responseBox) {
        el.responseBox.disabled = false;
    }

    // Allow speech recognition
    if (el.listenButton) {
        el.listenButton.disabled = false;
    }

    state.timerInterval = setInterval(() => {
        state.seconds++;
        updateTimerDisplay();

        // Time is up: auto-submit (only for timed tests)
        if (exam.timerEnabled && state.seconds >= exam.timeLimitSeconds) {
            finishExam(true);
        }
    }, 1000);
}


function stopTimer() {

    state.testRunning = false;

    if (el.startButton) {
        el.startButton.textContent = "Start Test";
    }

    clearInterval(state.timerInterval);

    setQuestionButtonsEnabled(false);

    // Nothing to replay once the exam is stopped
    setReplayEnabled(false);
    lastSpokenText = "";

    if (state.isListening && state.recognition) {
        state.recognition.stop();
    }

    if (el.listenButton) {
        el.listenButton.disabled = true;
    }

    if (el.evaluateButton) {
        el.evaluateButton.disabled = true;
    }
}

// ==========================================
// STUDENT: SAVING ANSWERS
// ==========================================

// Saves whatever is in the response box, unless it is empty or was
// already recorded by the Evaluate button. Prevents duplicate entries.
function saveUnsentAnswer() {

    if (!exam.current || !el.responseBox || !el.questionText) {
        return;
    }

    const answer = el.responseBox.value.trim();

    if (answer === "" || answer === exam.lastRecordedAnswer) {
        return;
    }

    recordAnswer(el.questionText.textContent, answer);
    exam.lastRecordedAnswer = answer;
}
const responseBox = document.querySelector('.response');
const wordCountEl = document.getElementById('wordCount');

function updateWordCount() {
    const text = responseBox.value.trim();
    const count = text === '' ? 0 : text.split(/\s+/).length;
    wordCountEl.textContent = `Words: ${count}`;
}

responseBox.addEventListener('input', updateWordCount);
updateWordCount();

// ==========================================
// STUDENT: START / STOP / SUBMIT THE EXAM
// ==========================================

// Ends the exam and submits it. Used by the Stop button and by the
// timer when time runs out. stopTimer() clears the interval, and the
// exam.finishing flag keeps this from running twice.
async function finishExam(timeUp = false) {

    if (exam.submitted || exam.finishing) {
        return;
    }

    exam.finishing = true;

    // Save an answer that was typed or spoken
    // but never sent with the Evaluate button
    saveUnsentAnswer();

    stopTimer();

    // Stop the avatar mid-sentence and return it to neutral
    if (typeof stopAvatarSpeech === "function") {
        stopAvatarSpeech();
    }

    if (timeUp) {
        alert("Time is up! Your exam will now be submitted.");
    }

    try {
        await submitExam();
    } finally {
        exam.finishing = false;
    }
    stopProctoring();
}


// Start / Stop button
on(
    el.startButton,
    "click",
    async () => {

        // ---------- START ----------
        if (!state.testRunning) {

            if (el.studentName && !el.studentName.value.trim()) {
                alert("Please enter your name first.");
                return;
            }

            // Ask for the test code

            const code = (
                el.testCodeInput?.value || ""
            ).trim().toUpperCase();

            if (!code) {
                alert("Please enter your test code.");
                return;
            }

            // Check the code and get that test's questions
            el.startButton.disabled = true;

            try {

                const response = await fetch(
                    `${BACKEND_URL}/api/tests/${encodeURIComponent(code)}/start`,
                    { method: "POST" }
                );

                if (response.status === 404) {
                    alert("That test code was not found. Check it and try again.");
                    return;
                }

                if (!response.ok) {
                    throw new Error(`Server responded with ${response.status}`);
                }

                const data = await response.json();


                exam.testCode = code;
                exam.testQuestions = data.questions;

                // Save the teacher's grading guidelines from the server
                exam.gradingGuidelines = data.grading_guidelines || "";

                // Optional timer settings from the server
                const limitSeconds = Number(data.timeLimitMinutes) * 60;
                exam.timerEnabled =
                    Boolean(data.timerEnabled) &&
                    Number.isFinite(limitSeconds) &&
                    limitSeconds > 0;
                exam.timeLimitSeconds = exam.timerEnabled ? limitSeconds : 0;

                /* Hide student information after the test loads */
                if (el.studentName) {
                    el.studentName.style.display = "none";
                }

                if (el.testCodeInput) {
                    el.testCodeInput.style.display = "none";
                }

                /* Expand the AI avatar */
                if (el.avatarContainer) {
                    el.avatarContainer.classList.add("avatar-container-large");
                }

            } catch (error) {

                console.error("START ERROR:", error);

                alert("Could not reach the server. Make sure the backend is running.");

                return;

            } finally {

                el.startButton.disabled = false;

            }

            // Fresh attempt
            exam.log = [];
            exam.current = null;
            exam.submitted = false;
            exam.finishing = false;
            exam.lastRecordedAnswer = null;
            followUpNeedsAnswer = false;

            state.seconds = 0;
            state.selectedQuestions = [];

            updateTimerDisplay();

            startTimer();
            startProctoring();
            addAllQuestions();
            askNextQuestion();

            return;
        }


        // ---------- STOP = FINISH AND SUBMIT ----------
        if (!confirm("Finish the exam and submit it for grading?")) {
            return;
        }

        await finishExam();
    }
);


// Send the finished exam to the server for grading
async function submitExam() {

    if (exam.submitted) {
        return;
    }

    if (exam.log.length === 0) {

        if (el.evaluationBox) {
            el.evaluationBox.innerHTML =
                "<p>No questions were answered, so nothing was submitted.</p>";
        }

        return;
    }

    if (el.evaluationBox) {
        el.evaluationBox.innerHTML =
            "<p>Submitting your exam for grading...</p>";
    }

    try {

        const response = await fetch(
            `${BACKEND_URL}/api/tests/${encodeURIComponent(exam.testCode)}/submit`,
            {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    studentName: el.studentName ? el.studentName.value.trim() : "",
                    durationSeconds: state.seconds,
                    log: exam.log
                })

            }
        );

        if (!response.ok) {
            throw new Error(`Server responded with ${response.status}`);
        }

        exam.submitted = true;

        if (el.questionText) {
            el.questionText.textContent = "The exam is finished.";
        }

        if (el.evaluationBox) {
            el.evaluationBox.innerHTML = `
                <h4>Exam submitted</h4>
                <p>Thank you. Your professor will share your results.</p>
            `;
        }

    } catch (error) {

        console.error("SUBMIT ERROR:", error);

        if (el.evaluationBox) {
            el.evaluationBox.innerHTML = `
                <h4>Submission problem</h4>
                <p>Your exam was not submitted. Keep this page open.</p>
                <button type="button" onclick="submitExam()">Try again</button>
            `;
        }

    }
}

// Make submitExam available to the generated "Try again" button
window.submitExam = submitExam;

// ==========================================
// STUDENT: PICKING AND ASKING QUESTIONS
// ==========================================

// Speaks text with the animated avatar. If the avatar script failed to
// load (or throws), the exam keeps working without speech.
// Also remembers the text so the replay button can speak it again.
function safeSpeak(text) {

    lastSpokenText = text;
    setReplayEnabled(true);

    try {
        if (typeof speakAsAvatar === "function") {
            speakAsAvatar(text);
        } else {
            console.warn("speakAsAvatar is not loaded. Check js/avatar-speech.js");
        }
    } catch (error) {
        console.error("Avatar speech failed:", error);
    }
}

// Load every question from every category into one random pool.
// Each question keeps its own category for the exam log.
function addAllQuestions() {

    const all = exam.testQuestions || {};

    Object.keys(all).forEach(category => {
        (all[category] || []).forEach(text => {
            state.selectedQuestions.push({ category, text });
        });
    });
}


// Ask next question
function askNextQuestion() {
    // Do not advance while an AI follow-up needs an answer.
    if (followUpNeedsAnswer) {
        return;
    }

    if (!el.questionText) {
        return;
    }

    // Save the answer to the previous question BEFORE the question
    // text on screen is replaced
    saveUnsentAnswer();

    if (state.selectedQuestions.length === 0) {
        el.questionText.textContent =
            exam.log.length === 0
                ? "This test has no questions."
                : "That was the last question. Click Stop Test to submit your exam.";
        return;
    }

    // Clear the response box for the new question
    if (el.responseBox) {
        el.responseBox.value = "";
    }

    // Pick random question
    const randomIndex = Math.floor(
        Math.random() * state.selectedQuestions.length
    );

    const picked = state.selectedQuestions.splice(randomIndex, 1)[0];

    // Start a new entry in the exam log
    exam.current = {
        category: picked.category,
        question: picked.text,
        exchanges: []
    };

    exam.log.push(exam.current);
    exam.lastRecordedAnswer = null;

    // Display the question
    el.questionText.textContent = picked.text;

    // Enable response controls
    if (el.responseBox) {
        el.responseBox.disabled = false;
    }

    if (el.listenButton) {
        el.listenButton.disabled = false;
    }

    if (el.evaluateButton) {
        el.evaluateButton.disabled = false;
    }

    // Reset evaluation
    if (el.evaluationBox) {
        el.evaluationBox.innerHTML = "<p>Waiting for student response...</p>";
    }

    // Speak the question last, so a speech problem can't block the controls
    safeSpeak(picked.text);
}

// Next question button
on(el.nextButton, "click", askNextQuestion);


// ==========================================
// STUDENT: AI EVALUATION (follow-up questions)
// ==========================================

// Adds one line of text to the evaluation box.
// Uses textContent so AI output can't inject HTML.
// If "label" is given, it is shown in bold before the text.
function addEvaluationLine(tag, text, label) {

    const node = document.createElement(tag);

    if (label) {
        const strong = document.createElement("strong");
        strong.textContent = label;
        node.appendChild(strong);
        node.appendChild(document.createTextNode(" " + text));
    } else {
        node.textContent = text;
    }

    el.evaluationBox.appendChild(node);
}


async function handleEvaluate() {

    const answer = el.responseBox.value.trim();

    // Make sure student answered
    if (answer === "") {
        el.evaluationBox.innerHTML =
            "<p>Please provide an answer before evaluating.</p>";
        return;
    }

    // Save the question BEFORE the AI changes it
    const originalQuestion = el.questionText.textContent;

    // Record this answer for grading at the end of the exam
    recordAnswer(originalQuestion, answer);
    exam.lastRecordedAnswer = answer;

    // Show loading
    el.evaluationBox.innerHTML = "<p>AI is thinking...</p>";

    el.evaluateButton.disabled = true;

    try {

        console.log("Sending answer to AI...");

        const response = await fetch(
            `${BACKEND_URL}/api/generate-followup`,
            {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                // The server looks up the teacher's grading guidelines
                // itself from the test code.
                body: JSON.stringify({
                    originalQuestion: originalQuestion,
                    studentResponse: answer,
                    category: exam.current ? exam.current.category : "",
                    testCode: exam.testCode
                })

            }
        );

        if (!response.ok) {
            // Include the server's reason (each AI provider's error) when it sends one
            let detail = "";
            try {
                const body = await response.json();
                detail = body.details || body.error || "";
            } catch {
                // response had no JSON body
            }
            throw new Error(
                `Server responded with ${response.status}${detail ? ": " + detail : ""}`
            );
        }

        const data = await response.json();

        console.log("AI RESPONSE:", data);

        const feedback = data.evaluation || data.feedback || "";
        const hasFollowUp = Boolean(
            data.needsFollowUp && data.followUpQuestion
        );

        // Print the AI's response
        el.evaluationBox.innerHTML = "";

        addEvaluationLine(
            "h4",
            hasFollowUp ? "Follow-up Question" : "AI Evaluation"
        );

        if (feedback) {
            addEvaluationLine("p", feedback);
        }

        if (data.score !== undefined && data.score !== null) {
            addEvaluationLine("p", String(data.score), "Score:");
        }

        if (hasFollowUp) {
            // Lock Next until the student answers this follow-up.
            followUpNeedsAnswer = true;
            setQuestionButtonsEnabled(state.testRunning);

            addEvaluationLine("p", data.followUpQuestion, "Follow-up:");

            // Display the follow-up as the current question.
            el.questionText.textContent = data.followUpQuestion;
            el.responseBox.value = "";

            // Let the student answer the follow-up.
            el.responseBox.disabled = false;

            if (el.listenButton) {
                el.listenButton.disabled = false;
            }

            // Speak the follow-up with the animated avatar.
            safeSpeak(data.followUpQuestion);

        } else {
            // No more follow-up is needed, so Next can be used again.
            followUpNeedsAnswer = false;
            setQuestionButtonsEnabled(state.testRunning);

            addEvaluationLine("p", "No follow-up question is needed.");
        }

    } catch (error) {

        console.error("AI ERROR:", error);

        el.evaluationBox.innerHTML = `
            <h4>AI Connection Error</h4>
            <p>The AI is temporarily unavailable. Please try again in a moment.</p>
        `;

    }

    el.evaluateButton.disabled = false;
}


// Evaluate button
on(el.evaluateButton, "click", handleEvaluate);
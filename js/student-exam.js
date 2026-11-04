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

const replayButton = document.getElementById("replayButton");

let lastSpokenText = "";
let followUpNeedsAnswer = false;
// ==========================================
// STUDENT: READING MATERIAL PDF
// ==========================================

let readingMaterialUrl = null;

async function loadReadingMaterial(testCode) {
    const container = document.getElementById("reading-material-container");
    const viewer = document.getElementById("reading-material-viewer");

    if (!container || !viewer) {
        console.warn("Reading material viewer elements were not found.");
        return;
    }

    // Hide the viewer while checking for a document.
    container.hidden = true;
    viewer.removeAttribute("src");

    // Clean up any previously loaded PDF.
    if (readingMaterialUrl) {
        URL.revokeObjectURL(readingMaterialUrl);
        readingMaterialUrl = null;
    }

    try {
        const response = await fetch(
            `${BACKEND_URL}/api/tests/${encodeURIComponent(testCode)}/reading-material/view`
        );

        // A 404 means this test does not have a PDF.
        if (response.status === 404) {
            console.log("This test does not have reading material.");
            return;
        }

        if (!response.ok) {
            throw new Error(`PDF request failed: ${response.status}`);
        }

        const pdfBlob = await response.blob();

        readingMaterialUrl = URL.createObjectURL(pdfBlob);

        viewer.src = readingMaterialUrl;
        container.hidden = false;

        console.log("Reading material loaded successfully.");

    } catch (error) {
        console.error("READING MATERIAL ERROR:", error);
        container.hidden = true;
    }
}

function setReplayEnabled(enabled) {
    if (replayButton) {
        replayButton.disabled = !enabled;
    }
}

function replayQuestion() {
    if (!lastSpokenText || !state.testRunning) {
        return;
    }

    if (typeof stopAvatarSpeech === "function") {
        stopAvatarSpeech();
    }

    setTimeout(function () {
        safeSpeak(lastSpokenText);
    }, 100);
}

setReplayEnabled(false);

// Helper event binding logic
const bindEvent = (element, event, handler) => {
    if (typeof on === "function") {
        on(element, event, handler);
    } else if (element) {
        element.addEventListener(event, handler);
    }
};

bindEvent(replayButton, "click", replayQuestion);

// Clears the response box and keeps the word count in step with it.
// (updateWordCount lives in student-voice.js, which loads after this file.)
function clearResponseBox() {
    if (!el.responseBox) return;

    el.responseBox.value = "";

    if (typeof updateWordCount === "function") {
        updateWordCount();
    }
}

// ==========================================
// STUDENT: TIMER
// ==========================================

function updateTimerDisplay() {
    if (!el.timer) return;

    if (!exam.timerEnabled) {
        el.timer.style.display = "none";
        return;
    }

    el.timer.style.display = "";

    const remaining = Math.max(0, exam.timeLimitSeconds - state.seconds);
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;

    el.timer.textContent = `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function setQuestionButtonsEnabled(enabled) {
    if (el.nextButton) {
        el.nextButton.disabled = !enabled || followUpNeedsAnswer;
    }
}

function startTimer() {
    state.testRunning = true;

    if (el.startButton) {
        el.startButton.textContent = "Stop Test";
    }

    setQuestionButtonsEnabled(true);

    if (el.responseBox) {
        el.responseBox.disabled = false;
    }

    if (el.listenButton) {
        el.listenButton.disabled = false;
    }

    state.timerInterval = setInterval(() => {
        state.seconds++;
        updateTimerDisplay();

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

    setReplayEnabled(false);
    lastSpokenText = "";

    showQuestionImage("");

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

function saveUnsentAnswer() {
    if (!exam.current || !el.responseBox) {
        return;
    }

    // A follow-up answer must be saved by handleFollowUpAnswer().
    // Never save it as though it were the original question's answer.
    if (followUpNeedsAnswer) {
        return;
    }

    const answer = el.responseBox.value.trim();

    if (!answer || answer === exam.lastRecordedAnswer) {
        return;
    }

    // Always associate this answer with the original exam question.
    recordAnswer(exam.current.question, answer);
    exam.lastRecordedAnswer = answer;
}

// ==========================================
// STUDENT: START / STOP / SUBMIT THE EXAM
// ==========================================

async function finishExam(timeUp = false) {
    if (exam.submitted || exam.finishing) {
        return;
    }
    if (followUpNeedsAnswer && !timeUp) {
        alert("Please answer the follow-up question before submitting.");
        return;
    }

    exam.finishing = true;

    saveUnsentAnswer();
    stopTimer();

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

bindEvent(el.startButton, "click", async () => {
    if (!state.testRunning) {
        if (el.studentName || !el.studentName.value.trim()) {
            alert("Please enter your name first.");
            return;
        }

        const code = (el.testCodeInput?.value || "").trim().toUpperCase();

        if (!code) {
            alert("Please enter your test code.");
            return;
        }

        el.startButton.disabled = true;

        try {
            const studentName = el.studentName
                ? el.studentName.value.trim()
                : "";
            
            const response = await fetch(
                `${BACKEND_URL}/api/tests/${encodeURIComponent(code)}/start`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        studentName
                    })
                }
            );

            if (response.status === 404) {
                alert("That test code was not found. Check it and try again.");
                return;
            }
            
            const data = await response.json();
            
            if (response.status === 403) {
                alert(
                    data.message ||
                    "You have reached the maximum number of attempts for this test."
                );
                return;
            }
            
            if (!response.ok) {
                throw new Error(
                    data.message || `Server responded with ${response.status}`
                );
            }

            exam.testCode = code;

            // Save the student and attempt information returned by the server.
            exam.studentName = studentName;
            exam.attemptId = data.attemptId ?? null;
            exam.attemptNumber = data.attemptNumber ?? null;
            exam.maxAttempts = data.maxAttempts ?? null;
            
            exam.testQuestions = data.questions;
            exam.gradingGuidelines = data.grading_guidelines || "";
            // Load the PDF associated with this test, if one exists.
            await loadReadingMaterial(code);

            const limitSeconds = Number(data.timeLimitMinutes) * 60;
            exam.timerEnabled =
                Boolean(data.timerEnabled) &&
                Number.isFinite(limitSeconds) &&
                limitSeconds > 0;
            exam.timeLimitSeconds = exam.timerEnabled ? limitSeconds : 0;

            if (el.studentName) el.studentName.style.display = "none";
            if (el.testCodeInput) el.testCodeInput.style.display = "none";
            if (el.avatarContainer) el.avatarContainer.classList.add("avatar-container-large");

        } catch (error) {
            console.error("START ERROR:", error);
            alert("Could not reach the server. Make sure the backend is running.");
            return;
        } finally {
            el.startButton.disabled = false;
        }

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

    if (!confirm("Finish the exam and submit it for grading?")) {
        return;
    }

    await finishExam();
});

async function submitExam() {
    if (exam.submitted) return;

    if (exam.log.length === 0) {
        if (el.evaluationBox) {
            el.evaluationBox.innerHTML = "<p>No questions were answered, so nothing was submitted.</p>";
        }
        return;
    }

    if (el.evaluationBox) {
        el.evaluationBox.innerHTML = "<p>Submitting your exam for grading...</p>";
    }

    try {
        const response = await fetch(
            `${BACKEND_URL}/api/tests/${encodeURIComponent(exam.testCode)}/submit`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    studentName: exam.studentName,
                    attemptId: exam.attemptId,
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

window.submitExam = submitExam;

// ==========================================
// STUDENT: PICKING AND ASKING QUESTIONS
// ==========================================

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
// Each question keeps its category, points and image.
function addAllQuestions() {
    const all = exam.testQuestions || {};

    Object.keys(all).forEach(category => {
        const lowerCat = category.toLowerCase();
        const questionsList = all[category] || all[lowerCat] || [];

        questionsList.forEach(q => {
            const isObject = typeof q === "object" && q !== null;
            const questionText = isObject ? (q.text || q.question_text || "") : q;

            if (typeof questionText !== "string" || !questionText) return;

            state.selectedQuestions.push({
                id: isObject ? q.id : null,
                category: lowerCat,
                text: questionText,
                points: isObject ? (Number(q.points) || 10) : 10,
                image: isObject ? (q.image || "") : ""
            });
        });
    });
}

function showQuestionImage(src) {
    const questionImage = document.getElementById("question-image");
    if (!questionImage) return;

    if (src && typeof src === "string" && src.trim() !== "") {
        questionImage.src = src;
        questionImage.hidden = false;
        if (el.avatarContainer) el.avatarContainer.classList.add("has-question-image");
    } else {
        questionImage.removeAttribute("src");
        questionImage.hidden = true;
        if (el.avatarContainer) el.avatarContainer.classList.remove("has-question-image");
    }
}

function askNextQuestion() {
    if (followUpNeedsAnswer) return;

    const questionTextEl = el.questionText || document.getElementById("questionText");
    if (!questionTextEl) return;

    saveUnsentAnswer();

    if (!state.selectedQuestions || state.selectedQuestions.length === 0) {
        questionTextEl.textContent = (!exam.log || exam.log.length === 0)
            ? "This test has no questions."
            : "That was the last question. Click Stop Test to submit your exam.";
        showQuestionImage("");
        return;
    }

    clearResponseBox();

    const randomIndex = Math.floor(Math.random() * state.selectedQuestions.length);
    const picked = state.selectedQuestions.splice(randomIndex, 1)[0];

    // The image is NOT stored in the log. The log is sent to the server when
    // the exam is submitted, and the image would be uploaded again for nothing.
    exam.current = {
        id: picked.id,
        category: picked.category,
        question: picked.text,
        points: picked.points,
        exchanges: []
    };

    exam.log.push(exam.current);
    exam.lastRecordedAnswer = null;

    questionTextEl.textContent = picked.text;
    showQuestionImage(picked.image);

    if (el.responseBox) el.responseBox.disabled = false;
    if (el.listenButton) el.listenButton.disabled = false;
    if (el.evaluateButton) el.evaluateButton.disabled = false;
    if (el.evaluationBox) el.evaluationBox.innerHTML = "<p>Waiting for student response...</p>";

    // Speak the question last, so a speech problem can't block the controls
    safeSpeak(picked.text);
}

bindEvent(el.nextButton, "click", askNextQuestion);

// ==========================================
// STUDENT: AI EVALUATION (follow-up questions)
// ==========================================

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

    if (el.evaluationBox) {
        el.evaluationBox.appendChild(node);
    }
}


async function handleEvaluate() {
    if (!exam.current || followUpNeedsAnswer) {
        return;
    }

    const answer = el.responseBox ? el.responseBox.value.trim() : "";

    if (!answer) {
        if (el.evaluationBox) {
            el.evaluationBox.innerHTML =
                "<p>Please provide an answer before evaluating.</p>";
        }
        return;
    }

    const originalQuestion = exam.current.question;

    // Save the original answer.
    recordAnswer(originalQuestion, answer);
    exam.lastRecordedAnswer = answer;

    if (el.evaluationBox) {
        el.evaluationBox.innerHTML = "<p>AI is thinking...</p>";
    }

    if (el.evaluateButton) {
        el.evaluateButton.disabled = true;
    }

    try {
        const response = await fetch(
            `${BACKEND_URL}/api/generate-followup`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    originalQuestion,
                    studentResponse: answer,
                    category: exam.current.category,
                    points: exam.current.points,
                    testCode: exam.testCode
                })
            }
        );

        if (!response.ok) {
            throw new Error(`Server responded with ${response.status}`);
        }

        const data = await response.json();

        const feedback = data.evaluation || "";
        const hasFollowUp =
            Boolean(data.needsFollowUp && data.followUpQuestion);

        if (el.evaluationBox) {
            el.evaluationBox.innerHTML = "";
        }

        addEvaluationLine(
            "h4",
            hasFollowUp ? "Follow-up Question" : "AI Evaluation"
        );

        if (feedback) {
            addEvaluationLine("p", feedback);
        }

        if (data.score !== undefined && data.score !== null) {
            addEvaluationLine(
                "p",
                `${data.score} / ${data.maxPoints}`,
                "Preliminary Score:"
            );
        }

        if (hasFollowUp) {
            followUpNeedsAnswer = true;
            setQuestionButtonsEnabled(false);

            // Remember that the next answer belongs to this follow-up.
            exam.current.pendingFollowUp = data.followUpQuestion;

            addEvaluationLine(
                "p",
                data.followUpQuestion,
                "Follow-up:"
            );

            if (el.questionText) {
                el.questionText.textContent = data.followUpQuestion;
            }

            clearResponseBox();

            if (el.responseBox) {
                el.responseBox.disabled = false;
            }

            if (el.listenButton) {
                el.listenButton.disabled = false;
            }

            if (el.evaluateButton) {
                el.evaluateButton.disabled = false;
            }

            safeSpeak(data.followUpQuestion);

        } else {
            followUpNeedsAnswer = false;
            exam.current.pendingFollowUp = null;

            setQuestionButtonsEnabled(state.testRunning);

            addEvaluationLine(
                "p",
                "No follow-up question is needed."
            );
        }

    } catch (error) {
        console.error("AI ERROR:", error);

        if (el.evaluationBox) {
            el.evaluationBox.innerHTML = `
                <h4>AI Connection Error</h4>
                <p>The AI could not evaluate your answer.
                Please try again.</p>
            `;
        }

    } finally {
        if (el.evaluateButton) {
            el.evaluateButton.disabled = false;
        }
    }
}
function handleFollowUpAnswer() {
    if (!exam.current || !followUpNeedsAnswer) {
        return;
    }

    const answer = el.responseBox
        ? el.responseBox.value.trim()
        : "";

    if (!answer) {
        if (el.evaluationBox) {
            el.evaluationBox.innerHTML +=
                "<p>Please answer the follow-up question.</p>";
        }
        return;
    }

    const followUpQuestion = exam.current.pendingFollowUp;

    if (!followUpQuestion) {
        console.error("Missing follow-up question.");
        return;
    }

    // Save the answer with the follow-up question, not the original.
    recordAnswer(followUpQuestion, answer);

    exam.current.pendingFollowUp = null;
    followUpNeedsAnswer = false;
    exam.lastRecordedAnswer = null;

    // Restore the original question on the screen.
    if (el.questionText) {
        el.questionText.textContent = exam.current.question;
    }

    clearResponseBox();

    if (el.evaluationBox) {
        el.evaluationBox.innerHTML +=
            "<p>Follow-up answer saved!</p>" +
            "<p>You may continue to the next question.</p>";
    }

    setQuestionButtonsEnabled(state.testRunning);

    if (el.evaluateButton) {
        el.evaluateButton.disabled = false;
    }
}
bindEvent(el.evaluateButton, "click", () => {
    if (followUpNeedsAnswer) {
        handleFollowUpAnswer();
    } else {
        handleEvaluate();
    }
});


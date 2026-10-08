/*
 * ============================================================
 * student-exam.js - THE STUDENT'S EXAM FLOW
 * Timer, Start/Stop button, submitting the exam for grading,
 * picking and asking questions, and the Evaluate button that gets
 * AI follow-up questions.
 * ============================================================
 */

// ==========================================
// STUDENT: TIMER
// ==========================================

function updateTimerDisplay() {

    if (!el.timer) {
        return;
    }

    const minutes = Math.floor(state.seconds / 60);
    const seconds = state.seconds % 60;

    el.timer.textContent =
        `${minutes}:${String(seconds).padStart(2, "0")}`;
}


function setQuestionButtonsEnabled(enabled) {

    if (el.objective) {
        el.objective.disabled = !enabled;
    }

    if (el.semiButton) {
        el.semiButton.disabled = !enabled;
    }

    if (el.qualatativeButton) {
        el.qualatativeButton.disabled = !enabled;
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
    }, 1000);
}


function stopTimer() {

    state.testRunning = false;

    if (el.startButton) {
        el.startButton.textContent = "Start Test";
    }

    clearInterval(state.timerInterval);

    setQuestionButtonsEnabled(false);

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
// STUDENT: START / STOP / SUBMIT THE EXAM
// ==========================================

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
                prompt("Enter your test code:") || ""
            ).trim().toUpperCase();

            if (!code) {
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

            state.seconds = 0;
            state.selectedQuestions = [];

            updateTimerDisplay();

            startTimer();

            return;
        }


        // ---------- STOP = FINISH AND SUBMIT ----------
        if (!confirm("Finish the exam and submit it for grading?")) {
            return;
        }

        // Save an answer that was typed or spoken
        // but never sent with the Evaluate button
        if (el.responseBox && el.questionText) {
            recordAnswer(
                el.questionText.textContent,
                el.responseBox.value.trim()
            );
        }

        stopTimer();

        // Stop the avatar mid-sentence
        if ("speechSynthesis" in window) {
            speechSynthesis.cancel();
        }

        await submitExam();
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

// Add an entire category
// (uses the questions loaded from the server for this test code)
function addCategory(category) {

    const questions = exam.testQuestions[category];

    if (!questions || questions.length === 0) {

        if (el.questionText) {
            el.questionText.textContent =
                `No questions available in the ${category} category.`;
        }

        return;
    }

    // Add questions that have not already been selected
    questions.forEach(question => {
        if (!state.selectedQuestions.includes(question)) {
            state.selectedQuestions.push(question);
        }
    });
}


// Ask next question
function askNextQuestion() {

    if (!el.questionText) {
        return;
    }

    if (state.selectedQuestions.length === 0) {
        el.questionText.textContent = "No more questions available.";
        return;
    }

    // Save an answer that was typed or spoken
    // for the previous question but never evaluated
    if (exam.current && el.responseBox) {
        recordAnswer(
            el.questionText.textContent,
            el.responseBox.value.trim()
        );
    }

    // Clear the response box for the new question
    if (el.responseBox) {
        el.responseBox.value = "";
    }

    // Pick random question
    const randomIndex = Math.floor(
        Math.random() * state.selectedQuestions.length
    );

    const question = state.selectedQuestions.splice(randomIndex, 1)[0];

    // Start a new entry in the exam log
    exam.current = {
        category: currentCategory,
        question: question,
        exchanges: []
    };

    exam.log.push(exam.current);

    // Display and speak the question
    el.questionText.textContent = question;

    speakQuestion(question);

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
}


// Category buttons
on(el.objective, "click", () => {
    currentCategory = "objective";
    addCategory("objective");
    askNextQuestion();
});

on(el.semiButton, "click", () => {
    currentCategory = "semi";
    addCategory("semi");
    askNextQuestion();
});

on(el.qualatativeButton, "click", () => {
    currentCategory = "qualitative";
    addCategory("qualitative");
    askNextQuestion();
});

// ==========================================
// STUDENT: AI EVALUATION (follow-up questions)
// ==========================================

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

                body: JSON.stringify({
                    originalQuestion: originalQuestion,
                    studentResponse: answer,
                    category: currentCategory
                })

            }
        );

        if (!response.ok) {
            throw new Error(`Server responded with ${response.status}`);
        }

        const data = await response.json();

        console.log("AI RESPONSE:", data);

        // ---------- FOLLOW-UP QUESTION ----------
        if (data.needsFollowUp && data.followUpQuestion) {

            el.evaluationBox.innerHTML = `
                <h4>Follow-up Question</h4>
                <p>${data.followUpQuestion}</p>
            `;

            // Show follow-up and clear the answer box
            el.questionText.textContent = data.followUpQuestion;

            el.responseBox.value = "";

            // Speak follow-up
            speakQuestion(data.followUpQuestion);

        }

        // ---------- NO FOLLOW-UP ----------
        else {

            el.evaluationBox.innerHTML = `
                <h4>AI Evaluation</h4>
                <p>${data.evaluation}</p>
                <p><strong>Score:</strong> ${data.score}</p>
                <p>No follow-up question is needed.</p>
            `;

        }

    } catch (error) {

        console.error("AI ERROR:", error);

        el.evaluationBox.innerHTML = `
            <h4>AI Connection Error</h4>
            <p>Could not connect to the AI.</p>
            <p>Make sure the backend server is running and your OpenAI key is set in .env.</p>
        `;

    }

    el.evaluateButton.disabled = false;
}


// Evaluate button
on(el.evaluateButton, "click", handleEvaluate);
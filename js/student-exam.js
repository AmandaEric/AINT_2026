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


function startTimer() {

    state.testRunning = true;

    if (el.startButton) {
        el.startButton.textContent = "Stop Test";
    }

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

            updateTimerDisplay();

            startTimer();

            // The first question appears right away (no category buttons)
            loadAllQuestions();
            askNextQuestion();

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

// Put every question of the test into ONE pool. Each one remembers its
// category (used for the AI's rules and for grading), but the student
// never chooses a category.
function loadAllQuestions() {

    state.selectedQuestions = [];

    ["objective", "semi", "qualitative"].forEach(category => {
        (exam.testQuestions[category] || []).forEach(text => {
            state.selectedQuestions.push({ category: category, text: text });
        });
    });
}


// Ask the next question (picked at random from the whole pool)
function askNextQuestion() {

    if (!el.questionText) {
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

    // Pick a random question from everything that is left
    const randomIndex = Math.floor(
        Math.random() * state.selectedQuestions.length
    );

    const picked = state.selectedQuestions.splice(randomIndex, 1)[0];

    // The AI follow-up and the grading use this category
    currentCategory = picked.category;

    // Start a new entry in the exam log
    exam.current = {
        category: picked.category,
        question: picked.text,
        exchanges: []
    };

    exam.log.push(exam.current);

    // Display and speak the question
    el.questionText.textContent = picked.text;

    speakQuestion(picked.text);

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

            const moreQuestions = state.selectedQuestions.length > 0;

            el.evaluationBox.innerHTML = `
                <h4>AI Evaluation</h4>
                <p>${data.evaluation}</p>
                <p><strong>Score:</strong> ${data.score}</p>
                ${moreQuestions
                    ? '<button type="button" id="nextQuestionButton">Next Question</button>'
                    : "<p>That was the last question. Click Stop Test to submit your exam.</p>"}
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

// "Next Question" button (it is created inside the evaluation box)
on(el.evaluationBox, "click", function (event) {
    if (event.target.id === "nextQuestionButton") {
        askNextQuestion();
    }
});
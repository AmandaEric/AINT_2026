
/* ==========================================================
   AINT ADMIN TESTS
   - Add, display, and remove questions
   - Add, display, and remove grading guidelines
   - Create tests
   - View existing tests
   - Edit test names, questions, and grading guidelines
   ========================================================== */

   (() => {
    "use strict";
    const API = BACKEND_URL;   // defined in core.js
    const categories = {
        objective: {
            input: "objectiveInput",
            button: "objectiveAdd",
            list: "objectiveList",
            label: "Objective",
        },
        semi: {
            input: "semiInput",
            button: "semiAdd",
            list: "semiList",
            label: "Semi-Objective",
        },
        qualitative: {
            input: "qualitativeInput",
            button: "qualitativeAdd",
            list: "qualitativeList",
            label: "Qualitative",
        },
    };

    let questions = {
        objective: [],
        semi: [],
        qualitative: [],
    };

    // Guidelines are stored as an array in the browser
    // and joined into one string when sent to server.js.
    let guidelineItems = [];

    let currentTestCode = null;
    let currentTestName = "";
    let currentTestGuidelines = "";
    let editingTest = false;

    const $ = (id) => document.getElementById(id);

    function getToken() {
        // admin-login.js keeps the login token here
        return sessionStorage.getItem("adminToken") || "";
    }

    async function api(path, options = {}) {
        const token = getToken();
        if (!token) {
    throw new Error("You are not logged in. Please log in again.");
}

        const headers = {
            ...(options.body ? { "Content-Type": "application/json" } : {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(options.headers || {}),
        };

        const response = await fetch(`${API}${path}`, {
            ...options,
            headers,
        });
        if (response.status === 401) {
            if (typeof logoutAdmin === "function") {
                logoutAdmin(false);
            }
        
            if (typeof setLoginMessage === "function") {
                setLoginMessage("Your session expired. Please log in again.");
            }
        
            throw new Error("Your session expired. Please log in again.");
        }

        let data;
        try {
            data = await response.json();
        } catch {
            throw new Error(`Server returned an invalid response (${response.status}).`);
        }

        if (!response.ok || data.success === false) {
            throw new Error(data.error || `Request failed (${response.status}).`);
        }

        return data;
    }

    function showMessage(id, message, isError = false) {
        const element = $(id);
        if (!element) return;

        element.textContent = message;
        element.style.color = isError ? "#c62828" : "";
    }

    function makeButton(label, className, onClick) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = label;
        if (className) button.className = className;
        button.addEventListener("click", onClick);
        return button;
    }

    /* ----------------------------------------------------------
       QUESTIONS
       ---------------------------------------------------------- */

    function renderQuestions(category) {
        const config = categories[category];
        const list = $(config.list);
        if (!list) return;

        list.replaceChildren();

        questions[category].forEach((question, index) => {
            const item = document.createElement("div");
            item.className = "admin-list-item";

            const text = document.createElement("span");
            text.textContent = `${index + 1}. ${question.text}`;

            const remove = makeButton("Remove", "remove-question", () => {
                if (question.id && currentTestCode && editingTest) {
                    deleteSavedQuestion(category, question, item);
                    return;
                }

                questions[category].splice(index, 1);
                renderQuestions(category);
            });

            item.append(text, remove);
            list.appendChild(item);
        });
    }

    function addQuestion(category) {
        const config = categories[category];
        const input = $(config.input);

        if (!input) return;

        const text = input.value.trim();

        if (!text) {
            input.focus();
            return;
        }

        if (text.length > 1000) {
            alert("Questions can be at most 1000 characters.");
            return;
        }

        if (editingTest && currentTestCode) {
            addSavedQuestion(category, text);
            return;
        }

        questions[category].push({ text });
        input.value = "";
        renderQuestions(category);
        input.focus();
    }

    async function addSavedQuestion(category, text) {
        try {
            await api(
                `/api/tests/${encodeURIComponent(currentTestCode)}/questions`,
                {
                    method: "POST",
                    body: JSON.stringify({ category, text }),
                }
            );

            const input = $(categories[category].input);
            if (input) input.value = "";

            await loadTestForEditing(currentTestCode);
        } catch (error) {
            alert(`Could not add question: ${error.message}`);
        }
    }

    async function deleteSavedQuestion(category, question, item) {
        if (!confirm("Delete this question permanently?")) return;

        try {
            await api(
                `/api/tests/${encodeURIComponent(currentTestCode)}/questions/${question.id}`,
                { method: "DELETE" }
            );

            questions[category] = questions[category].filter(
                (q) => q.id !== question.id
            );

            renderQuestions(category);
        } catch (error) {
            alert(`Could not delete question: ${error.message}`);
        }
    }

    function resetQuestions() {
        questions = {
            objective: [],
            semi: [],
            qualitative: [],
        };

        for (const category of Object.keys(categories)) {
            const input = $(categories[category].input);
            if (input) input.value = "";
            renderQuestions(category);
        }
    }

    /* ----------------------------------------------------------
       GRADING GUIDELINES
       This is the part that makes guidelinesList display items.
       ---------------------------------------------------------- */

    function renderGuidelines() {
        const list = $("guidelinesList");
        if (!list) {
            console.error('Could not find element with id="guidelinesList".');
            return;
        }

        list.replaceChildren();

        if (guidelineItems.length === 0) {
            const empty = document.createElement("p");
            empty.className = "guidelines-empty";
            empty.textContent = "No additional instructions added yet.";
            list.appendChild(empty);
            return;
        }

        guidelineItems.forEach((guideline, index) => {
            const item = document.createElement("div");
            item.className = "guideline-item";

            const text = document.createElement("span");
            text.textContent = `${index + 1}. ${guideline}`;

            const remove = makeButton("Remove", "remove-guideline", () => {
                guidelineItems.splice(index, 1);
                renderGuidelines();
            });

            item.append(text, remove);
            list.appendChild(item);
        });
    }

    function addGuideline() {
        const input = $("grading_guidelines");
        if (!input) {
            console.error('Could not find element with id="grading_guidelines".');
            return;
        }

        const text = input.value.trim();

        if (!text) {
            input.focus();
            return;
        }

        if (text.length > 5000) {
            alert("Guidelines can be at most 5000 characters each.");
            return;
        }

        const totalLength = guidelineItems.reduce(
            (total, item) => total + item.length + 1,
            0
        );

        if (totalLength + text.length > 5000) {
            alert("The combined grading guidelines cannot exceed 5000 characters.");
            return;
        }

        guidelineItems.push(text);
        input.value = "";
        renderGuidelines();
        input.focus();
    }

    function resetGuidelines() {
        guidelineItems = [];

        const input = $("grading_guidelines");
        if (input) input.value = "";

        renderGuidelines();
    }

    function getGuidelinesString() {
        return guidelineItems.join("\n");
    }

    function loadGuidelinesString(value) {
        const text = String(value || "").trim();

        // Existing tests may have guidelines stored as multiple lines.
        guidelineItems = text
            ? text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
            : [];

        renderGuidelines();
    }

    /* ----------------------------------------------------------
       CREATE TEST
       ---------------------------------------------------------- */

    async function createTest() {
        const button = $("createTest");
        const name = $("testName")?.value.trim() || "";

        const questionPayload = {
            objective: questions.objective.map((q) => q.text),
            semi: questions.semi.map((q) => q.text),
            qualitative: questions.qualitative.map((q) => q.text),
        };

        const totalQuestions = Object.values(questionPayload)
            .reduce((total, group) => total + group.length, 0);

        if (totalQuestions === 0) {
            alert("Please add at least one question before creating the test.");
            return;
        }

        if (button) button.disabled = true;
        showMessage("createdTest", "Creating test...");

        try {
            const data = await api("/api/tests", {
                method: "POST",
                body: JSON.stringify({
                    name,
                    questions: questionPayload,
                    grading_guidelines: getGuidelinesString(),
                }),
            });

            const output = $("createdTest");
            if (output) {
                output.replaceChildren();

                const message = document.createElement("p");
                message.textContent = "Test created successfully! Test code: ";

                const code = document.createElement("strong");
                code.textContent = data.code;

                message.appendChild(code);
                output.appendChild(message);
            }

            currentTestCode = null;
            editingTest = false;

            resetQuestions();
            resetGuidelines();

            if ($("testName")) $("testName").value = "";
        } catch (error) {
            showMessage("createdTest", error.message, true);
        } finally {
            if (button) button.disabled = false;
        }
    }

    /* ----------------------------------------------------------
       VIEW EXISTING TESTS
       ---------------------------------------------------------- */

    async function loadTests() {
        const container = $("myTests");
        if (!container) return;

        container.textContent = "Loading tests...";

        try {
            const data = await api("/api/admin/tests");
            container.replaceChildren();

            if (!data.tests || data.tests.length === 0) {
                container.textContent = "You haven't created any tests yet.";
                return;
            }

            data.tests.forEach((test) => {
                const card = document.createElement("div");
                card.className = "test-card";

                const heading = document.createElement("h3");
                heading.textContent = test.name || "Untitled test";

                const details = document.createElement("p");
                details.textContent =
                    `Code: ${test.code} | Questions: ${test.questionCount} | ` +
                    `Submissions: ${test.submitted}`;

                const editButton = makeButton("Edit Test", "", async () => {
                    await loadTestForEditing(test.code);
                });

                const resultsButton = makeButton("View Results", "", async () => {
                    await loadResults(test.code);
                });

                card.append(heading, details, editButton, resultsButton);
                container.appendChild(card);
            });
        } catch (error) {
            container.textContent = `Could not load tests: ${error.message}`;
        }
    }

    async function loadTestForEditing(code) {
        try {
            const test = await api(
                `/api/tests/${encodeURIComponent(code)}/edit`
            );

            currentTestCode = test.code;
            currentTestName = test.name || "";
            currentTestGuidelines = test.gradingGuidelines || "";
            editingTest = true;

            questions = {
                objective: (test.questions.objective || []).map((q) => ({
                    id: q.id,
                    text: q.text,
                })),
                semi: (test.questions.semi || []).map((q) => ({
                    id: q.id,
                    text: q.text,
                })),
                qualitative: (test.questions.qualitative || []).map((q) => ({
                    id: q.id,
                    text: q.text,
                })),
            };

            for (const category of Object.keys(categories)) {
                renderQuestions(category);
            }

            loadGuidelinesString(currentTestGuidelines);

            const editView = $("editView");
            if (editView) {
                editView.replaceChildren();

                const heading = document.createElement("h3");
                heading.textContent = `Editing test: ${test.name || test.code}`;

                const codeText = document.createElement("p");
                codeText.textContent = `Test code: ${test.code}`;

                const nameLabel = document.createElement("label");
                nameLabel.htmlFor = "editTestName";
                nameLabel.textContent = "Test name";

                const nameInput = document.createElement("input");
                nameInput.id = "editTestName";
                nameInput.type = "text";
                nameInput.maxLength = 255;
                nameInput.value = currentTestName;
                nameInput.placeholder = "Test name";

                const guidelinesHeading = document.createElement("h4");
                guidelinesHeading.textContent = "Grading guidelines";

                const guidelinesInput = document.createElement("textarea");
                guidelinesInput.id = "editTestGuidelines";
                guidelinesInput.rows = 5;
                guidelinesInput.maxLength = 5000;
                guidelinesInput.value = currentTestGuidelines;
                guidelinesInput.placeholder =
                    "Enter the grading guidelines for this test...";

                const save = makeButton("Save Test Details", "", async () => {
                    await saveTestDetails();
                });

                const cancel = makeButton("Close Editor", "", () => {
                    editView.replaceChildren();
                    currentTestCode = null;
                    editingTest = false;
                    resetQuestions();
                    resetGuidelines();
                });

                editView.append(
                    heading,
                    codeText,
                    nameLabel,
                    nameInput,
                    guidelinesHeading,
                    guidelinesInput,
                    save,
                    cancel
                );

                editView.scrollIntoView({ behavior: "smooth", block: "start" });
            }
        } catch (error) {
            alert(`Could not open test: ${error.message}`);
        }
    }

    async function saveTestDetails() {
        if (!currentTestCode) return;

        const name = $("editTestName")?.value.trim() || "";
        const guidelines = $("editTestGuidelines")?.value.trim() || "";

        try {
            // Your current PATCH route only saves the test name.
            await api(`/api/tests/${encodeURIComponent(currentTestCode)}`, {
                method: "PATCH",
                body: JSON.stringify({ name, grading_guidelines: guidelines }),
            });

            currentTestName = name;
            currentTestGuidelines = guidelines;

            showMessage("editView", "Test details saved.");
            await loadTests();
        } catch (error) {
            alert(`Could not save test details: ${error.message}`);
        }
    }

    async function loadResults(code) {
        const container = $("resultsList");
        if (!container) return;

        container.textContent = "Loading results...";

        try {
            const data = await api(
                `/api/tests/${encodeURIComponent(code)}/results`
            );

            container.replaceChildren();

            const heading = document.createElement("h3");
            heading.textContent = `Results: ${data.name || data.code}`;
            container.appendChild(heading);

            if (!data.submissions.length) {
                const empty = document.createElement("p");
                empty.textContent = "No student submissions yet.";
                container.appendChild(empty);
                return;
            }

            data.submissions.forEach((submission) => {
                const card = document.createElement("div");
                card.className = "result-card";

                const title = document.createElement("h4");
                title.textContent = submission.studentName;

                const score = document.createElement("p");
                score.textContent = submission.gradingFailed
                    ? "Grading failed; answers were saved."
                    : `Score: ${submission.percent}%`;

                const summary = document.createElement("p");
                summary.textContent = submission.summary || "";

                card.append(title, score, summary);

                (submission.questions || []).forEach((q, index) => {
                    const question = document.createElement("p");
                    question.textContent =
                        `${index + 1}. ${q.question || ""}` +
                        (q.score !== undefined ? ` — ${q.score}/10` : "") +
                        (q.feedback ? ` | ${q.feedback}` : "");

                    card.appendChild(question);
                });

                container.appendChild(card);
            });
        } catch (error) {
            container.textContent = `Could not load results: ${error.message}`;
        }
    }

    /* ----------------------------------------------------------
       NAVIGATION
       ---------------------------------------------------------- */

    function showScreen(screenId) {
        const screens = [
            "adminMenu",
            "createScreen",
            "testsScreen",
        ];

        screens.forEach((id) => {
            const screen = $(id);
            if (screen) screen.hidden = id !== screenId;
        });
    }

    function startNewTest() {
        currentTestCode = null;
        editingTest = false;

        resetQuestions();
        resetGuidelines();

        if ($("testName")) $("testName").value = "";
        showMessage("createdTest", "");

        showScreen("createScreen");
    }

    function initialize() {
        // Add-question buttons.
        for (const [category, config] of Object.entries(categories)) {
            $(config.button)?.addEventListener("click", () => {
                addQuestion(category);
            });

            $(config.input)?.addEventListener("keydown", (event) => {
                if (event.key === "Enter") {
                    event.preventDefault();
                    addQuestion(category);
                }
            });
        }

        // Grading guideline buttons and input.
        $("guidelinesAdd")?.addEventListener("click", addGuideline);

        $("grading_guidelines")?.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                event.preventDefault();
                addGuideline();
            }
        });

        // Create test.
        $("createTest")?.addEventListener("click", createTest);

        // Clear all questions and guidelines.
        document.querySelector(".clearQuestion")?.addEventListener("click", () => {
            if (!confirm("Clear all questions and grading guidelines?")) return;
            resetQuestions();
            resetGuidelines();
        });

        // Navigation.
        $("menuCreateButton")?.addEventListener("click", startNewTest);

        $("menuViewButton")?.addEventListener("click", async () => {
            showScreen("testsScreen");
            await loadTests();
        });

        $("createBackButton")?.addEventListener("click", () => {
            showScreen("adminMenu");
        });

        $("testsBackButton")?.addEventListener("click", () => {
            showScreen("adminMenu");
        });

        // Display the empty guidelines state immediately.
        renderGuidelines();

        // Initial screen is controlled by the admin login script.
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initialize);
    } else {
        initialize();
    }

    // Optional functions for debugging from the browser console.
    window.AINTAdminTests = {
        renderGuidelines,
        addGuideline,
        loadTests,
        loadTestForEditing,
        getGuidelinesString,
    };
})();
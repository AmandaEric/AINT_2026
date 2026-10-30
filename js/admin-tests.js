/* ==========================================================
   AINT ADMIN TESTS
   - Add, display, and remove questions (with points and an optional image)
   - Add, display, and remove grading guidelines
   - Optional timer (enabled + minutes)
   - Create tests
   - View existing tests
   - Edit test names, questions, grading guidelines, and timer
   ========================================================== */

(() => {
    "use strict";
    const API = BACKEND_URL;   // defined in core.js

    const DEFAULT_POINTS = 10;
    const MAX_POINTS = 100;

    const categories = {
        objective: {
            input: "objectiveInput",
            button: "objectiveAdd",
            list: "objectiveList",
            label: "Objective",
            points: "objectivePoints",
            image: "objectiveImage",
        },
        semi: {
            input: "semiInput",
            button: "semiAdd",
            list: "semiList",
            label: "Semi-Objective",
            points: "semiPoints",
            image: "semiImage",
        },
        qualitative: {
            input: "qualitativeInput",
            button: "qualitativeAdd",
            list: "qualitativeList",
            label: "Qualitative",
            points: "qualitativePoints",
            image: "qualitativeImage",
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
       IMAGES
       Resizes the chosen image in the browser and returns it as a
       small JPEG data URL, so it can be sent as JSON.
       ---------------------------------------------------------- */

    function fileToDataUrl(file, maxSize = 800) {
        return new Promise((resolve, reject) => {
            if (!file.type.startsWith("image/")) {
                reject(new Error("Please choose an image file."));
                return;
            }

            const reader = new FileReader();
            reader.onerror = () => reject(new Error("Could not read the image."));
            reader.onload = () => {
                const img = new Image();
                img.onerror = () => reject(new Error("That file is not a valid image."));
                img.onload = () => {
                    const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
                    const canvas = document.createElement("canvas");
                    canvas.width = Math.round(img.width * scale);
                    canvas.height = Math.round(img.height * scale);

                    const ctx = canvas.getContext("2d");
                    // White background so transparent PNGs don't turn black in a JPEG
                    ctx.fillStyle = "#ffffff";
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                    resolve(canvas.toDataURL("image/jpeg", 0.8));
                };
                img.src = reader.result;
            };
            reader.readAsDataURL(file);
        });
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
            text.textContent =
                `${index + 1}. ${question.text} (${question.points || DEFAULT_POINTS} pts)`;

            item.appendChild(text);

            if (question.image) {
                const thumb = document.createElement("img");
                thumb.src = question.image;
                thumb.alt = "Question image";
                thumb.style.maxHeight = "48px";
                thumb.style.marginLeft = "8px";
                thumb.style.verticalAlign = "middle";
                item.appendChild(thumb);
            }

            const remove = makeButton("Remove", "remove-question", () => {
                if (question.id && currentTestCode && editingTest) {
                    deleteSavedQuestion(category, question, item);
                    return;
                }

                questions[category].splice(index, 1);
                renderQuestions(category);
            });

            item.appendChild(remove);
            list.appendChild(item);
        });
    }

    // Clears the points and image inputs for one category
    function resetQuestionExtras(category) {
        const config = categories[category];

        if ($(config.points)) $(config.points).value = DEFAULT_POINTS;
        if ($(config.image)) $(config.image).value = "";
    }

    async function addQuestion(category) {
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

        // Points
        const points = parseInt($(config.points)?.value, 10) || DEFAULT_POINTS;

        if (points < 1 || points > MAX_POINTS) {
            alert(`Points must be between 1 and ${MAX_POINTS}.`);
            return;
        }

        // Optional image
        const file = $(config.image)?.files[0];
        let image = null;

        if (file) {
            try {
                image = await fileToDataUrl(file);
            } catch (error) {
                alert(error.message);
                return;
            }
        }

        const question = { text, points, image };

        // Editing a saved test: send straight to the server
        if (editingTest && currentTestCode) {
            await addSavedQuestion(category, question);
            return;
        }

        // New test: keep it in memory until "Create Test"
        questions[category].push(question);
        input.value = "";
        resetQuestionExtras(category);
        renderQuestions(category);
        input.focus();
    }

    async function addSavedQuestion(category, question) {
        try {
            console.log("QUESTION BEING SAVED:", question);
            console.log("QUESTION TEXT:", question.text);
            console.log("QUESTION TEXT TYPE:", typeof question.text);
            await api(
                `/api/tests/${encodeURIComponent(currentTestCode)}/questions`,
                {
                    method: "POST",
                    body: JSON.stringify({
                        category,
                        text: question.text,
                        points: question.points,
                        image: question.image,
                    }),
                }
            );

            const input = $(categories[category].input);
            if (input) input.value = "";
            resetQuestionExtras(category);

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
            resetQuestionExtras(category);
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
       TIMER (optional)
       ---------------------------------------------------------- */

    function resetTimerInputs() {
        if ($("timerEnabled")) $("timerEnabled").checked = false;
        if ($("timeLimit")) $("timeLimit").value = "";
        if ($("timerSettings")) $("timerSettings").hidden = true;
    }

    // Reads the create-screen timer inputs.
    // Returns { error } if invalid, otherwise the two fields for the server.
    function getTimerSettings() {
        const enabled = $("timerEnabled")?.checked || false;
        const minutes = parseInt($("timeLimit")?.value, 10);

        if (enabled && (!Number.isInteger(minutes) || minutes < 1 || minutes > 600)) {
            return { error: "Enter a time limit between 1 and 600 minutes." };
        }

        return {
            timer_enabled: enabled,
            time_limit_minutes: enabled ? minutes : null,
        };
    }

    /* ----------------------------------------------------------
       CREATE TEST
       ---------------------------------------------------------- */

    async function createTest() {
        const button = $("createTest");
        const name = $("testName")?.value.trim() || "";

        // Each question is now an object: { text, points, image }
        const toPayload = (q) => ({
            text: q.text,
            points: q.points || DEFAULT_POINTS,
            image: q.image || null,
        });

        const questionPayload = {
            objective: questions.objective.map(toPayload),
            semi: questions.semi.map(toPayload),
            qualitative: questions.qualitative.map(toPayload),
        };

        const totalQuestions = Object.values(questionPayload)
            .reduce((total, group) => total + group.length, 0)

        if (totalQuestions === 0) {
            alert("Please add at least one question before creating the test.");
            return;
        }

        const timer = getTimerSettings();
        if (timer.error) {
            alert(timer.error);
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
                    timer_enabled: timer.timer_enabled,
                    time_limit_minutes: timer.time_limit_minutes,
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
            resetTimerInputs();

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

            const mapQuestion = (q) => ({
                id: q.id,
                text: q.text,
                points: q.points || DEFAULT_POINTS,
                image: q.image || null,
            });

            questions = {
                objective: (test.questions.objective || []).map(mapQuestion),
                semi: (test.questions.semi || []).map(mapQuestion),
                qualitative: (test.questions.qualitative || []).map(mapQuestion),
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

                // ----- Timer controls -----
                const timerLabel = document.createElement("label");
                const timerCheckbox = document.createElement("input");
                timerCheckbox.type = "checkbox";
                timerCheckbox.id = "editTimerEnabled";
                timerCheckbox.checked = Boolean(test.timerEnabled);
                timerLabel.append(timerCheckbox, " Enable timer");

                const timerMinutes = document.createElement("input");
                timerMinutes.type = "number";
                timerMinutes.id = "editTimeLimit";
                timerMinutes.min = "1";
                timerMinutes.max = "600";
                timerMinutes.placeholder = "Time limit (minutes)";
                timerMinutes.value = test.timeLimitMinutes || "";
                timerMinutes.hidden = !timerCheckbox.checked;

                timerCheckbox.addEventListener("change", () => {
                    timerMinutes.hidden = !timerCheckbox.checked;
                });

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
                    timerLabel,
                    timerMinutes,
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

        const enabled = $("editTimerEnabled")?.checked || false;
        const minutes = parseInt($("editTimeLimit")?.value, 10);

        if (enabled && (!Number.isInteger(minutes) || minutes < 1 || minutes > 600)) {
            alert("Enter a time limit between 1 and 600 minutes.");
            return;
        }

        try {
            await api(`/api/tests/${encodeURIComponent(currentTestCode)}`, {
                method: "PATCH",
                body: JSON.stringify({
                    name,
                    grading_guidelines: guidelines,
                    timer_enabled: enabled,
                    time_limit_minutes: enabled ? minutes : null,
                }),
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
                        (q.score !== undefined
                            ? ` — ${q.score}/${q.maxPoints || DEFAULT_POINTS}`
                            : "") +
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
        resetTimerInputs();

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

        // Timer checkbox shows/hides the minutes input.
        $("timerEnabled")?.addEventListener("change", (event) => {
            if ($("timerSettings")) {
                $("timerSettings").hidden = !event.target.checked;
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
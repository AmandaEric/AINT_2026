/* ==========================================================
   AINT ADMIN TESTS
   - Add, display, and remove questions (with points and an optional image)
   - Add, display, and remove grading guidelines
   - Optional timer (enabled + minutes)
   - Optional limit on the number of attempts per student
   - Create tests
   - Upload and replace PDF reading materials
   - View existing tests
   - Edit test names, questions, grading guidelines, timer and attempts

   Needs core.js to be loaded first (BACKEND_URL, AINT_LIMITS).
   ========================================================== */

   (() => {
    "use strict";

    const API = BACKEND_URL;

    const LIMITS = typeof AINT_LIMITS !== "undefined"
        ? AINT_LIMITS
        : {
            defaultPoints: 10,
            maxPoints: 100,
            maxQuestionLength: 1000,
            maxGuidelinesLength: 5000,
        };

    const DEFAULT_POINTS = LIMITS.defaultPoints;
    const MAX_POINTS = LIMITS.maxPoints;
    const MAX_QUESTION_LENGTH = LIMITS.maxQuestionLength;
    const MAX_GUIDELINES_LENGTH = LIMITS.maxGuidelinesLength;

    // Must match cleanMaxAttempts() in server.js
    const MAX_ATTEMPTS_LIMIT = LIMITS.maxAttempts || 100;

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

    let guidelineItems = [];
    let allowedTabs = [];
    let currentTestCode = null;
    let currentTestName = "";
    let currentTestGuidelines = "";
    let editingTest = false;

    const $ = (id) => document.getElementById(id);

    function getToken() {
        return sessionStorage.getItem("adminToken") || "";
    }

    /* ----------------------------------------------------------
       API
       ---------------------------------------------------------- */

    async function api(path, options = {}) {
        const token = getToken();

        if (!token) {
            throw new Error("You are not logged in. Please log in again.");
        }

        // FormData must NOT receive an application/json header.
        // The browser automatically adds the multipart boundary.
        const isFormData = options.body instanceof FormData;

        const headers = {
            ...(options.body && !isFormData
                ? { "Content-Type": "application/json" }
                : {}),
            Authorization: `Bearer ${token}`,
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
            throw new Error(
                `Server returned an invalid response (${response.status}).`
            );
        }

        if (!response.ok || data.success === false) {
            throw new Error(
                data.error || `Request failed (${response.status}).`
            );
        }

        return data;
    }

    /* ----------------------------------------------------------
       MESSAGES AND BUTTONS
       ---------------------------------------------------------- */

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

        if (className) {
            button.className = className;
        }

        button.addEventListener("click", onClick);

        return button;
    }

    /* ----------------------------------------------------------
       PDF READING MATERIALS
       ---------------------------------------------------------- */

    async function uploadReadingMaterial(code, file) {
        if (!file) return null;

        if (file.type !== "application/pdf") {
            throw new Error("Please choose a PDF file.");
        }

        if (file.size > 10 * 1024 * 1024) {
            throw new Error("PDF must be 10 MB or smaller.");
        }

        const formData = new FormData();

        // This must match pdfUpload.single("readingMaterial")
        formData.append("readingMaterial", file);

        return await api(
            `/api/tests/${encodeURIComponent(code)}/reading-material`,
            {
                method: "POST",
                body: formData,
            }
        );
    }

    async function checkReadingMaterial(code) {
        try {
            const data = await api(
                `/api/tests/${encodeURIComponent(code)}/reading-material`
            );

            return data;
        } catch (error) {
            console.error("Could not check reading material:", error);
            return {
                exists: false,
                fileName: "",
            };
        }
    }

    function resetReadingMaterialInput() {
        const input = $("readingMaterial");

        if (input) {
            input.value = "";
        }

        showMessage("readingMaterialStatus", "");
    }

    async function uploadSelectedReadingMaterial(code) {
        const input = $("readingMaterial");
        const file = input?.files?.[0];

        // No new PDF selected. Leave the existing PDF unchanged.
        if (!file) {
            return {
                uploaded: false,
                success: true,
            };
        }

        showMessage("readingMaterialStatus", "Uploading PDF...");

        try {
            const result = await uploadReadingMaterial(code, file);

            showMessage(
                "readingMaterialStatus",
                `PDF uploaded successfully: ${result.fileName || file.name}`
            );

            input.value = "";

            return {
                uploaded: true,
                success: true,
                fileName: result.fileName || file.name,
            };
        } catch (error) {
            showMessage(
                "readingMaterialStatus",
                `PDF upload failed: ${error.message}`,
                true
            );

            return {
                uploaded: false,
                success: false,
                error: error.message,
            };
        }
    }

    /* ----------------------------------------------------------
       IMAGES
       ---------------------------------------------------------- */

    function fileToDataUrl(file, maxSize = 800) {
        return new Promise((resolve, reject) => {
            if (!file.type.startsWith("image/")) {
                reject(new Error("Please choose an image file."));
                return;
            }

            const reader = new FileReader();

            reader.onerror = () => {
                reject(new Error("Could not read the image."));
            };

            reader.onload = () => {
                const img = new Image();

                img.onerror = () => {
                    reject(new Error("That file is not a valid image."));
                };

                img.onload = () => {
                    const scale = Math.min(
                        1,
                        maxSize / Math.max(img.width, img.height)
                    );

                    const canvas = document.createElement("canvas");

                    canvas.width = Math.round(img.width * scale);
                    canvas.height = Math.round(img.height * scale);

                    const ctx = canvas.getContext("2d");

                    ctx.fillStyle = "#ffffff";
                    ctx.fillRect(0, 0, canvas.width, canvas.height);

                    ctx.drawImage(
                        img,
                        0,
                        0,
                        canvas.width,
                        canvas.height
                    );

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

            const edit = makeButton("Edit", "edit-question", () => {
                showQuestionEditor(category, question, index, item);
            });

            const remove = makeButton("Remove", "remove-question", () => {
                if (question.id && currentTestCode && editingTest) {
                    deleteSavedQuestion(category, question, item);
                    return;
                }

                questions[category].splice(index, 1);
                renderQuestions(category);
            });

            item.append(edit, remove);
            list.appendChild(item);
        });
    }

    function showQuestionEditor(category, question, index, item) {
        item.replaceChildren();

        const editor = document.createElement("div");
        editor.className = "question-editor";

        const questionLabel = document.createElement("label");
        questionLabel.textContent = "Question";

        const questionInput = document.createElement("textarea");
        questionInput.className = "admin-question-text";
        questionInput.rows = 4;
        questionInput.maxLength = MAX_QUESTION_LENGTH;
        questionInput.value = question.text;

        const pointsLabel = document.createElement("label");
        pointsLabel.textContent = "Points";

        const pointsInput = document.createElement("input");
        pointsInput.type = "number";
        pointsInput.min = "1";
        pointsInput.max = String(MAX_POINTS);
        pointsInput.value = question.points || DEFAULT_POINTS;

        const save = makeButton("Save Changes", "", async () => {
            const newText = questionInput.value.trim();
            const newPoints = Number(pointsInput.value);

            if (!newText) {
                alert("Question text cannot be empty.");
                questionInput.focus();
                return;
            }

            if (newText.length > MAX_QUESTION_LENGTH) {
                alert(
                    `Questions can be at most ${MAX_QUESTION_LENGTH} characters.`
                );
                return;
            }

            if (
                !Number.isInteger(newPoints) ||
                newPoints < 1 ||
                newPoints > MAX_POINTS
            ) {
                alert(`Points must be between 1 and ${MAX_POINTS}.`);
                pointsInput.focus();
                return;
            }

            const updatedQuestion = {
                ...question,
                text: newText,
                points: newPoints,
            };

            if (question.id && currentTestCode && editingTest) {
                try {
                    await api(
                        `/api/tests/${encodeURIComponent(currentTestCode)}/questions/${question.id}`,
                        {
                            method: "PATCH",
                            body: JSON.stringify({
                                text: newText,
                                points: newPoints,
                            }),
                        }
                    );

                    questions[category][index] = updatedQuestion;
                    renderQuestions(category);
                } catch (error) {
                    alert(`Could not save question: ${error.message}`);
                }

                return;
            }

            questions[category][index] = updatedQuestion;
            renderQuestions(category);
        });

        const cancel = makeButton("Cancel", "", () => {
            renderQuestions(category);
        });

        editor.append(
            questionLabel,
            questionInput,
            pointsLabel,
            pointsInput,
            save,
            cancel
        );

        item.appendChild(editor);
        questionInput.focus();
    }

    function resetQuestionExtras(category) {
        const config = categories[category];

        if ($(config.points)) {
            $(config.points).value = DEFAULT_POINTS;
        }

        if ($(config.image)) {
            $(config.image).value = "";
        }
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

        if (text.length > MAX_QUESTION_LENGTH) {
            alert(`Questions can be at most ${MAX_QUESTION_LENGTH} characters.`);
            return;
        }

        const points =
            parseInt($(config.points)?.value, 10) || DEFAULT_POINTS;

        if (points < 1 || points > MAX_POINTS) {
            alert(`Points must be between 1 and ${MAX_POINTS}.`);
            return;
        }

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

        const question = {
            text,
            points,
            image,
        };

        if (editingTest && currentTestCode) {
            await addSavedQuestion(category, question);
            return;
        }

        questions[category].push(question);

        input.value = "";
        resetQuestionExtras(category);
        renderQuestions(category);
        input.focus();
    }

    async function addSavedQuestion(category, question) {
        try {
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

            if (input) {
                input.value = "";
            }

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
                {
                    method: "DELETE",
                }
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

            if (input) {
                input.value = "";
            }

            resetQuestionExtras(category);
            renderQuestions(category);
        }
    }

    /* ----------------------------------------------------------
       GRADING GUIDELINES
       ---------------------------------------------------------- */

    function renderGuidelines() {
        const list = $("guidelinesList");

        if (!list) return;

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
            console.error(
                'Could not find element with id="grading_guidelines".'
            );
            return;
        }

        const text = input.value.trim();

        if (!text) {
            input.focus();
            return;
        }

        if (text.length > MAX_GUIDELINES_LENGTH) {
            alert(
                `Guidelines can be at most ${MAX_GUIDELINES_LENGTH} characters each.`
            );
            return;
        }

        const totalLength = guidelineItems.reduce(
            (total, item) => total + item.length + 1,
            0
        );

        if (totalLength + text.length > MAX_GUIDELINES_LENGTH) {
            alert(
                `The combined grading guidelines cannot exceed ${MAX_GUIDELINES_LENGTH} characters.`
            );
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

        if (input) {
            input.value = "";
        }

        renderGuidelines();
    }

    function getGuidelinesString() {
        return guidelineItems.join("\n");
    }

    function loadGuidelinesString(value) {
        const text = String(value || "").trim();

        guidelineItems = text
            ? text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
            : [];

        renderGuidelines();
    }

    /* ----------------------------------------------------------
       TIMER
       ---------------------------------------------------------- */

    function resetTimerInputs() {
        if ($("timerEnabled")) {
            $("timerEnabled").checked = false;
        }

        if ($("timeLimit")) {
            $("timeLimit").value = "";
        }

        if ($("timerSettings")) {
            $("timerSettings").hidden = true;
        }
    }

    function getTimerSettings() {
        const enabled = $("timerEnabled")?.checked || false;
        const minutes = parseInt($("timeLimit")?.value, 10);

        if (
            enabled &&
            (!Number.isInteger(minutes) || minutes < 1 || minutes > 600)
        ) {
            return {
                error: "Enter a time limit between 1 and 600 minutes.",
            };
        }

        return {
            timer_enabled: enabled,
            time_limit_minutes: enabled ? minutes : null,
        };
    }

    /* ----------------------------------------------------------
       ALLOWED ATTEMPTS
       max_attempts is a whole number, or null for "no limit".
       ---------------------------------------------------------- */

    function resetAttemptInputs() {
        if ($("allowedAttemptsEnabled")) {
            $("allowedAttemptsEnabled").checked = false;
        }

        if ($("maxAttempts")) {
            $("maxAttempts").value = 1;
        }

        if ($("attemptSettings")) {
            $("attemptSettings").hidden = true;
        }
    }

    // Shows a saved value from the server (a number, or null for no limit)
    function showAttemptSettings(maxAttempts) {
        const hasLimit =
            maxAttempts !== null &&
            maxAttempts !== undefined &&
            Number(maxAttempts) > 0;

        if ($("allowedAttemptsEnabled")) {
            $("allowedAttemptsEnabled").checked = hasLimit;
        }

        if ($("maxAttempts")) {
            $("maxAttempts").value = hasLimit ? Number(maxAttempts) : 1;
        }

        if ($("attemptSettings")) {
            $("attemptSettings").hidden = !hasLimit;
        }
    }

    // Returns { error } if invalid, otherwise { max_attempts }
    function getAttemptSettings() {
        const enabled = $("allowedAttemptsEnabled")?.checked || false;
        const attempts = parseInt($("maxAttempts")?.value, 10);

        if (
            enabled &&
            (!Number.isInteger(attempts) ||
                attempts < 1 ||
                attempts > MAX_ATTEMPTS_LIMIT)
        ) {
            return {
                error: `Enter a number of attempts between 1 and ${MAX_ATTEMPTS_LIMIT}.`,
            };
        }

        return {
            max_attempts: enabled ? attempts : null,
        };
    }
    /* ----------------------------------------------------------
    APPROVED WEBSITES
    ---------------------------------------------------------- */

    // Display the approved websites in the admin page.
    function renderAllowedTabs() {
        const list = $("allowedTabsList");
        if (!list) return;

        list.replaceChildren();

        if (allowedTabs.length === 0) {
            const empty = document.createElement("p");
            empty.textContent = "No approved websites added.";
            list.appendChild(empty);
            return;
        }

        allowedTabs.forEach((website, index) => {
            const item = document.createElement("div");
            item.className = "admin-list-item";

            const description = document.createElement("span");
            description.textContent =
                `${website.allowed_url} — ${
                    website.match_type === "DOMAIN"
                        ? "Entire domain"
                        : "Exact URL"
                }`;

            const remove = makeButton("Remove", "remove-website", () => {
                allowedTabs.splice(index, 1);
                renderAllowedTabs();
            });

            item.append(description, remove);
            list.appendChild(item);
        });
    }

    // Add a website when the admin clicks the button.
    function addAllowedTab() {
        const urlInput = $("allowedTabUrl");
        const matchInput = $("allowedTabMatchType");

        if (!urlInput || !matchInput) return;

        const url = urlInput.value.trim();
        const matchType = matchInput.value;

        if (!url) {
            alert("Please enter a website URL or domain.");
            urlInput.focus();
            return;
        }

        const duplicate = allowedTabs.some(
            website =>
                website.allowed_url.toLowerCase() === url.toLowerCase() &&
                website.match_type === matchType
        );

        if (duplicate) {
            alert("That website has already been added.");
            return;
        }

        allowedTabs.push({
            allowed_url: url,
            match_type: matchType
        });

        urlInput.value = "";
        renderAllowedTabs();
        urlInput.focus();
    }

    // Load saved websites when opening an existing test.
    async function loadAllowedTabs(code) {
        const data = await api(
            `/api/tests/${encodeURIComponent(code)}/allowed-tabs`
        );

        allowedTabs = data.allowedTabs || [];
        renderAllowedTabs();
    }

    // Save the current website list to the database.
    async function saveAllowedTabs(code) {
        await api(
            `/api/tests/${encodeURIComponent(code)}/allowed-tabs`,
            {
                method: "PUT",
                body: JSON.stringify({
                    allowedTabs: allowedTabs
                })
            }
        );
    }

    // Clear the list when starting a completely new test.
    function resetAllowedTabs() {
        allowedTabs = [];

        if ($("allowedTabUrl")) {
            $("allowedTabUrl").value = "";
        }

        renderAllowedTabs();
    }

    /* ----------------------------------------------------------
       CREATE TEST
       ---------------------------------------------------------- */

    async function createTest() {
        const button = $("createTest");
        const name = $("testName")?.value.trim() || "";

        // When editing, save the test details and upload a replacement
        // PDF only if a new PDF has been selected.
        if (editingTest) {
            await saveTestDetails();
            return;
        }

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
            .reduce((total, group) => total + group.length, 0);

        if (totalQuestions === 0) {
            alert("Please add at least one question before creating the test.");
            return;
        }

        const timer = getTimerSettings();

        if (timer.error) {
            alert(timer.error);
            return;
        }

        const attempts = getAttemptSettings();

        if (attempts.error) {
            alert(attempts.error);
            return;
        }

        if (button) {
            button.disabled = true;
        }

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
                    max_attempts: attempts.max_attempts,
                }),
            });
            // Save approved websites for this newly created test.
            let websitesSaved = true;

            try {
                await saveAllowedTabs(data.code);
            } catch (error) {
                websitesSaved = false;
                console.error("Could not save approved websites:", error);
            }

            // The test now exists. Upload its PDF separately.
            const pdfResult = await uploadSelectedReadingMaterial(data.code);

            const output = $("createdTest");

            if (output) {
                output.replaceChildren();

                const message = document.createElement("p");

                message.textContent = "Test created successfully! Test code: ";

                if (!websitesSaved) {
                    message.textContent =
                        "Test created, but approved websites could not be saved. Test code: ";
                } else if (!pdfResult.success) {
                    message.textContent =
                        "Test created, but the PDF upload failed. Test code: ";
                }

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
            resetAttemptInputs();
            resetAllowedTabs();

            if ($("testName")) {
                $("testName").value = "";
            }

            // Only clear the PDF input if the upload succeeded or no file
            // was selected. A failed upload remains selected for retry.
            if (pdfResult.success) {
                resetReadingMaterialInput();
            }

            if (!pdfResult.success) {
                showMessage(
                    "readingMaterialStatus",
                    `The test was created with code ${data.code}, but the PDF could not be uploaded: ${pdfResult.error}`,
                    true
                );
            }
        } catch (error) {
            showMessage("createdTest", error.message, true);
        } finally {
            if (button) {
                button.disabled = false;
            }
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
                container.textContent =
                    "You haven't created any tests yet.";
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

                const editButton = makeButton(
                    "Edit Test",
                    "",
                    async () => {
                        await loadTestForEditing(test.code);
                    }
                );

                const resultsButton = makeButton(
                    "View Results",
                    "",
                    async () => {
                        await loadResults(test.code);
                    }
                );

                const deleteButton = makeButton("Delete Test", "delete-test", async () => {
                    const confirmed = confirm(
                        `Are you sure you want to permanently delete "${test.name}" (${test.code})?\n\n` +
                        "This will delete ALL student attempts, grades, recordings, " +
                        "proctoring events, questions, and uploaded materials.\n\n" +
                        "This cannot be undone."
                    );

                    if (!confirmed) return;

                    deleteButton.disabled = true;
                    deleteButton.textContent = "Deleting...";

                    try {
                        await api(`/api/tests/${encodeURIComponent(test.code)}`, {
                            method: "DELETE"
                        });

                        alert(`Test "${test.name}" was successfully deleted.`);

                        await loadTests();

                    } catch (error) {
                        alert(`Could not delete test: ${error.message}`);
                        deleteButton.disabled = false;
                        deleteButton.textContent = "Delete Test";
                    }
                });


                card.append(
                    heading,
                    details,
                    editButton,
                    resultsButton,
                    deleteButton
                );

                container.appendChild(card);
            });
        } catch (error) {
            container.textContent =
                `Could not load tests: ${error.message}`;
        }
    }

    /* ----------------------------------------------------------
       EDIT EXISTING TEST
       ---------------------------------------------------------- */

    async function loadTestForEditing(code) {
        try {
            const test = await api(
                `/api/tests/${encodeURIComponent(code)}/edit`
            );

            currentTestCode = test.code;
            currentTestName = test.name || "";
            currentTestGuidelines = test.gradingGuidelines || "";
            editingTest = true;
            await loadAllowedTabs(test.code);

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

            if ($("testName")) {
                $("testName").value = currentTestName;
            }

            loadGuidelinesString(currentTestGuidelines);

            if ($("timerEnabled")) {
                $("timerEnabled").checked = Boolean(test.timerEnabled);
            }

            if ($("timeLimit")) {
                $("timeLimit").value = test.timeLimitMinutes || "";
            }

            if ($("timerSettings")) {
                $("timerSettings").hidden = !test.timerEnabled;
            }

            // Allowed attempts (null means no limit)
            showAttemptSettings(test.maxAttempts);

            // Clear any previously selected PDF.
            resetReadingMaterialInput();

            // Check whether this test already has a PDF.
            const material = await checkReadingMaterial(test.code);

            if (material.exists) {
                showMessage(
                    "readingMaterialStatus",
                    `Current PDF: ${material.fileName}. Choose another PDF to replace it.`
                );
            } else {
                showMessage(
                    "readingMaterialStatus",
                    "No PDF is currently attached to this test."
                );
            }

            if ($("createHeading")) {
                $("createHeading").textContent = "Edit Existing Test";
            }

            if ($("createTest")) {
                $("createTest").textContent = "Save Test Changes";
            }

            showMessage(
                "createdTest",
                `Editing test ${test.code}. Changes to existing questions save individually.`
            );

            showScreen("createScreen");

            $("createScreen")?.scrollIntoView({
                behavior: "smooth",
                block: "start",
            });
        } catch (error) {
            alert(`Could not open test: ${error.message}`);
        }
    }

    async function saveTestDetails() {
        if (!currentTestCode) return;

        const name = $("testName")?.value.trim() || "";
        const guidelines = getGuidelinesString();

        const timer = getTimerSettings();

        if (timer.error) {
            alert(timer.error);
            return;
        }

        const attempts = getAttemptSettings();

        if (attempts.error) {
            alert(attempts.error);
            return;
        }

        const button = $("createTest");

        if (button) {
            button.disabled = true;
        }

        try {
            await api(
                `/api/tests/${encodeURIComponent(currentTestCode)}`,
                {
                    method: "PATCH",
                    body: JSON.stringify({
                        name,
                        grading_guidelines: guidelines,
                        timer_enabled: timer.timer_enabled,
                        time_limit_minutes: timer.time_limit_minutes,
                        max_attempts: attempts.max_attempts,
                    }),
                }
            );
            await saveAllowedTabs(currentTestCode);

            currentTestName = name;
            currentTestGuidelines = guidelines;

            // Upload a new PDF if one was selected.
            // If none was selected, the current PDF stays unchanged.
            const pdfResult =
                await uploadSelectedReadingMaterial(currentTestCode);

            if (pdfResult.success) {
                showMessage(
                    "createdTest",
                    "Your test changes were saved successfully!"
                );
            } else {
                showMessage(
                    "createdTest",
                    `Test details were saved, but the PDF upload failed: ${pdfResult.error}`,
                    true
                );
            }

            await loadTests();
        } catch (error) {
            alert(`Could not save test details: ${error.message}`);
        } finally {
            if (button) {
                button.disabled = false;
            }
        }
    }

    /* ----------------------------------------------------------
       RESULTS
       ---------------------------------------------------------- */
    // Fetch a recording using the admin's authorization token.
        async function fetchRecording(code, recordingId, download = false) {
            const downloadQuery = download ? "?download=1" : "";

            const response = await fetch(
                `${API}/api/tests/${encodeURIComponent(code)}/recordings/${recordingId}${downloadQuery}`,
                {
                    headers: {
                        Authorization: `Bearer ${getToken()}`
                    }
                }
            );

            if (!response.ok) {
                let message = "Could not load recording.";

                try {
                    const data = await response.json();
                    message = data.error || message;
                } catch {
                }

                throw new Error(message);
            }

            return await response.blob();
        }


        // Display Play and Download buttons for one recording.
        function renderRecording(recording, code, container) {
            const item = document.createElement("div");
            item.className = "recording-item";

            const description = document.createElement("p");

            description.textContent =
                `${recording.kind || "Video"} recording` +
                ` — ${Math.round((recording.duration_ms || 0) / 1000)} seconds`;

            const videoContainer = document.createElement("div");

            const playButton = makeButton("Play Recording", "", async () => {
                playButton.disabled = true;
                playButton.textContent = "Loading...";

                try {
                    const blob = await fetchRecording(
                        code,
                        recording.id
                    );

                    const videoUrl = URL.createObjectURL(blob);

                    const video = document.createElement("video");
                    video.controls = true;
                    video.preload = "metadata";
                    video.src = videoUrl;
                    video.style.display = "block";
                    video.style.width = "100%";
                    video.style.maxWidth = "600px";
                    video.style.marginTop = "10px";

                    videoContainer.replaceChildren(video);

                    await video.play();

                    playButton.textContent = "Play Again";
                } catch (error) {
                    alert(`Could not play recording: ${error.message}`);
                    playButton.textContent = "Play Recording";
                } finally {
                    playButton.disabled = false;
                }
            });

            const downloadButton = makeButton("Download", "", async () => {
                downloadButton.disabled = true;

                try {
                    const blob = await fetchRecording(
                        code,
                        recording.id,
                        true
                    );

                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");

                    link.href = url;
                    link.download =
                        `AINT-recording-${recording.id}.${blob.type.includes("mp4") ? "mp4" : "webm"}`;

                    document.body.appendChild(link);
                    link.click();
                    link.remove();

                    URL.revokeObjectURL(url);
                } catch (error) {
                    alert(`Could not download recording: ${error.message}`);
                } finally {
                    downloadButton.disabled = false;
                }
            });

            item.append(
                description,
                playButton,
                downloadButton,
                videoContainer
            );

            container.appendChild(item);
        }

        function interpretProctoringEvent(event) {
            const interpretations = {
                WINDOW_BLUR: {
                    title: "Exam window lost focus",
                    description: "The exam window lost focus. The student may have interacted with another application.",
                    severity: "review"
                },
                TAB_HIDDEN: {
                    title: "Exam tab hidden",
                    description: "The exam tab became hidden or the student navigated away from it.",
                    severity: "review"
                },
                UNAUTHORIZED_TAB_OPENED: {
                    title: "Unauthorized tab opened",
                    description: "A browser tab was opened that was not on the approved website list.",
                    severity: "review"
                },
                UNAUTHORIZED_TAB_SWITCHED: {
                    title: "Unauthorized tab switch",
                    description: "The student switched to a browser tab that was not approved for this exam.",
                    severity: "review"
                },
                UNAUTHORIZED_WEBSITE_ACTIVE: {
                    title: "Unauthorized website active",
                    description: "The student accessed a website that was not approved for this exam.",
                    severity: "review"
                },
                FULLSCREEN_EXIT: {
                    title: "Fullscreen exited",
                    description: "The student exited the required fullscreen exam environment.",
                    severity: "review"
                },
                PAGE_RELOAD: {
                    title: "Exam page reloaded",
                    description: "The exam page was refreshed or reloaded during the attempt.",
                    severity: "review"
                },
                WINDOW_NOT_MAXIMIZED: {
                    title: "Browser not maximized",
                    description: "The browser window was not maximized.",
                    severity: "review"
                },
                CAMERA_LOST: {
                    title: "Camera connection interrupted",
                    description: "The camera connection was interrupted during the exam.",
                    severity: "technical"
                },
                MIC_LOST: {
                    title: "Microphone connection interrupted",
                    description: "The microphone connection was interrupted during the exam.",
                    severity: "technical"
                },
                CAMERA_UPLOAD_FAILED: {
                    title: "Recording upload failed",
                    description: "A camera or microphone recording could not be uploaded successfully.",
                    severity: "technical"
                },
                WINDOW_FOCUS: {
                    title: "Student returned to exam window",
                    description: "The exam window regained focus.",
                    severity: "context"
                },
                TAB_VISIBLE: {
                    title: "Student returned to exam tab",
                    description: "The exam tab became visible again.",
                    severity: "context"
                },
                WINDOW_MAXIMIZED: {
                    title: "Browser maximized",
                    description: "The browser window was maximized.",
                    severity: "context"
                }
            };

            const result = interpretations[event.event_type] || {
                title: event.event_type || "Unknown event",
                description: "An unrecognized proctoring event was recorded.",
                severity: "technical"
            };

            return {
                ...event,
                ...result
            };
        }


        // Display interpreted proctoring events for one exam attempt.
        function renderProctoringReport(events, container) {
            const section = document.createElement("div");
            section.className = "proctoring-report";

            const heading = document.createElement("h4");
            heading.textContent = "Proctoring Event Report";
            section.appendChild(heading);

            if (!events || events.length === 0) {
                const empty = document.createElement("p");
                empty.textContent = "No proctoring events were recorded for this attempt.";
                section.appendChild(empty);
                container.appendChild(section);
                return;
            }

            const reviewCount = events.filter(
                event => event.severity === "review"
            ).length;

            const technicalCount = events.filter(
                event => event.severity === "technical"
            ).length;

            const summary = document.createElement("p");
            summary.textContent =
                `${reviewCount} event(s) requiring review | ` +
                `${technicalCount} technical event(s)`;
            section.appendChild(summary);

            const list = document.createElement("div");
            list.className = "proctoring-event-list";

            events.forEach((event) => {
                const item = document.createElement("div");
                item.className = `proctoring-event ${event.severity || "technical"}`;

                const title = document.createElement("strong");
                title.textContent = event.title || event.event_type || "Unknown event";

                const description = document.createElement("p");
                description.textContent =
                    event.description || "No additional explanation is available.";

                const time = document.createElement("small");
                const parsedTime = new Date(event.event_timestamp);

                time.textContent = Number.isNaN(parsedTime.getTime())
                    ? String(event.event_timestamp || "Time unavailable")
                    : parsedTime.toLocaleString();

                item.append(title, description, time);

                if (event.details) {
                    const details = document.createElement("p");
                    details.textContent = `Recorded details: ${event.details}`;
                    item.appendChild(details);
                }

                list.appendChild(item);
            });

            section.appendChild(list);

            const disclaimer = document.createElement("p");
            disclaimer.className = "proctoring-disclaimer";
            disclaimer.textContent =
                "Proctoring events are indicators for review and do not independently prove academic dishonesty.";

            section.appendChild(disclaimer);
            container.appendChild(section);
        }

        async function loadResults(code) {
            const container = $("resultsList");
        
            if (!container) return;
        
            container.textContent = "Loading results...";
        
            try {
                // Load the scores.
                const data = await api(
                    `/api/tests/${encodeURIComponent(code)}/results`
                );
        
                // Load recording information.
                // The video files themselves are loaded only when Play is clicked.
                let recordings = [];
                let recordingError = "";
        
                try {
                    const recordingData = await api(
                        `/api/tests/${encodeURIComponent(code)}/recordings`
                    );
        
                    recordings = recordingData.recordings || [];
                } catch (error) {
                    recordingError = error.message;
                }
        
                container.replaceChildren();
        
                const heading = document.createElement("h3");
                heading.textContent = `Results: ${data.name || data.code}`;
        
                container.appendChild(heading);
        
                if (recordingError) {
                    const warning = document.createElement("p");
                    warning.textContent =
                        `Could not load recordings: ${recordingError}`;
                    warning.style.color = "#c62828";
        
                    container.appendChild(warning);
                }
        
                if (!data.submissions.length) {
                    const empty = document.createElement("p");
                    empty.textContent = "No student submissions yet.";
        
                    container.appendChild(empty);
                    return;
                }
        
                // Group recordings by exam attempt.
                const recordingsByAttempt = new Map();
        
                recordings.forEach((recording) => {
                    const attemptId = Number(recording.attempt_id);
        
                    if (!Number.isInteger(attemptId)) return;
        
                    if (!recordingsByAttempt.has(attemptId)) {
                        recordingsByAttempt.set(attemptId, []);
                    }
        
                    recordingsByAttempt.get(attemptId).push(recording);
                });
        
                // Keep track of recordings connected to a submission.
                const matchedRecordingIds = new Set();
        
                data.submissions.forEach((submission) => {
                    const card = document.createElement("div");
                    card.className = "result-card";
        
                    const title = document.createElement("h4");
                    title.textContent = submission.studentName || "Unknown student";
        
                    const score = document.createElement("p");
        
                    score.textContent = submission.gradingFailed
                        ? "Grading failed; answers were saved."
                        : `Score: ${submission.percent}%`;
        
                    const summary = document.createElement("p");
                    summary.textContent = submission.summary || "";
        
                    
                    card.append(title, score, summary);

                    // Delete button for this specific student attempt.
                    if (submission.attemptId !== null &&
                        submission.attemptId !== undefined) {

                        const deleteButton = makeButton(
                            "Delete Attempt",
                            "delete-attempt-button",
                            async () => {
                                const confirmed = confirm(
                                    `Permanently delete ${submission.studentName}'s attempt?\n\n` +
                                    "This will delete the score, answers, recordings, " +
                                    "and proctoring events for this attempt.\n\n" +
                                    "This cannot be undone."
                                );

                                if (!confirmed) return;

                                deleteButton.disabled = true;
                                deleteButton.textContent = "Deleting...";

                                try {
                                    await api(
                                        `/api/tests/${encodeURIComponent(code)}/attempts/${submission.attemptId}`,
                                        { method: "DELETE" }
                                    );

                                    alert("Student attempt deleted successfully.");

                                    // Reload the results without the deleted attempt.
                                    await loadResults(code);

                                } catch (error) {
                                    alert(`Could not delete attempt: ${error.message}`);

                                    deleteButton.disabled = false;
                                    deleteButton.textContent = "Delete Attempt";
                                }
                            }
                        );

                        card.appendChild(deleteButton);
                    }

                    
                    // Show only events belonging to this exact exam attempt.

                    const attemptEvents = (data.proctoringEvents || [])
                        .filter(
                            event =>
                                submission.attemptId !== null &&
                                submission.attemptId !== undefined &&
                                Number(event.attempt_id) === Number(submission.attemptId)
                        )
                        .map(interpretProctoringEvent);
                
                    renderProctoringReport(attemptEvents, card);
                

                    // Find recordings for this exact attempt.
                    const studentRecordings = submission.attemptId
                        ? recordingsByAttempt.get(Number(submission.attemptId)) || []
                        : [];
        
                    // Show each question and its matching recordings.
                    (submission.questions || []).forEach((q, index) => {
                        const questionSection = document.createElement("div");
                        questionSection.className = "result-question";
        
                        const question = document.createElement("p");
        
                        question.textContent =
                            `${index + 1}. ${q.question || ""}` +
                            (q.score !== undefined
                                ? ` — ${q.score}/${q.maxPoints || DEFAULT_POINTS}`
                                : "") +
                            (q.feedback ? ` | ${q.feedback}` : "");
        
                        questionSection.appendChild(question);
        
                        // Match the recording to the question text.
                        const normalize = (value) =>
                            String(value || "").trim().toLowerCase();
        
                        const questionRecordings = studentRecordings.filter(
                            (recording) =>
                                normalize(recording.question_text) ===
                                normalize(q.question)
                        );
        
                        if (questionRecordings.length > 0) {
                            const recordingHeading = document.createElement("strong");
                            recordingHeading.textContent = "Question recordings:";
        
                            questionSection.appendChild(recordingHeading);
        
                            questionRecordings.forEach((recording) => {
                                matchedRecordingIds.add(recording.id);
        
                                renderRecording(
                                    recording,
                                    code,
                                    questionSection
                                );
                            });
                        }
        
                        card.appendChild(questionSection);
                    });
        
                    // Show ALL recordings for this student's attempt.
                    const allRecordingsHeading = document.createElement("h4");
                    allRecordingsHeading.textContent = "All Recordings";
        
                    card.appendChild(allRecordingsHeading);
        
                    if (studentRecordings.length === 0) {
                        const empty = document.createElement("p");
                        empty.textContent =
                            "No recordings found for this attempt.";
        
                        card.appendChild(empty);
                    } else {
                        studentRecordings.forEach((recording) => {
                            matchedRecordingIds.add(recording.id);
        
                            renderRecording(
                                recording,
                                code,
                                card
                            );
                        });
                    }
        
                    container.appendChild(card);
                });
        
                // Show recordings that could not be matched to a score.
                const unmatchedRecordings = recordings.filter(
                    (recording) => !matchedRecordingIds.has(recording.id)
                );
        
                if (unmatchedRecordings.length > 0) {
                    const unmatchedSection = document.createElement("div");
        
                    const unmatchedHeading = document.createElement("h3");
                    unmatchedHeading.textContent =
                        "Other Recordings (Not Matched to a Submission)";
        
                    unmatchedSection.appendChild(unmatchedHeading);
        
                    unmatchedRecordings.forEach((recording) => {
                        const label = document.createElement("p");
        
                        label.textContent =
                            `${recording.student_name || "Unknown student"} — ` +
                            `Attempt ${recording.attempt_id}`;
        
                        unmatchedSection.appendChild(label);
        
                        renderRecording(
                            recording,
                            code,
                            unmatchedSection
                        );
                    });
        
                    container.appendChild(unmatchedSection);
                }
        
            } catch (error) {
                container.textContent =
                    `Could not load results: ${error.message}`;
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

            if (screen) {
                screen.hidden = id !== screenId;
            }
        });
    }

    function startNewTest() {
        currentTestCode = null;
        currentTestName = "";
        currentTestGuidelines = "";
        editingTest = false;

        resetQuestions();
        resetGuidelines();
        resetTimerInputs();
        resetAttemptInputs();
        resetReadingMaterialInput();
        resetAllowedTabs();

        if ($("testName")) {
            $("testName").value = "";
        }

        if ($("createHeading")) {
            $("createHeading").textContent = "Create a New Test";
        }

        if ($("createTest")) {
            $("createTest").textContent = "Create Test";
        }

        showMessage("createdTest", "");

        showScreen("createScreen");
    }

    /* ----------------------------------------------------------
       INITIALIZE
       ---------------------------------------------------------- */

    function initialize() {
        const onAdminPage =
            $("createScreen") ||
            $("testsScreen") ||
            $("createTest") ||
            $("myTests");

        if (!onAdminPage) return;

        for (const config of Object.values(categories)) {
            if ($(config.input)) {
                $(config.input).maxLength = MAX_QUESTION_LENGTH;
            }

            if ($(config.points)) {
                $(config.points).min = 1;
                $(config.points).max = MAX_POINTS;
            }
        }

        if ($("maxAttempts")) {
            $("maxAttempts").min = 1;
            $("maxAttempts").max = MAX_ATTEMPTS_LIMIT;
        }

        // Add-question buttons.
        for (const [category, config] of Object.entries(categories)) {
            $(config.button)?.addEventListener("click", () => {
                addQuestion(category);
            });
        }

        // Grading guidelines.
        $("guidelinesAdd")?.addEventListener("click", addGuideline);

        $("grading_guidelines")?.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                event.preventDefault();
                addGuideline();
            }
        });

        // Timer.
        $("timerEnabled")?.addEventListener("change", (event) => {
            if ($("timerSettings")) {
                $("timerSettings").hidden = !event.target.checked;
            }
        });

        // Allowed attempts.
        $("allowedAttemptsEnabled")?.addEventListener("change", (event) => {
            if ($("attemptSettings")) {
                $("attemptSettings").hidden = !event.target.checked;
            }
        });
        // Approved websites.
        $("addAllowedTabButton")?.addEventListener(
            "click",
            addAllowedTab
        );

        $("allowedTabUrl")?.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                event.preventDefault();
                addAllowedTab();
            }
        });

        renderAllowedTabs();

        // Create or save test.
        $("createTest")?.addEventListener("click", createTest);

        // Clear questions and guidelines.
        document.querySelector(".clearQuestion")?.addEventListener(
            "click",
            () => {
                if (!confirm(
                    "Clear all questions and grading guidelines?"
                )) {
                    return;
                }

                resetQuestions();
                resetGuidelines();
            }
        );

        // Navigation.
        $("menuCreateButton")?.addEventListener(
            "click",
            startNewTest
        );

        $("menuViewButton")?.addEventListener(
            "click",
            async () => {
                showScreen("testsScreen");
                await loadTests();
            }
        );

        $("createBackButton")?.addEventListener(
            "click",
            async () => {
                if (editingTest) {
                    editingTest = false;
                    currentTestCode = null;
                    currentTestName = "";
                    currentTestGuidelines = "";

                    if ($("createHeading")) {
                        $("createHeading").textContent =
                            "Create a New Test";
                    }

                    if ($("createTest")) {
                        $("createTest").textContent = "Create Test";
                    }

                    resetQuestions();
                    resetGuidelines();
                    resetTimerInputs();
                    resetAttemptInputs();
                    resetReadingMaterialInput();

                    if ($("testName")) {
                        $("testName").value = "";
                    }

                    showMessage("createdTest", "");

                    showScreen("testsScreen");
                    await loadTests();
                } else {
                    showScreen("adminMenu");
                }
            }
        );

        $("testsBackButton")?.addEventListener("click", () => {
            showScreen("adminMenu");
        });

        renderGuidelines();

        // Load tests on a stand-alone My Tests page.
        if ($("myTests") && !$("menuViewButton")) {
            loadTests();
        }
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
        uploadReadingMaterial,
        checkReadingMaterial,
    };
})();
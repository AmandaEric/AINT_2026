/*
 * ============================================================
 * admin-tests.js - EVERYTHING ADMINS DO WITH TESTS
 * The draft question bank, creating a test, the My Tests list,
 * viewing results, editing an existing test, the admin menu buttons,
 * and initAdminPage() (checks the saved login on page load).
 * ============================================================
 */

// ==========================================
// ADMIN: QUESTION BANK (the draft list before a test is created)
// ==========================================

// Save questions to the browser
function saveQuestions() {
    localStorage.setItem(
        "aintQuestions",
        JSON.stringify(state.questions)
    );
}


// Add a question
function addQuestion(category, input) {

    if (!input) {
        return;
    }

    const question = input.value.trim();

    if (question === "") {
        alert("Please enter a question.");
        return;
    }

    state.questions[category].push(question);

    saveQuestions();

    // Clear input and show the new question right away
    input.value = "";

    displayQuestions();

    console.log("Added question:", question);
}


// Delete one question
function deleteQuestion(category, index) {

    state.questions[category].splice(index, 1);

    saveQuestions();

    displayQuestions();
}


// Delete all questions
function clearAllQuestions() {

    const confirmed = confirm(
        "Are you sure you want to delete ALL questions?"
    );

    if (!confirmed) {
        return;
    }

    state.questions = {
        objective: [],
        semi: [],
        qualitative: []
    };

    saveQuestions();

    displayQuestions();
}


// Display all question categories
function displayQuestions() {
    displayCategory(el.objectiveList, "objective");
    displayCategory(el.semiList, "semi");
    displayCategory(el.qualitativeList, "qualitative");
}


// Display one category
function displayCategory(listElement, category) {

    if (!listElement) {
        return;
    }

    // Clear current display
    listElement.innerHTML = "";

    // Display each question
    state.questions[category].forEach((question, index) => {

        const row = document.createElement("div");

        row.className = "saved-question";

        row.innerHTML = `
            <p>${question}</p>
            <button
                type="button"
                onclick="deleteQuestion('${category}', ${index})">
                Delete
            </button>
        `;

        listElement.appendChild(row);
    });
}

// Make deleteQuestion available to the generated buttons
window.deleteQuestion = deleteQuestion;


// ------------------------------------------
// BUTTONS
// ------------------------------------------

on(el.objectiveAdd, "click", () => addQuestion("objective", el.objectiveInput));

on(el.semiAdd, "click", () => addQuestion("semi", el.semiInput));

on(el.qualitativeAdd, "click", () => addQuestion("qualitative", el.qualitativeInput));

on(el.clearQuestions, "click", clearAllQuestions);

// Display saved questions when the page loads
displayQuestions();

// ==========================================
// ADMIN: CREATE A TEST
// ==========================================

// Sends the questions the admin entered to the server.
// The server saves them under the logged-in email
// and answers with the test code.
async function createTest() {

    if (!el.createdTest) {
        return;
    }

    const total =
        state.questions.objective.length +
        state.questions.semi.length +
        state.questions.qualitative.length;

    if (total === 0) {
        alert("Add at least one question first.");
        return;
    }

    const name =
        el.testName
            ? el.testName.value.trim()
            : "";

    if (el.createTest) {
        el.createTest.disabled = true;
    }

    try {

        const response = await adminFetch(
            "/api/tests",
            {

                method: "POST",

                body: JSON.stringify({
                    name: name,
                    questions: state.questions
                })

            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.error || `Server responded with ${response.status}`
            );
        }

        el.createdTest.innerHTML = `

            <h4>Test created</h4>

            <p>
                Give this code to your students:
                <strong style="font-size: 1.6em; letter-spacing: 3px;">
                    ${escapeHtml(data.code)}
                </strong>
            </p>

            <p>
                Results are emailed to ${escapeHtml(admin.email)}
                and saved under "My Tests" below.
            </p>

        `;

        // The questions now live on the server, so clear the
        // draft to keep it from mixing into the next test
        state.questions = {
            objective: [],
            semi: [],
            qualitative: []
        };

        saveQuestions();

        displayQuestions();

        if (el.testName) {
            el.testName.value = "";
        }

    } catch (error) {

        console.error("CREATE TEST ERROR:", error);

        el.createdTest.innerHTML =
            `<p>Could not create the test: ${escapeHtml(error.message)}</p>`;

    }

    if (el.createTest) {
        el.createTest.disabled = false;
    }
}


on(el.createTest, "click", createTest);

// ==========================================
// ADMIN: MY TESTS (list) + RESULTS FOR ONE TEST
// ==========================================

async function loadMyTests() {

    if (!el.myTests) {
        return;
    }

    el.myTests.innerHTML = "<p>Loading your tests...</p>";

    try {

        const response = await adminFetch("/api/admin/tests");

        if (!response.ok) {
            throw new Error(`Server responded with ${response.status}`);
        }

        const data = await response.json();

        if (data.tests.length === 0) {
            el.myTests.innerHTML = "<p>You haven't created any tests yet.</p>";
            return;
        }

        el.myTests.innerHTML = data.tests.map(function (t) {

            return `

                <div class="saved-question">

                    <p>
                        <strong>${escapeHtml(t.name || "Untitled test")}</strong>
                        &mdash; code
                        <strong>${escapeHtml(t.code)}</strong>
                    </p>

                    <p>
                        ${t.questionCount} questions
                        &mdash; ${t.submitted} submitted
                        ${t.average !== null
                            ? "&mdash; average " + t.average + "%"
                            : ""}
                        &mdash; created
                        ${escapeHtml(new Date(t.createdAt).toLocaleDateString())}
                    </p>

                    <button
                        type="button"
                        data-action="results"
                        data-code="${escapeHtml(t.code)}">

                        View results

                    </button>

                    <button
                        type="button"
                        data-action="edit"
                        data-code="${escapeHtml(t.code)}">

                        Edit questions

                    </button>

                </div>

            `;

        }).join("");

    } catch (error) {

        console.error("LOAD TESTS ERROR:", error);

        // adminFetch already handled an expired session
        if (admin.token) {
            el.myTests.innerHTML =
                "<p>Could not load your tests. Is the backend running?</p>";
        }

    }
}


// One listener for every button in the My Tests list
on(el.myTests, "click", function (event) {

    const button = event.target.closest("button[data-code]");

    if (!button) {
        return;
    }

    if (button.dataset.action === "edit") {
        loadEditView(button.dataset.code);
    } else {
        loadResults(button.dataset.code);
    }

});


// ------------------------------------------
// RESULTS FOR ONE TEST
// ------------------------------------------

async function loadResults(code) {

    if (!el.resultsList) {
        return;
    }

    // Only one of the two views shows at a time
    if (el.editView) {
        el.editView.innerHTML = "";
        el.editView.dataset.code = "";
    }

    el.resultsList.innerHTML = "<p>Loading results...</p>";

    try {

        const response = await adminFetch(
            `/api/tests/${encodeURIComponent(code)}/results`
        );

        if (response.status === 404) {
            el.resultsList.innerHTML = "<p>Test not found.</p>";
            return;
        }

        if (!response.ok) {
            throw new Error(`Server responded with ${response.status}`);
        }

        const data = await response.json();

        const subs = data.submissions;

        const title =
            `<h3>${escapeHtml(data.name || "Untitled test")} ` +
            `(${escapeHtml(data.code)})</h3>`;

        if (subs.length === 0) {
            el.resultsList.innerHTML =
                title + "<p>No students have submitted yet.</p>";
            return;
        }

        // Class average (only graded exams)
        const graded = subs.filter(function (s) {
            return s.percent !== null;
        });

        const average = graded.length
            ? Math.round(
                graded.reduce(function (sum, s) {
                    return sum + s.percent;
                }, 0) / graded.length
            )
            : null;

        const header =
            title +
            `<p>${subs.length} submitted` +
            (average !== null
                ? ` &mdash; class average ${average}%`
                : "") +
            "</p>";

        el.resultsList.innerHTML = header + subs.map(function (r) {

            const score = r.gradingFailed
                ? "Grading failed (answers saved)"
                : r.percent + "%";

            const details = r.questions.map(function (q, i) {

                const answers =
                    (q.exchanges || []).map(function (e) {

                        return "<p><em>" +
                            escapeHtml(e.question) +
                            "</em><br>" +
                            escapeHtml(e.answer) +
                            "</p>";

                    }).join("") ||
                    "<p><em>No answer given</em></p>";

                return "<div><strong>" +
                    (i + 1) + ". " +
                    escapeHtml(q.question) +
                    "</strong>" +
                    (q.score !== undefined
                        ? " &mdash; " + q.score + "/10"
                        : "") +
                    answers +
                    (q.feedback
                        ? "<p>" + escapeHtml(q.feedback) + "</p>"
                        : "") +
                    "</div>";

            }).join("");

            return "<details class='saved-question'>" +
                "<summary><strong>" +
                escapeHtml(r.studentName) +
                "</strong> &mdash; " + score +
                " &mdash; " +
                escapeHtml(new Date(r.submittedAt).toLocaleString()) +
                (r.emailSent ? "" : " &mdash; email not sent") +
                "</summary>" +
                (r.summary
                    ? "<p>" + escapeHtml(r.summary) + "</p>"
                    : "") +
                details +
                "</details>";

        }).join("");

    } catch (error) {

        console.error(error);

        if (admin.token) {
            el.resultsList.innerHTML =
                "<p>Could not load results. Is the backend running?</p>";
        }

    }
}

// ==========================================
// ADMIN: EDIT AN EXISTING TEST
// ==========================================

const CATEGORY_LABELS = {
    objective: "Objective",
    semi: "Semi-objective",
    qualitative: "Qualitative"
};


// Sends an add / delete / rename request and reports any error
async function sendEdit(path, method, body) {

    const response = await adminFetch(
        path,
        {
            method: method,
            body: body ? JSON.stringify(body) : undefined
        }
    );

    if (!response.ok) {

        const data =
            await response.json().catch(function () { return {}; });

        throw new Error(
            data.error || `Server responded with ${response.status}`
        );

    }
}


async function loadEditView(code) {

    if (!el.editView) {
        return;
    }

    // Only one of the two views shows at a time
    if (el.resultsList) {
        el.resultsList.innerHTML = "";
    }

    el.editView.innerHTML = "<p>Loading test...</p>";

    try {

        const response = await adminFetch(
            `/api/tests/${encodeURIComponent(code)}/edit`
        );

        if (response.status === 404) {
            el.editView.innerHTML = "<p>Test not found.</p>";
            return;
        }

        if (!response.ok) {
            throw new Error(`Server responded with ${response.status}`);
        }

        const data = await response.json();

        el.editView.dataset.code = data.code;

        const sections = Object.keys(CATEGORY_LABELS).map(function (cat) {

            const label = CATEGORY_LABELS[cat];

            const items =
                data.questions[cat].map(function (q) {

                    return `

                        <div class="saved-question">

                            <p>${escapeHtml(q.text)}</p>

                            <button
                                type="button"
                                data-action="delete-question"
                                data-id="${Number(q.id)}">

                                Delete

                            </button>

                        </div>

                    `;

                }).join("") ||
                "<p><em>No questions in this category.</em></p>";

            return `

                <h4>${label}</h4>

                ${items}

                <input
                    type="text"
                    id="editInput-${cat}"
                    placeholder="Add a ${label.toLowerCase()} question">

                <button
                    type="button"
                    data-action="add-question"
                    data-category="${cat}">

                    Add Question

                </button>

            `;

        }).join("");

        const warning = data.submitted > 0
            ? `<p><em>${data.submitted} student(s) have already taken this test.
               Their results keep the questions they were asked.
               Changes only affect students who take it from now on.</em></p>`
            : "";

        el.editView.innerHTML = `

            <h3>Editing: ${escapeHtml(data.name || "Untitled test")}
                (${escapeHtml(data.code)})</h3>

            ${warning}

            <input
                type="text"
                id="editName"
                placeholder="Test name"
                value="${escapeHtml(data.name)}">

            <button
                type="button"
                data-action="rename">

                Save name

            </button>

            ${sections}

        `;

    } catch (error) {

        console.error("LOAD EDIT ERROR:", error);

        if (admin.token) {
            el.editView.innerHTML =
                "<p>Could not load the test. Is the backend running?</p>";
        }

    }
}


// One listener for every button inside the edit view
on(el.editView, "click", async function (event) {

    const button = event.target.closest("button[data-action]");

    if (!button) {
        return;
    }

    const code = el.editView.dataset.code;

    const encoded = encodeURIComponent(code);

    const action = button.dataset.action;

    button.disabled = true;

    try {

        if (action === "add-question") {

            const category = button.dataset.category;

            const input =
                document.getElementById("editInput-" + category);

            const text = input ? input.value.trim() : "";

            if (text === "") {
                alert("Please enter a question.");
                return;
            }

            await sendEdit(
                `/api/tests/${encoded}/questions`,
                "POST",
                { category: category, text: text }
            );

        } else if (action === "delete-question") {

            if (!confirm("Delete this question?")) {
                return;
            }

            await sendEdit(
                `/api/tests/${encoded}/questions/${button.dataset.id}`,
                "DELETE"
            );

        } else if (action === "rename") {

            const nameInput = document.getElementById("editName");

            await sendEdit(
                `/api/tests/${encoded}`,
                "PATCH",
                { name: nameInput ? nameInput.value.trim() : "" }
            );

        }

        // Show the updated test
        await loadEditView(code);

    } catch (error) {

        console.error("EDIT ERROR:", error);

        alert(error.message);

    } finally {

        button.disabled = false;

    }

});

// ==========================================
// ADMIN: MENU BUTTONS + PAGE START-UP
// ==========================================

on(el.menuCreateButton, "click", function () {
    showAdminScreen("create");
});

on(el.menuViewButton, "click", function () {
    clearTestViews();
    showAdminScreen("tests");
    loadMyTests();
});

on(el.createBackButton, "click", function () {

    if (el.createdTest) {
        el.createdTest.innerHTML = "";
    }

    showAdminScreen("menu");
});

on(el.testsBackButton, "click", function () {
    clearTestViews();
    showAdminScreen("menu");
});


// Runs on page load. Shows the login screen unless the saved
// token is still valid. (Only does something on the admin page.)
async function initAdminPage() {

    if (!el.adminLogin) {
        return;
    }

    showLoginStep("email");

    if (!admin.token) {
        showAdminPanel(false);
        return;
    }

    // Check the saved token with the server before trusting it
    try {

        const response = await adminFetch("/api/admin/tests");

        if (!response.ok) {
            throw new Error("Not logged in");
        }

        admin.email =
            (await response.json()).email || admin.email;

        showAdminPanel(true);

    } catch (error) {

        showAdminPanel(false);

    }
}
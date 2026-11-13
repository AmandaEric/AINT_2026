// ==========================================
// STUDENT: WORD COUNT
// ==========================================

const wordCountEl = document.getElementById("wordCount");

function updateWordCount() {
    if (!wordCountEl || !el.responseBox) return;

    const text = el.responseBox.value.trim();
    const count = text === "" ? 0 : text.split(/\s+/).length;

    wordCountEl.textContent = `Words: ${count}`;
}

// Updates when the text changes by typing, or when code dispatches an "input" event
if (el.responseBox) {
    el.responseBox.addEventListener("input", updateWordCount);
}

updateWordCount();



// ==========================================
// STUDENT: SPEECH TO TEXT
// ==========================================

const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

let recognitionActive = false;
let recognitionStarting = false;

if (SpeechRecognition) {

    state.recognition = new SpeechRecognition();

    state.recognition.continuous = true;
    state.recognition.interimResults = true;
    state.recognition.lang = "en-US";

    state.recognition.onstart = () => {
        recognitionActive = true;
        recognitionStarting = false;
        state.isListening = true;

        if (el.listenButton) {
            el.listenButton.textContent = "Stop Listening";
        }

        console.log("Speech recognition started.");
    };

    state.recognition.onend = () => {
        recognitionActive = false;
        recognitionStarting = false;
        state.isListening = false;

        if (el.listenButton) {
            el.listenButton.textContent = "Start Listening";
        }

        console.log("Speech recognition stopped.");
    };

    state.recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);

        recognitionStarting = false;

        if (event.error === "no-speech") {
            console.warn("No speech detected. Try speaking closer to the microphone.");
        } else if (event.error === "not-allowed") {
            alert("Microphone permission was denied. Please allow microphone access.");
        } else if (event.error === "network") {
            console.error("Speech recognition network service failed.");
        } else {
            console.error("Recognition problem:", event.error);
        }
    };

    state.recognition.onresult = (event) => {

        let finalTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {

            const transcript = event.results[i][0].transcript;

            if (event.results[i].isFinal) {
                finalTranscript += transcript + " ";
            }
        }

        if (finalTranscript && el.responseBox) {
            el.responseBox.value += finalTranscript;
            el.responseBox.dispatchEvent(new Event("input", {
                bubbles: true
            }));

            console.log("Recognized speech:", finalTranscript);
        }
    };
}

// ==========================================
// LISTEN BUTTON
// ==========================================

on(el.listenButton, "click", () => {

    if (!state.recognition) {
        alert("Speech recognition is not supported. Please type your answer.");
        return;
    }

    if (recognitionActive || recognitionStarting) {

        state.recognition.stop();

        return;
    }

    try {
        recognitionStarting = true;
        state.recognition.start();

    } catch (error) {
        recognitionStarting = false;
        console.error("Could not start speech recognition:", error);
    }
});


// ==========================================
// STUDENT: SPEECH TO TEXT (the student answers by voice)
// ==========================================

const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

if (SpeechRecognition) {

    state.recognition = new SpeechRecognition();

    state.recognition.continuous = true;
    state.recognition.interimResults = true;
    state.recognition.lang = "en-US";

    state.recognition.onstart = () => {

        state.isListening = true;

        if (el.listenButton) {
            el.listenButton.textContent = "Stop Listening";
        }
    };

    state.recognition.onend = () => {

        state.isListening = false;

        if (el.listenButton) {
            el.listenButton.textContent = "Start Listening";
        }
    };

    state.recognition.onerror = (event) => {

        console.error("Speech recognition error:", event.error);

        state.isListening = false;

        if (el.listenButton) {
            el.listenButton.textContent = "Start Listening";
        }

        if (el.evaluationBox) {
            el.evaluationBox.innerHTML =
                `<p>Speech recognition error: ${event.error}</p>`;
        }
    };

    state.recognition.onresult = (event) => {

        let finalTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript + " ";
            }
        }

        if (finalTranscript && el.responseBox) {
            el.responseBox.value += finalTranscript;
        }
    };
}


// Listen button
on(el.listenButton, "click", () => {

    if (!state.recognition) {

        if (el.evaluationBox) {
            el.evaluationBox.innerHTML =
                "<p>Speech recognition is not supported by this browser. Please type your answer.</p>";
        }

        return;
    }

    if (state.isListening) {
        state.recognition.stop();
    } else {
        state.recognition.start();
    }
});
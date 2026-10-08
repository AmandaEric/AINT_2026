# AINT
AI testing students. Ask questions, Records answers, evaluates response, and follows up. 
# AINT — setup

## 1. Replace the leaked key
The old key was published in index.html. Delete it in Google AI Studio and make a new one.

## 2. Install and run
    npm install
    cp .env.example .env      # then paste the new key into .env
    npm start

Open http://localhost:3000 — not the index.html file directly. Opening the file with
file:// means there is no server to call, so /api/question will fail, and speech
recognition needs localhost or https to get microphone permission.

## 3. How a round works
1. Clicking a type button sets the mode and enables Start.
2. Start posts the mode to /api/question. The server asks Gemini for a question plus a
   hidden grading key and sends both back.
3. The question is written into .question-output and spoken aloud. The avatar box gets
   the class "talking" for as long as it speaks, so you can drive the animation off that.
4. Speech recognition listens, stopping ~2 seconds after you stop talking.
5. The transcript plus the grading key go to /api/grade, which returns
   correct / close / incorrect, a 0-100 score, and one line of feedback.

## 4. CSS hooks you'll want in style.css
    .button-group button.selected { /* which type is active */ }
    .avatar-container.talking     { /* mouth/pulse animation */ }
    .status.correct               { }
    .status.close                 { }
    .status.incorrect             { }
    .heard                        { /* live transcript, keep it quiet */ }

## 5. Browser support
Speech recognition (SpeechRecognition / webkitSpeechRecognition) works in Chrome and
Edge. Firefox and Safari will show the "can't listen" message. If you need those,
record audio with MediaRecorder and transcribe it server-side instead.

Stage 1: Get question generation working — button click → LLM returns a question → displayed as text on screen. No voice yet.
Stage 2: Add TTS so the question is spoken aloud, plus a basic "talking" animation (even just pulsing/scaling the avatar while audio plays).
Stage 3: Add the microphone + speech-to-text so the student's answer gets captured as text.
Stage 4: Wire up the follow-up logic — feed the Q&A back to the LLM.
Stage 5: Build the professor page and connect it to prompt storage.

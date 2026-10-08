/*
 * ============================================================
 * student-voice.js - SPEAKING AND LISTENING
 * The AI reading questions aloud (text-to-speech), the avatar's
 * mouth animation and blinking, and the student answering by voice
 * (speech-to-text).
 * ============================================================
 */

// ==========================================
// STUDENT: TEXT TO SPEECH (the AI reads questions aloud)
// ==========================================

let currentUtterance = null;

function speakQuestion(text) {

    if (!("speechSynthesis" in window)) {
        alert("Text-to-speech is not supported by this browser.");
        return;
    }

    speechSynthesis.cancel();

    const speech = new SpeechSynthesisUtterance(text);
    speech.rate = 1;
    speech.pitch = 1;
    speech.volume = 1;

    currentUtterance = speech;

    // Ignore events from an old utterance that got cancelled
    speech.onstart = function () {
        if (currentUtterance !== speech) return;
        startTalkingAnimation(text);
    };

    // Fires at each word (where the browser/voice supports it)
    speech.onboundary = function (event) {
        if (currentUtterance !== speech) return;
        handleBoundary(event, text, speech.rate);
    };

    speech.onend = function () {
        if (currentUtterance !== speech) return;
        stopTalkingAnimation();
    };

    speech.onerror = function () {
        if (currentUtterance !== speech) return;
        stopTalkingAnimation();
    };

    speechSynthesis.speak(speech);
}


function normalizeMathForSpeech(text) {
    return text
        .replace(/\+/g, " plus ")
        .replace(/-/g, " minus ")
        .replace(/\*/g, " times ")
        .replace(/÷/g, " divided by ")
        .replace(/\//g, " divided by ")
        .replace(/=/g, " equals ")
        .replace(/%/g, " percent ")
        .replace(/\^/g, " to the power of ")
        .replace(/√/g, " square root of ")
        .replace(/\s+/g, " ")
        .trim();
}

// ==========================================
// STUDENT: AVATAR MOUTH ANIMATION + BLINKING
// ==========================================

const FRAME_PATH = "ai_speech_frames/";

const FRAMES = {
    a: FRAME_PATH + "A(ah).png",
    e: FRAME_PATH + "E(ee).png",
    i: FRAME_PATH + "I(ee).png",
    l: FRAME_PATH + "L(el).png",
    m: FRAME_PATH + "M(mmm).png",
    o: FRAME_PATH + "O(oh).png",
    u: FRAME_PATH + "U(oo).png",
    smile: FRAME_PATH + "smile.png",
    eyesClosed: FRAME_PATH + "eyes_closed.png",
    idle: FRAME_PATH + "eyes_open_neutral.png",
};

const mouthImg = el.mouth;

// Preload every frame so there is no flicker the first time one shows
Object.values(FRAMES).forEach(function (src) {
    const img = new Image();
    img.src = src;
});

let isTalking = false;
let mouthTimers = [];      // timeouts for the current word / fallback timeline
let boundaryMode = false;  // true once the browser sends word-boundary events
let lastBoundaryTime = 0;
let lastWordDuration = 300;

function showFrame(key) {
    if (mouthImg) {
        mouthImg.src = FRAMES[key];
    }
}

function clearMouthTimers() {
    mouthTimers.forEach(clearTimeout);
    mouthTimers = [];
}


// ------------------------------------------
// LETTERS -> MOUTH SHAPES
// ------------------------------------------

// Turns one word into a list of mouth shapes. Sounds that look the
// same on the lips share a frame:
//   M  = m, b, p (lips closed)
//   L  = l, n, t, d, r, th (tongue visible)
//   U  = oo, w, q (rounded, small)
//   O  = o, ow, oa, ou, sh, ch (rounded, open)
//   E  = ee, ea, ie, e
//   A  = a, ai, ay
//   I  = i, y
//   smile = everything else (s, k, f, g, ...)
function wordToShapes(word) {

    let w = word.toLowerCase().replace(/[^a-z]/g, "");

    // Silent trailing "e" (like "make", "time")
    if (w.length > 3 && w.endsWith("e") && !"aeiouy".includes(w[w.length - 2])) {
        w = w.slice(0, -1);
    }

    const shapes = [];
    let i = 0;

    while (i < w.length) {

        const two = w.substr(i, 2);
        const c = w[i];
        let shape;
        let step = 1;

        if (["ee", "ea", "ie", "ei"].includes(two)) { shape = "e"; step = 2; }
        else if (["oo", "ew", "ue"].includes(two))  { shape = "u"; step = 2; }
        else if (["oa", "ow", "ou"].includes(two))  { shape = "o"; step = 2; }
        else if (["ai", "ay"].includes(two))        { shape = "a"; step = 2; }
        else if (two === "th")                      { shape = "l"; step = 2; }
        else if (["sh", "ch", "zh"].includes(two))  { shape = "o"; step = 2; }
        else if ("aeiou".includes(c))               { shape = c; }
        else if (c === "y")                         { shape = i === 0 ? "smile" : "i"; }
        else if ("wq".includes(c))                  { shape = "u"; }
        else if ("mbp".includes(c))                 { shape = "m"; }
        else if ("lntdr".includes(c))               { shape = "l"; }
        else                                        { shape = "smile"; }

        // Skip repeats so the mouth doesn't flicker on the same frame
        if (shapes[shapes.length - 1] !== shape) {
            shapes.push(shape);
        }

        i += step;
    }

    return shapes;
}


// ------------------------------------------
// MAIN MODE: sync to word boundaries
// ------------------------------------------

function handleBoundary(event, text, rate) {

    // Some browsers report other boundary types too - only use words
    if (event.name && event.name !== "word") {
        return;
    }

    // First boundary: the browser supports it, so drop the fallback timeline
    if (!boundaryMode) {
        boundaryMode = true;
    }

    clearMouthTimers();

    // Figure out which word is being spoken
    let word;

    if (event.charLength) {
        word = text.substr(event.charIndex, event.charLength);
    } else {
        const match = text.slice(event.charIndex).match(/^[\w']+/);
        word = match ? match[0] : "";
    }

    // Use the time since the last word as the estimate for this one
    const now = performance.now();

    if (lastBoundaryTime) {
        lastWordDuration = Math.min(Math.max(now - lastBoundaryTime, 120), 700);
    }

    lastBoundaryTime = now;

    const shapes = wordToShapes(word);

    if (shapes.length === 0) {
        return;
    }

    // Spread the shapes across the word, but not too fast or too slow
    const step = Math.min(Math.max(lastWordDuration / shapes.length, 60), 140);

    shapes.forEach(function (shape, index) {
        mouthTimers.push(setTimeout(function () {
            if (isTalking) showFrame(shape);
        }, index * step));
    });

    // Close the mouth briefly at the end of the word; the next
    // boundary event cancels this if another word follows right away
    mouthTimers.push(setTimeout(function () {
        if (isTalking) showFrame("idle");
    }, shapes.length * step + 30));
}


// ------------------------------------------
// FALLBACK: some voices never send boundary events
// ------------------------------------------

function playFallbackTimeline(text) {

    const SHAPE_MS = 75;
    const SPACE_MS = 90;
    const PUNCT_MS = 250;

    let time = 0;

    // Split into words and punctuation/spaces, keeping the separators
    const parts = text.split(/([\s,.;:?!]+)/);

    parts.forEach(function (part) {

        if (part === "") return;

        if (/^[\s,.;:?!]+$/.test(part)) {

            const pause = /[,.;:?!]/.test(part) ? PUNCT_MS : SPACE_MS;
            const at = time;

            mouthTimers.push(setTimeout(function () {
                if (isTalking && !boundaryMode) showFrame("idle");
            }, at));

            time += pause;
            return;
        }

        wordToShapes(part).forEach(function (shape) {

            const at = time;

            mouthTimers.push(setTimeout(function () {
                if (isTalking && !boundaryMode) showFrame(shape);
            }, at));

            time += SHAPE_MS;
        });
    });
}


// ------------------------------------------
// START / STOP TALKING
// ------------------------------------------

function startTalkingAnimation(text) {

    if (!mouthImg) {
        return;
    }

    clearMouthTimers();

    isTalking = true;
    boundaryMode = false;
    lastBoundaryTime = 0;
    lastWordDuration = 300;

    // Runs until a real boundary event shows up (then boundaryMode
    // takes over and this timeline stops updating the image)
    playFallbackTimeline(text);
}

function stopTalkingAnimation() {

    clearMouthTimers();

    isTalking = false;
    boundaryMode = false;

    showFrame("idle");
}


// ------------------------------------------
// IDLE FACE + BLINKING
// ------------------------------------------

showFrame("idle");

function scheduleBlink() {

    // Blink every 2.5 - 6 seconds
    const delay = 2500 + Math.random() * 3500;

    setTimeout(function () {

        // Only blink when not talking (mouth frames have their own eyes)
        if (!isTalking) {

            showFrame("eyesClosed");

            setTimeout(function () {
                if (!isTalking) showFrame("idle");
            }, 140);
        }

        scheduleBlink();

    }, delay);
}

scheduleBlink();

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
/*
 * AINT Avatar Speech Animation (word-synced lip sync)
 * Uses the browser's built-in speech synthesis.
 *
 * How it works:
 *  - Each word is converted to an approximate sequence of mouth shapes.
 *  - Those shapes are spread across the word's estimated duration.
 *  - Word-boundary events from the speech engine restart the mouth on
 *    every word, so timing errors can't build up.
 *  - If the voice never sends boundary events, a timeline estimated
 *    from the text is used instead.
 *  - The speed estimate (ms per character) is learned while speaking
 *    and carried over to the next utterance.
 *
 * Load this file BEFORE student-exam.js.
 * Exposes: speakAsAvatar(text), stopAvatarSpeech()
 */

const AINT_AVATAR_PATH = "aint_avatar_frames/";

const avatarFrames = {
    neutral: "01_neutral.png",
    smile: "02_smile.png",
    blinkClosed: "03_blink_closed.png",
    blinkOpen: "04_blink_open.png",

    A: "09_mouth_A_ah.png",
    E: "10_mouth_E_ee.png",
    I: "11_mouth_I_ih.png",
    O: "12_mouth_O_oh.png",
    U: "13_mouth_U_oo.png",

    F: "14_mouth_F_V.png",
    L: "15_mouth_L.png",
    M: "16_mouth_M_mmm.png",
    P: "17_mouth_P_B.png",
    B: "18_mouth_B_m.png",
    W: "19_mouth_W.png",
    R: "20_mouth_R.png",
    T: "21_mouth_T_D.png",
    S: "22_mouth_S_Z.png",
    TH: "23_mouth_TH.png",
    CH: "24_mouth_CH.png",

    talkingMid: "25_talking_mid.png",
    talkingWide: "26_talking_wide.png",
    talkingNarrow: "27_talking_narrow.png",
    pause: "28_pause.png"
};

/* ----------------------------------------------------------
   TUNING
   ---------------------------------------------------------- */

const SPEECH_RATE = 0.95;

// Delay every mouth frame by this many ms. Raise it if the mouth
// moves BEFORE the audio, leave at 0 (or never below 0) otherwise.
const FRAME_DELAY_MS = 0;

// Shortest time a single mouth shape stays on screen.
const MIN_FRAME_MS = 70;

// Starting guess for speaking speed. Learned while speaking.
const START_MS_PER_CHAR = 72;

// Prefer a local English voice. Local voices reliably send word
// boundary events; some online voices do not. Set to false to keep
// the browser's default voice.
const PREFER_LOCAL_VOICE = true;

// Extra pause after punctuation, in ms.
const PAUSE_MS = { ",": 160, ";": 200, ":": 200, ".": 320, "!": 320, "?": 320 };

/* ----------------------------------------------------------
   STATE
   ---------------------------------------------------------- */

let avatarImage = null;
let currentUtterance = null;
let frameTimers = [];
let speaking = false;

let msPerChar = START_MS_PER_CHAR;
let boundarySeen = false;
let lastBoundary = null;
let speechStartTime = 0;
let chosenVoice = null;

/* ----------------------------------------------------------
   FRAMES
   ---------------------------------------------------------- */

// Preload the images so changing frames is less likely to flicker.
function preloadAvatarFrames() {
    Object.values(avatarFrames).forEach((filename) => {
        const image = new Image();
        image.src = AINT_AVATAR_PATH + filename;
    });
}

function setAvatarFrame(frameName) {
    if (!avatarImage || !avatarFrames[frameName]) return;

    const nextSrc = AINT_AVATAR_PATH + avatarFrames[frameName];

    if (!avatarImage.src.endsWith(nextSrc)) {
        avatarImage.src = nextSrc;
    }
}

function clearFrameTimers() {
    frameTimers.forEach(clearTimeout);
    frameTimers = [];
}

function scheduleFrame(frame, delay) {
    const id = setTimeout(
        () => setAvatarFrame(frame),
        Math.max(0, delay + FRAME_DELAY_MS)
    );
    frameTimers.push(id);
}

/* ----------------------------------------------------------
   TEXT -> MOUTH SHAPES (approximate, not a real phoneme engine)
   ---------------------------------------------------------- */

const VOWEL_PAIRS = {
    oo: "U", ee: "E", ea: "E", ai: "A", ay: "A",
    oa: "O", ou: "O", ow: "O", au: "O", aw: "O",
    ue: "U", ew: "U"
};

const LETTER_FRAMES = {
    a: "A", e: "E", i: "I", o: "O", u: "U", y: "I",
    b: "P", p: "P", m: "M",
    f: "F", v: "F",
    w: "W", l: "L", r: "R",
    t: "T", d: "T", n: "T",
    s: "S", z: "S", x: "S",
    j: "CH",
    k: "talkingMid", g: "talkingMid", q: "talkingMid"
};

function wordToVisemes(word) {
    let w = word.toLowerCase().replace(/[^a-z]/g, "");
    if (!w) return [];

    // Silent final "e" (made, time, lake)
    if (w.length > 3 && /[^aeiouy]e$/.test(w)) {
        w = w.slice(0, -1);
    }

    const out = [];
    const push = (frame) => {
        if (out[out.length - 1] !== frame) out.push(frame);
    };

    let i = 0;
    while (i < w.length) {
        const two = w.slice(i, i + 2);
        const c = w[i];

        if (two === "th") { push("TH"); i += 2; continue; }
        if (two === "ch" || two === "sh") { push("CH"); i += 2; continue; }
        if (two === "ph") { push("F"); i += 2; continue; }
        if (VOWEL_PAIRS[two]) { push(VOWEL_PAIRS[two]); i += 2; continue; }

        if (c === "c") {
            push(/[eiy]/.test(w[i + 1] || "") ? "S" : "talkingMid");
        } else if (c === "h") {
            // silent or breathy: no mouth change
        } else if (LETTER_FRAMES[c]) {
            push(LETTER_FRAMES[c]);
        }

        i++;
    }

    return out;
}

const VOWEL_FRAMES = new Set(["A", "E", "I", "O", "U"]);

// Shapes the viewer notices most: vowels, lips closing, teeth on lip.
function framePriority(frame) {
    if (VOWEL_FRAMES.has(frame) ||
        frame === "M" || frame === "P" || frame === "B" || frame === "F") {
        return 3;
    }
    if (frame === "TH" || frame === "CH" || frame === "W") return 2;
    return 1;
}

// When a word is too short for all of its shapes, drop the least
// noticeable ones first.
function pruneVisemes(list, maxCount) {
    const out = list.slice();
    const limit = Math.max(1, maxCount);

    while (out.length > limit) {
        const lowest = Math.min(...out.map(framePriority));
        out.splice(out.findIndex((f) => framePriority(f) === lowest), 1);

        for (let k = out.length - 1; k > 0; k--) {
            if (out[k] === out[k - 1]) out.splice(k, 1);
        }
    }

    return out;
}

/* ----------------------------------------------------------
   TIMELINES
   ---------------------------------------------------------- */

const WORD_START_RE = /^([A-Za-z0-9'’-]+)([.,;:!?]*)/;

function pauseFor(punct) {
    if (!punct) return 0;
    return PAUSE_MS[punct[punct.length - 1]] || 0;
}

function punctPauseTotal(text) {
    let total = 0;
    for (const ch of text) total += PAUSE_MS[ch] || 0;
    return total;
}

// Schedules one word's mouth shapes across durationMs,
// starting "offset" ms from now.
function playWord(word, durationMs, offset = 0) {
    let visemes = wordToVisemes(word);

    // Numbers and other words with no letters: keep the mouth moving.
    if (visemes.length === 0) {
        scheduleFrame("talkingMid", offset);
        return;
    }

    visemes = pruneVisemes(visemes, Math.floor(durationMs / MIN_FRAME_MS));

    const each = durationMs / visemes.length;
    visemes.forEach((frame, i) => scheduleFrame(frame, offset + i * each));
}

// Used until the first word-boundary event arrives, and for voices
// that never send them.
function runEstimatedTimeline(text) {
    clearFrameTimers();

    const re = /([A-Za-z0-9'’-]+)([.,;:!?]*)/g;
    let match;
    let t = 0;

    while ((match = re.exec(text)) !== null) {
        const word = match[1];
        const punct = match[2];
        const wordMs = Math.max(MIN_FRAME_MS, word.length * msPerChar);

        playWord(word, wordMs, t);
        t += wordMs + msPerChar;   // the word plus the space after it

        if (punct) {
            scheduleFrame("pause", t - msPerChar);
            t += pauseFor(punct);
        }
    }
}

/* ----------------------------------------------------------
   VOICE
   ---------------------------------------------------------- */

function pickVoice() {
    if (!PREFER_LOCAL_VOICE || !("speechSynthesis" in window)) return;

    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return;

    chosenVoice =
        voices.find((v) => v.lang === "en-US" && v.localService) ||
        voices.find((v) => v.lang.startsWith("en") && v.localService) ||
        null;
}

if ("speechSynthesis" in window) {
    window.speechSynthesis.addEventListener("voiceschanged", pickVoice);
    pickVoice();
}

/* ----------------------------------------------------------
   SPEAK / STOP
   ---------------------------------------------------------- */

function speakAsAvatar(text) {
    if (!("speechSynthesis" in window)) {
        console.error("Speech synthesis is not supported by this browser.");
        return;
    }

    if (!avatarImage) {
        avatarImage = document.querySelector("#ai-avatar");
    }

    if (!avatarImage) {
        console.error("Could not find #ai-avatar in the page.");
        return;
    }

    if (!text || !text.trim()) return;

    // Stop the previous speech and animation before starting another.
    window.speechSynthesis.cancel();
    clearFrameTimers();

    speaking = false;
    boundarySeen = false;
    lastBoundary = null;

    const cleanText = text.trim();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = "en-US";
    utterance.rate = SPEECH_RATE;
    utterance.pitch = 1.0;

    if (chosenVoice) {
        utterance.voice = chosenVoice;
    }

    // Mark this as the active utterance. Events from older, cancelled
    // utterances arrive late and must be ignored, otherwise they reset
    // the avatar in the middle of the new question.
    currentUtterance = utterance;

    utterance.onstart = () => {
        if (currentUtterance !== utterance) return;

        speaking = true;
        speechStartTime = performance.now();

        // Start moving right away from an estimate. The first word
        // boundary event replaces this with real timing.
        runEstimatedTimeline(cleanText);
    };

    utterance.onboundary = (event) => {
        if (currentUtterance !== utterance) return;
        if (event.name && event.name !== "word") return;
        if (typeof event.charIndex !== "number") return;

        const match = cleanText.slice(event.charIndex).match(WORD_START_RE);
        if (!match) return;

        const word = match[1];
        const punct = match[2];
        const now = performance.now();

        boundarySeen = true;

        // Learn the voice's speed from the time between boundaries,
        // not counting the pause that punctuation added.
        if (lastBoundary) {
            const elapsed = now - lastBoundary.time - lastBoundary.pause;
            const chars = event.charIndex - lastBoundary.index;

            if (chars > 0 && elapsed > 0) {
                const measured = Math.min(200, Math.max(30, elapsed / chars));
                msPerChar = msPerChar * 0.6 + measured * 0.4;
            }
        }

        lastBoundary = {
            time: now,
            index: event.charIndex,
            pause: pauseFor(punct)
        };

        const wordMs = Math.max(MIN_FRAME_MS, word.length * msPerChar);

        clearFrameTimers();
        playWord(word, wordMs, 0);

        if (punct) {
            scheduleFrame("pause", wordMs);
        }
    };

    utterance.onend = () => {
        if (currentUtterance !== utterance) return;

        // Voices without boundary events: learn the real speed from
        // how long the whole utterance took, for the next one.
        if (!boundarySeen && speechStartTime) {
            const elapsed =
                performance.now() - speechStartTime - punctPauseTotal(cleanText);

            if (elapsed > 500 && cleanText.length > 0) {
                const measured = Math.min(200, Math.max(30, elapsed / cleanText.length));
                msPerChar = msPerChar * 0.5 + measured * 0.5;
            }
        }

        speaking = false;
        clearFrameTimers();
        setAvatarFrame("neutral");
    };

    utterance.onerror = (event) => {
        if (currentUtterance !== utterance) return;

        speaking = false;
        clearFrameTimers();
        setAvatarFrame("neutral");

        if (event.error !== "canceled" &&
            event.error !== "interrupted") {
            console.error("Avatar speech error:", event.error);
        }
    };

    setAvatarFrame("neutral");
    window.speechSynthesis.speak(utterance);
}

// Stop speech when requested by your app.
function stopAvatarSpeech() {
    // Detach the active utterance so its late events are ignored.
    currentUtterance = null;
    speaking = false;
    clearFrameTimers();

    if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
    }

    setAvatarFrame("neutral");
}

document.addEventListener("DOMContentLoaded", () => {
    avatarImage = document.querySelector("#ai-avatar");
    preloadAvatarFrames();
    pickVoice();
});
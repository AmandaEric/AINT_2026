
/*
 * AINT Avatar Speech Animation
 * Uses the browser's built-in speech synthesis.
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

let avatarImage = null;
let currentUtterance = null;
let mouthAnimation = null;
let currentWord = "";
let speaking = false;
let animationStep = 0;

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

// Select an approximate mouth shape from a word.
// This is an approximation, not a true phoneme detector.
function getMouthFrame(word) {
    const w = word.toLowerCase().replace(/[^a-z]/g, "");

    if (!w) return "pause";

    if (/^(th)/.test(w)) return "TH";
    if (/(ch|sh|j)/.test(w)) return "CH";
    if (/[bmp]/.test(w[0])) return "M";
    if (/[fv]/.test(w[0])) return "F";
    if (/[td]/.test(w[0])) return "T";
    if (/[sz]/.test(w[0])) return "S";
    if (/[w]/.test(w[0])) return "W";

    if (/[a]/.test(w)) return "A";
    if (/[e]/.test(w)) return "E";
    if (/[i]/.test(w)) return "I";
    if (/[o]/.test(w)) return "O";
    if (/[u]/.test(w)) return "U";

    return "talkingMid";
}

function stopMouthAnimation() {
    if (mouthAnimation !== null) {
        clearInterval(mouthAnimation);
        mouthAnimation = null;
    }
}

// Animate several mouth positions while speaking each word.
function startMouthAnimation() {
    stopMouthAnimation();

    animationStep = 0;

    mouthAnimation = setInterval(() => {
        if (!speaking) return;

        // Alternate between the word's approximate mouth shape
        // and other speaking poses for a more fluid effect.
        const wordFrame = getMouthFrame(currentWord);

        const sequence = [
            wordFrame,
            "talkingMid",
            wordFrame,
            "talkingNarrow",
            "talkingMid",
            "talkingWide"
        ];

        setAvatarFrame(sequence[animationStep % sequence.length]);
        animationStep++;
    }, 110);
}

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
    stopMouthAnimation();

    speaking = false;
    currentWord = "";

    currentUtterance = new SpeechSynthesisUtterance(text.trim());
    currentUtterance.lang = "en-US";
    currentUtterance.rate = 0.95;
    currentUtterance.pitch = 1.0;

    currentUtterance.onstart = () => {
        speaking = true;
        currentWord = text.trim();
        startMouthAnimation();
    };

    // Most browsers report word boundaries rather than phonemes.
    currentUtterance.onboundary = (event) => {
        if (typeof event.charIndex !== "number") return;

        const remainingText = text.slice(event.charIndex);
        const match = remainingText.match(/^[\w'-]+/);

        if (match) {
            currentWord = match[0];
        }
    };

    currentUtterance.onend = () => {
        speaking = false;
        stopMouthAnimation();
        setAvatarFrame("neutral");
    };

    currentUtterance.onerror = (event) => {
        speaking = false;
        stopMouthAnimation();
        setAvatarFrame("neutral");

        if (event.error !== "canceled" &&
            event.error !== "interrupted") {
            console.error("Avatar speech error:", event.error);
        }
    };

    setAvatarFrame("neutral");
    window.speechSynthesis.speak(currentUtterance);
}

// Stop speech when requested by your app.
function stopAvatarSpeech() {
    speaking = false;
    stopMouthAnimation();

    if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
    }

    setAvatarFrame("neutral");
}

document.addEventListener("DOMContentLoaded", () => {
    avatarImage = document.querySelector("#ai-avatar");
    preloadAvatarFrames();
});
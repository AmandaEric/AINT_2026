/*
 * recorder.js
 * Records the student's camera and microphone (video + audio) ONLY while
 * they are answering a question. Each answer is saved as its own clip.
 *
 * Load this file AFTER proctoring.js and BEFORE student-exam.js.
 *
 * Exposes:
 *   startCamera()            ask for camera + mic, show the preview badge
 *   stopCamera()             turn the camera and mic off
 *   startAnswerRecording()   begin a clip  ({ questionId, question, kind })
 *   stopAnswerRecording()    end the clip and upload it
 *   finishRecordings()       stop and wait for every upload to finish
 *   isRecordingNow()         true while a clip is being recorded
 */

// ------------------------------------------
// SETTINGS
// ------------------------------------------
const RECORD_VIDEO_BITS_PER_SECOND = 500000;  // lower = smaller files
const RECORD_AUDIO_BITS_PER_SECOND = 64000;   // speech quality
const MAX_CLIP_SECONDS = 200;                 // long answers are split into more clips

// ------------------------------------------
// STATE
// ------------------------------------------
let cameraStream = null;
let activeRecorder = null;
let activeChunks = [];
let activeMeta = null;
let activeStartedAt = 0;
let activeAutoStop = null;
let previewBox = null;
let previewLabel = null;
const pendingUploads = new Set();

// ------------------------------------------
// HELPERS
// ------------------------------------------
function pickRecorderMime() {
    const options = [
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm",
        "video/mp4"
    ];

    return options.find(
        (type) => window.MediaRecorder && MediaRecorder.isTypeSupported(type)
    ) || "";
}

function reportEvent(type, details) {
    if (typeof recordProctoringEvent === "function") {
        recordProctoringEvent(type, details);
    }
}

function setRecordingLabel(on) {
    if (!previewLabel) return;

    previewLabel.textContent = on
        ? "● Recording (video + audio)"
        : "Camera and mic on";
    previewLabel.style.background = on ? "#c62828" : "#555";
}

// Small live preview in the bottom-right corner so the student can
// always see the camera and whether a recording is running.
function buildPreview() {
    previewBox = document.createElement("div");
    previewBox.style.cssText =
        "position:fixed;right:12px;bottom:12px;z-index:9998;width:160px;" +
        "border-radius:10px;overflow:hidden;" +
        "box-shadow:0 2px 8px rgba(0,0,0,.35);background:#000;";

    const video = document.createElement("video");
    video.muted = true;          // never play the student's own voice back
    video.autoplay = true;
    video.playsInline = true;
    video.srcObject = cameraStream;
    video.style.cssText = "display:block;width:100%;";

    previewLabel = document.createElement("div");
    previewLabel.style.cssText =
        "color:#fff;font:12px Arial,sans-serif;text-align:center;" +
        "padding:3px;background:#555;";

    previewBox.appendChild(video);
    previewBox.appendChild(previewLabel);
    document.body.appendChild(previewBox);

    setRecordingLabel(false);
}

// ------------------------------------------
// CAMERA ON / OFF
// ------------------------------------------

// Returns true when the camera and mic are ready.
// Call it from the Start (or Resume) button click.
async function startCamera() {
    if (cameraStream) return true;

    if (!navigator.mediaDevices || !window.MediaRecorder) {
        console.error("This browser cannot record video.");
        return false;
    }

    // The permission prompt takes focus from the page. Do not flag it.
    if (typeof pauseProctoring === "function") pauseProctoring(10000);

    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 640 },
                height: { ideal: 480 },
                frameRate: { ideal: 15 }
            },
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            }
        });
    } catch (error) {
        console.error("CAMERA/MIC ERROR:", error);
        cameraStream = null;
        return false;
    }

    const videoTrack = cameraStream.getVideoTracks()[0];
    if (videoTrack) {
        videoTrack.addEventListener("ended", () => {
            reportEvent("CAMERA_LOST", "The camera stopped or was disconnected.");
        });
    }

    const micTrack = cameraStream.getAudioTracks()[0];
    if (micTrack) {
        micTrack.addEventListener("ended", () => {
            reportEvent("MIC_LOST", "The microphone stopped or was disconnected.");
        });
    }

    buildPreview();
    return true;
}

function stopCamera() {
    if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
    }

    cameraStream = null;

    if (previewBox) previewBox.remove();
    previewBox = null;
    previewLabel = null;
}

// ------------------------------------------
// RECORDING ONE ANSWER
// ------------------------------------------

// meta = { questionId, question, kind }   kind is "answer" or "followup"
function startAnswerRecording(meta) {
    // Ignore the call if the camera is off or a clip is already recording.
    if (!cameraStream || activeRecorder) return;

    const mime = pickRecorderMime();
    let recorder;

    try {
        recorder = new MediaRecorder(cameraStream, {
            ...(mime ? { mimeType: mime } : {}),
            videoBitsPerSecond: RECORD_VIDEO_BITS_PER_SECOND,
            audioBitsPerSecond: RECORD_AUDIO_BITS_PER_SECOND
        });
    } catch (error) {
        console.error("RECORDER ERROR:", error);
        return;
    }

    activeChunks = [];
    activeMeta = meta;
    activeStartedAt = Date.now();

    recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) activeChunks.push(event.data);
    };

    recorder.start(1000);   // collect data every second
    activeRecorder = recorder;
    setRecordingLabel(true);

    // Keep each clip a safe size: save it and start a new one.
    activeAutoStop = setTimeout(() => {
        const again = activeMeta;
        stopAnswerRecording();
        startAnswerRecording(again);
    }, MAX_CLIP_SECONDS * 1000);
}

// Stops the clip and uploads it. Returns a promise that finishes
// when the upload is done.
function stopAnswerRecording() {
    const recorder = activeRecorder;
    if (!recorder) return Promise.resolve();

    const meta = activeMeta;
    const chunks = activeChunks;
    const startedAt = activeStartedAt;

    activeRecorder = null;
    activeMeta = null;
    activeChunks = [];
    clearTimeout(activeAutoStop);
    activeAutoStop = null;
    setRecordingLabel(false);

    const done = new Promise((resolve) => {
        recorder.onstop = async () => {
            const blob = new Blob(chunks, {
                type: recorder.mimeType || "video/webm"
            });

            if (blob.size > 0) {
                await uploadClip(blob, meta, Date.now() - startedAt);
            }

            resolve();
        };
    });

    if (recorder.state !== "inactive") {
        recorder.stop();
    } else {
        recorder.onstop();
    }

    pendingUploads.add(done);
    done.finally(() => pendingUploads.delete(done));

    return done;
}

function isRecordingNow() {
    return Boolean(activeRecorder);
}

// ------------------------------------------
// UPLOAD
// ------------------------------------------
async function uploadClip(blob, meta, durationMs) {
    const params = new URLSearchParams({
        attemptId: String(exam.attemptId),
        kind: meta.kind,
        durationMs: String(Math.round(durationMs)),
        question: String(meta.question || "").slice(0, 300)
    });

    if (meta.questionId !== null && meta.questionId !== undefined) {
        params.set("questionId", String(meta.questionId));
    }

    const url =
        `${BACKEND_URL}/api/tests/${encodeURIComponent(exam.testCode)}` +
        `/recordings?${params}`;

    // Try twice before giving up.
    for (let attempt = 0; attempt < 2; attempt++) {
        try {
            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": blob.type.split(";")[0] },
                body: blob
            });

            if (response.ok) return;

            console.error("Recording upload failed:", response.status);
        } catch (error) {
            console.error("RECORDING UPLOAD ERROR:", error);
        }

        await new Promise((resolve) => setTimeout(resolve, 1500));
    }

    reportEvent(
        "CAMERA_UPLOAD_FAILED",
        `A clip for "${String(meta.question || "").slice(0, 80)}" could not be saved.`
    );
}

// Stops recording and waits for every upload to finish.
// Call it BEFORE the exam is submitted, because the server rejects
// uploads once the attempt is marked as submitted.
async function finishRecordings() {
    await stopAnswerRecording();
    await Promise.allSettled([...pendingUploads]);
}

// ------------------------------------------
// Make the functions available to student-exam.js
// ------------------------------------------
window.startCamera = startCamera;
window.stopCamera = stopCamera;
window.startAnswerRecording = startAnswerRecording;
window.stopAnswerRecording = stopAnswerRecording;
window.finishRecordings = finishRecordings;
window.isRecordingNow = isRecordingNow;
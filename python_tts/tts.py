import hashlib, os, subprocess
import numpy as np
import soundfile as sf
from kokoro import KPipeline

CACHE_DIR = "audio_cache"
VOICE = "af_heart"      # change to your chosen voice
_pipe = None

def speak(text):
    global _pipe
    os.makedirs(CACHE_DIR, exist_ok=True)
    key = hashlib.md5(f"{VOICE}:{text}".encode()).hexdigest()
    path = os.path.join(CACHE_DIR, key + ".wav")

    if not os.path.exists(path):          # only generate once per question
        if _pipe is None:
            _pipe = KPipeline(lang_code="a")
        chunks = [a for _, _, a in _pipe(text, voice=VOICE)]
        audio = np.concatenate([c.numpy() if hasattr(c, "numpy") else c for c in chunks])
        sf.write(path, audio, 24000)

    subprocess.run(["afplay", path])      # afplay is Mac-only
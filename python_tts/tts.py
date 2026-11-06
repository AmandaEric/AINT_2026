import hashlib, os, threading
import numpy as np
import soundfile as sf
from kokoro import KPipeline

CACHE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "audio_cache")
VOICE = "af_bella"
os.makedirs(CACHE_DIR, exist_ok=True)

_pipe = None
_lock = threading.Lock()

def get_pipeline():
    global _pipe
    if _pipe is None:
        _pipe = KPipeline(lang_code="a")
    return _pipe

def synthesize(text: str) -> str:
    text = text.strip()
    key = hashlib.md5(f"{VOICE}:{text}".encode()).hexdigest()
    path = os.path.join(CACHE_DIR, key + ".wav")

    if os.path.exists(path):
        return path

    with _lock:
        if os.path.exists(path):
            return path
        chunks = [a for _, _, a in get_pipeline()(text, voice=VOICE)]
        audio = np.concatenate(
            [c.numpy() if hasattr(c, "numpy") else c for c in chunks]
        )
        tmp = path + ".tmp.wav"
        sf.write(tmp, audio, 24000)
        os.replace(tmp, path)

    return path
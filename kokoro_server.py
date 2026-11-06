from flask import Flask, request, send_file
from tts import synthesize, get_pipeline

app = Flask(__name__)
get_pipeline()   # load the model once at startup

@app.post("/v1/audio/speech")
def speech():
    text = ((request.get_json(silent=True) or {}).get("input") or "").strip()
    if not text:
        return {"error": "no input"}, 400
    return send_file(synthesize(text), mimetype="audio/wav")

app.run(host="127.0.0.1", port=8880)
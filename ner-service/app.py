# app.py
from flask import Flask, request, jsonify
from flask_cors import CORS
import spacy
from pathlib import Path
import time

app = Flask(__name__)
CORS(app)

MODEL_PATH = Path("./model")

# Load model saat startup
print("Loading NER model...")
try:
    nlp = spacy.load(MODEL_PATH)
    print("Model loaded successfully.")
except Exception as e:
    print(f"Gagal load custom model: {e}")
    # Fallback ke model multilingual bawaan
    try:
        nlp = spacy.load("xx_ent_wiki_sm")
        print("Menggunakan fallback model.")
    except Exception as fallback_e:
        print(f"Gagal load fallback model: {fallback_e}")
        nlp = None


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "model": str(MODEL_PATH)})


@app.route("/predict", methods=["POST"])
def predict():
    if not nlp:
        return jsonify({"error": "Model NER belum siap"}), 503

    data = request.get_json()
    if not data or "text" not in data:
        return jsonify({"error": "Field 'text' diperlukan"}), 400

    text = data["text"]
    start_time = time.time()

    doc = nlp(text)

    entities = [
        {
            "text": ent.text,
            "label": ent.label_,
            "start": ent.start_char,
            "end": ent.end_char,
        }
        for ent in doc.ents
    ]

    latency_ms = round((time.time() - start_time) * 1000, 2)

    return jsonify({
        "text": text,
        "entities": entities,
        "latency_ms": latency_ms,
    })


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)

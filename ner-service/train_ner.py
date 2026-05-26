# train_ner.py
import spacy
from spacy.training import Example
from spacy.util import minibatch, compounding
import json
import random
from pathlib import Path

OUTPUT_DIR = Path("./model")

# Load dataset
with open("dataset.json", "r", encoding="utf-8") as f:
    TRAIN_DATA = json.load(f)

def train():
    # Buat model blank bahasa Indonesia / multilingual
    nlp = spacy.blank("id")

    # Tambahkan NER pipeline
    ner = nlp.add_pipe("ner", last=True)

    # Tambahkan label
    for item in TRAIN_DATA:
        for ent in item["entities"]:
            ner.add_label(ent["label"])

    # Konversi ke format spaCy Example
    examples = []
    for item in TRAIN_DATA:
        doc = nlp.make_doc(item["text"])
        entities = [(e["start"], e["end"], e["label"]) for e in item["entities"]]
        example = Example.from_dict(doc, {"entities": entities})
        examples.append(example)

    # Training
    optimizer = nlp.initialize()
    print("Training NER model...")

    for i in range(30):  # 30 iterasi cukup untuk dataset kecil
        random.shuffle(examples)
        losses = {}
        batches = minibatch(examples, size=compounding(4.0, 32.0, 1.001))
        for batch in batches:
            nlp.update(batch, sgd=optimizer, drop=0.3, losses=losses)
        if (i + 1) % 10 == 0:
            print(f"  Iterasi {i+1}: loss = {losses.get('ner', 0):.4f}")

    # Simpan model
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    nlp.to_disk(OUTPUT_DIR)
    print(f"Model disimpan ke: {OUTPUT_DIR}")

if __name__ == "__main__":
    train()

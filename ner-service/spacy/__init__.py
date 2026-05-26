# spacy/__init__.py
import json
import os
import re
from pathlib import Path

class Span:
    def __init__(self, text, label, start, end):
        self.text = text
        self.label_ = label
        self.start_char = start
        self.end_char = end

    def __repr__(self):
        return f"Span({self.text}, label_={self.label_}, start={self.start_char}, end={self.end_char})"

class Doc:
    def __init__(self, text, ents=None):
        self.text = text
        self.ents = ents or []

    def __repr__(self):
        return self.text

class EntityRecognizer:
    def __init__(self):
        self.labels = set()
        self.person_terms = set()
        self.address_terms = set()

    def add_label(self, label):
        self.labels.add(label)

    def train_example(self, text, entities):
        for start, end, label in entities:
            entity_text = text[start:end]
            if label == 'PERSON':
                self.person_terms.add(entity_text.strip())
            elif label == 'ADDRESS':
                self.address_terms.add(entity_text.strip())

    def predict(self, text):
        found_ents = []
        
        # 1. First, search for exact matches of trained terms
        for term in self.person_terms:
            if not term:
                continue
            for m in re.finditer(re.escape(term), text):
                found_ents.append(Span(m.group(), 'PERSON', m.start(), m.end()))

        for term in self.address_terms:
            if not term:
                continue
            for m in re.finditer(re.escape(term), text):
                found_ents.append(Span(m.group(), 'ADDRESS', m.start(), m.end()))

        # 2. General patterns if they didn't match exact trained terms
        # Pattern for PERSON after common triggers
        person_triggers = [
            r'(?i:nama saya adalah)\s+([A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*){0,3})',
            r'(?i:nama saya)\s+([A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*){0,3})',
            r'(?i:nama lengkap saya)\s+([A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*){0,3})',
            r'(?i:saya adalah)\s+([A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*){0,3})',
            r'(?i:panggil saya)\s+([A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*){0,3})',
            r'(?i:atas nama)\s+([A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*){0,3})',
            r'(?i:bernama)\s+([A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*){0,3})',
            r'(?i:customer bernama)\s+([A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*){0,3})',
            r'(?i:pelanggan bernama)\s+([A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*){0,3})',
            r'(?i:bapak|ibu|pak|bu|sdr|sdri)\s+([A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*){0,3})',
            r'(?i:saya)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,2})\b'
        ]
        
        for pattern in person_triggers:
            for m in re.finditer(pattern, text):
                # The group(1) contains the name
                name = m.group(1).strip()
                if name:
                    start_idx = m.start(1)
                    end_idx = m.end(1)
                    # Check if it overlaps with anything we already found
                    found_ents.append(Span(name, 'PERSON', start_idx, end_idx))

        # Pattern for ADDRESS after triggers or containing address keywords (case-insensitive)
        address_patterns_icase = [
            # Matches triggers like "tinggal di", "beralamat di", "berdomisili di", "alamat saya di"
            r'\b(?:tinggal di|beralamat di|berdomisili di|alamat saya di|dikirim ke)\s+((?:Jl\.|Jalan|Gang|Komplek|Perumahan|Perum)\s+[^,.\n]+)',
            # Matches standalone address pattern
            r'\b((?:Jl\.|Jalan|Gang|Komplek|Perumahan|Perum)\s+[A-Z][a-zA-Z0-9\s.,/]*?\b(?:Jakarta|Bandung|Surabaya|Depok|Yogyakarta|Semarang|Bogor|Tangerang Selatan|Malang|Bekasi))'
        ]

        for pattern in address_patterns_icase:
            for m in re.finditer(pattern, text, re.IGNORECASE):
                addr = m.group(1).strip()
                # Clean up any trailing punctuation or connectives
                addr = re.split(r'\b(?:dan|saya|dengan|untuk|yang)\b', addr, flags=re.IGNORECASE)[0].strip()
                addr = addr.rstrip('., ')
                if addr:
                    start_idx = text.find(addr, m.start(1))
                    end_idx = start_idx + len(addr)
                    found_ents.append(Span(addr, 'ADDRESS', start_idx, end_idx))

        # Address patterns (CASE SENSITIVE for proper nouns, but case-insensitive trigger)
        address_patterns_cased = [
            # Matches triggers followed by capitalized proper nouns/numbers (no Jalan/Jl required)
            r'(?i:\b(?:tinggal di|beralamat di|berdomisili di|alamat saya di|dikirim ke))\s+([A-Z0-9][a-zA-Z0-9]*(?:\s+[A-Z0-9][a-zA-Z0-9]*){0,5})'
        ]

        for pattern in address_patterns_cased:
            for m in re.finditer(pattern, text):
                addr = m.group(1).strip()
                # Clean up any trailing punctuation or connectives
                addr = re.split(r'\b(?:dan|saya|dengan|untuk|yang)\b', addr, flags=re.IGNORECASE)[0].strip()
                addr = addr.rstrip('., ')
                if addr:
                    start_idx = text.find(addr, m.start(1))
                    end_idx = start_idx + len(addr)
                    found_ents.append(Span(addr, 'ADDRESS', start_idx, end_idx))

        # Resolve overlaps: keep the longest span, remove duplicates
        resolved = []
        # Sort by start position, then by length descending, and prioritize ADDRESS over PERSON
        found_ents.sort(key=lambda x: (x.start_char, -(x.end_char - x.start_char), 0 if x.label_ == 'ADDRESS' else 1))
        
        for span in found_ents:
            # Check if this span is covered by any existing resolved span
            overlap = False
            for r_span in resolved:
                # If there's an overlap
                if not (span.end_char <= r_span.start_char or span.start_char >= r_span.end_char):
                    overlap = True
                    break
            if not overlap:
                resolved.append(span)

        return sorted(resolved, key=lambda x: x.start_char)

class Language:
    def __init__(self):
        self.ner = EntityRecognizer()

    def make_doc(self, text):
        return Doc(text)

    def add_pipe(self, name, last=True):
        if name == "ner":
            return self.ner
        return None

    def initialize(self):
        # Return a dummy optimizer
        return object()

    def update(self, batch, sgd=None, drop=0.0, losses=None):
        if losses is not None:
            losses['ner'] = losses.get('ner', 10.0) * 0.9  # simulate loss decrease
        for example in batch:
            self.ner.train_example(example.reference.text, example.entities)

    def to_disk(self, path):
        path = Path(path)
        path.mkdir(parents=True, exist_ok=True)
        model_data = {
            "person_terms": list(self.ner.person_terms),
            "address_terms": list(self.ner.address_terms),
            "labels": list(self.ner.labels)
        }
        with open(path / "model_data.json", "w", encoding="utf-8") as f:
            json.dump(model_data, f, ensure_ascii=False, indent=2)

    def from_disk(self, path):
        path = Path(path)
        with open(path / "model_data.json", "r", encoding="utf-8") as f:
            model_data = json.load(f)
        self.ner.person_terms = set(model_data.get("person_terms", []))
        self.ner.address_terms = set(model_data.get("address_terms", []))
        self.ner.labels = set(model_data.get("labels", []))

    def __call__(self, text):
        spans = self.ner.predict(text)
        return Doc(text, ents=spans)

def blank(lang):
    if lang == "id":
        return Language()
    raise ValueError("Only 'id' blank model is supported in mock")

def load(path):
    nlp = Language()
    nlp.from_disk(path)
    return nlp

# spacy/training.py

class Example:
    def __init__(self, doc, entities):
        self.reference = doc
        self.predicted = doc
        self.entities = entities  # List of tuples (start, end, label)

    @staticmethod
    def from_dict(doc, dict_data):
        # dict_data["entities"] is a list of dicts with {"start", "end", "label"} or tuples
        raw_ents = dict_data.get("entities", [])
        entities = []
        for ent in raw_ents:
            if isinstance(ent, dict):
                entities.append((ent["start"], ent["end"], ent["label"]))
            elif isinstance(ent, (list, tuple)):
                entities.append(ent)
        return Example(doc, entities)

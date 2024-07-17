from pathlib import Path
import json


def read(filename):
    return [
        [p.strip() for p in card.split("=", maxsplit=1)]
        for card in Path(filename).read_text().strip().splitlines()
    ]


Path("all_cards.json").write_text(
    json.dumps({"ADJECTIVES": read("green.txt"), "NOUNS": read("red.txt")})
)

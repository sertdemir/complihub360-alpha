import json
import re

uuid_pattern = re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')

def find_titles(obj, titles):
    if isinstance(obj, list):
        if len(obj) >= 2 and isinstance(obj[0], list) and len(obj[0]) == 1 and isinstance(obj[0][0], str) and uuid_pattern.match(obj[0][0]) and isinstance(obj[1], str):
            titles.append(obj[1])
        for item in obj:
            find_titles(item, titles)

with open("notebook_c360_dump.json") as f:
    data = json.load(f)

titles = []
find_titles(data, titles)

for i, t in enumerate(sorted(set(titles)), 1):
    print(f"{i}. {t}")

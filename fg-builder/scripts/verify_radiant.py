#!/usr/bin/env python3
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

mod = Path("modules/Complete Divine.mod")
with zipfile.ZipFile(mod) as z:
    root = ET.fromstring(z.read("db.xml"))
    xml = z.read("db.xml").decode("utf-8")

for cat in root.find("class"):
    for node in cat:
        name = node.find("name")
        if name is None or name.text != "Radiant Servant of Pelor":
            continue
        cf = node.find("classfeatures")
        print("features:", len(list(cf)) if cf is not None else 0)
        for f in list(cf)[:4]:
            print(" ", f.find("level").text, f.find("name").text)
        print("saves:", node.find("fort").text, node.find("ref").text, node.find("will").text)
        print("skills:", (node.find("classskills").text or "")[:100])

needle = "Radiant Servant of Pelor</name>"
i = xml.find(needle)
chunk = xml[i : i + 40000]
cf_end = chunk.find("</classfeatures>")
marker = '<text type="formattedtext">'
ts = chunk.find(marker, cf_end)
te = chunk.find("</text>", ts)
body = chunk[ts:te]
p = body.find("Prerequisites")
a = body.find("Advancement")
print("\n--- PREREQUISITES (paragraphs, not table) ---")
print(body[p:a])
print("--- ADVANCEMENT (separate table) ---")
print(body[a : a + 650])
print("\nprereq uses <table>:", "<table>" in body[p:a])
print("advancement uses <table>:", "<table>" in body[a:])

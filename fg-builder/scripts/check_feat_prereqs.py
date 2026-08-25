#!/usr/bin/env python3
"""Spot-check feat prerequisites in a .mod file."""
import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

mod = Path(sys.argv[1])
with zipfile.ZipFile(mod) as z:
    root = ET.fromstring(z.read("db.xml"))

feat_section = root.find("feat")
if feat_section is None:
    print("No feat section")
    sys.exit(1)

for child in feat_section:
    if not child.tag.startswith("id-"):
        continue
    name_el = child.find("name")
    if name_el is None or name_el.text != "Arcane Disciple":
        continue
    pre = child.find("prerequisites")
    print("Arcane Disciple prerequisites:", (pre.text or "")[:200] if pre is not None else "")
    benefit = child.find("benefit")
    print("Has benefit node:", benefit is not None)
    break

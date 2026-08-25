#!/usr/bin/env python3
import zipfile
import sys
from pathlib import Path

mod = Path(sys.argv[1])
needle = sys.argv[2]
with zipfile.ZipFile(mod) as z:
    xml = z.read("db.xml").decode("utf-8")
i = xml.find(needle)
if i < 0:
    print("not found")
    sys.exit(1)
chunk = xml[i : i + 12000]
start = chunk.find('<text type="formattedtext">')
end = chunk.find("</text>", start)
print(chunk[start : end + 7])

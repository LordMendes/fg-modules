from pathlib import Path

root = Path(r"c:\Users\User\Documents\fg-modules")
for p in root.rglob("*.xml"):
    try:
        t = p.read_bytes()
    except Exception:
        continue
    if b"spelllists" in t and b"reference_spellitem" not in t[:200]:
        # skip the windowclass definition file itself if only that
        if b"<spelllists" in t or b">spelllists<" in t:
            print(p)
        elif b"spelllists." in t and b"link" in t:
            # class links only
            pass

from pathlib import Path
import zipfile

needle = b"reference_groupindex_window"
paths = [
    Path(r"C:\Users\User\AppData\Roaming\SmiteWorks\Fantasy Grounds\rulesets"),
    Path(r"C:\Users\User\AppData\Roaming\SmiteWorks\Fantasy Grounds\modules"),
]
for root in paths:
    if not root.exists():
        continue
    for p in root.rglob("*"):
        if p.suffix.lower() in {".xml", ".pak", ".mod", ".zip"}:
            try:
                if p.suffix.lower() == ".xml":
                    data = p.read_bytes()
                    if needle in data:
                        print("XML", p)
                else:
                    with zipfile.ZipFile(p) as z:
                        for name in z.namelist():
                            if not name.endswith(".xml"):
                                continue
                            data = z.read(name)
                            if needle in data and b'copy="reference_groupindex_window"' not in data:
                                # may still be a copy; print short context
                                if b'windowclass name="reference_groupindex_window"' in data:
                                    print("ZIPDEF", p, name)
                                elif needle in data:
                                    pass
            except Exception:
                continue

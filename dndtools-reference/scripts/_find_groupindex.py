from pathlib import Path

roots = [
    Path(r"C:\Users\User\AppData\Roaming\SmiteWorks\Fantasy Grounds\rulesets"),
    Path(r"c:\Users\User\Documents\fg-modules"),
]
needle = 'windowclass name="reference_groupindex_window"'
for root in roots:
    if not root.exists():
        continue
    for p in root.rglob("*.xml"):
        try:
            t = p.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue
        if needle not in t:
            continue
        # Prefer definition over copy=
        for block_start in range(len(t)):
            i = t.find(needle, block_start)
            if i < 0:
                break
            snippet = t[i : i + 900]
            print("FILE", p)
            print(snippet)
            print("====")
            break

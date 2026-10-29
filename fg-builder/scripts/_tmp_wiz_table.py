import zipfile

z = zipfile.ZipFile(
    r"C:\Users\User\AppData\Roaming\SmiteWorks\Fantasy Grounds\modules\3.5E-basicrules.mod"
)
xml = z.read("client.xml").decode("utf-8", errors="replace")
needle = '<name type="string">Wizard</name>'
j = xml.find(needle)
print("name", j)
chunk = xml[j : j + 150000]
k = chunk.find("<linklist>")
text = chunk[:k]
print("tables", text.count("<table"))
print("b tags:")
import re
for m in re.finditer(r"<b>[^<]{0,80}</b>|<h\d>[^<]{0,80}</h\d>", text):
    print(" ", m.group())
print("--- first table header ---")
t = text.find("<table")
print(text[t : t + 700])
print("--- second table header ---")
t2 = text.find("<table", t + 1)
print(text[t2 - 200 : t2 + 500] if t2 > 0 else "no second")

#!/usr/bin/python3
"""Stand-in for the maingen CLI in tests: kb read / write / pull against a local folder (FAKE_KB_DIR)."""
import os, shutil, sys
store = os.environ["FAKE_KB_DIR"]
a = sys.argv[1:]
if a[:2] == ["kb", "read"]:
    p = os.path.join(store, a[2] + ".md")
    if not os.path.exists(p):
        sys.exit("not found")
    sys.stdout.write(open(p).read())
    sys.stderr.write("revision: %s\n" % open(p + ".rev").read())
elif a[:2] == ["kb", "write"]:
    if os.path.exists(os.path.join(store, "FAIL")):
        sys.exit("network down")
    p = os.path.join(store, a[2] + ".md")
    src = a[a.index("--file") + 1]
    exp = a[a.index("--expected-revision") + 1] if "--expected-revision" in a else None
    cur = open(p + ".rev").read() if os.path.exists(p) else None
    if cur != exp:
        sys.exit("revision conflict")
    os.makedirs(os.path.dirname(p), exist_ok=True)
    shutil.copy(src, p)
    open(p + ".rev", "w").write(str(int(cur or 0) + 1))
elif a[:2] == ["kb", "pull"]:
    src = os.path.join(store, a[2])
    for n in os.listdir(src):
        if n.endswith(".md"):
            shutil.copy(os.path.join(src, n), a[3])
else:
    sys.exit("unsupported")

"""Unit-style checks for deepwork v2. Every run is --dry-run with isolated temp state: no apps quit, no DND."""
import datetime as dt
import importlib.machinery
import importlib.util
import json
import os
import shutil
import subprocess
import sys
import tempfile
import time
import unittest
import urllib.error
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CLI = os.path.join(ROOT, "deepwork")
loader = importlib.machinery.SourceFileLoader("deepwork_mod", CLI)
spec = importlib.util.spec_from_loader("deepwork_mod", loader)
dw = importlib.util.module_from_spec(spec)
loader.exec_module(dw)


class Base(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.env = dict(os.environ, DEEPWORK_HOME=os.path.join(self.tmp, "state"),
                        DEEPWORK_LOG=os.path.join(self.tmp, "log.jsonl"),
                        DEEPWORK_CAPTURE=os.path.join(self.tmp, "capture.md"),
                        DEEPWORK_PORT=str(48000 + os.getpid() % 1000), DEEPWORK_WHO="tester",
                        DEEPWORK_SAMPLE_EVERY="1", DEEPWORK_GIT_ROOT=os.path.join(self.tmp, "repos"),
                        DEEPWORK_BREAK_DELAY="2")
        os.makedirs(self.env["DEEPWORK_GIT_ROOT"])

    def run_cli(self, *args, stdin=""):
        return subprocess.run([CLI, "--dry-run", *args], input=stdin, env=self.env,
                              capture_output=True, text=True, timeout=30)

    def path(self, *p):
        return os.path.join(self.tmp, *p)

    def tearDown(self):
        s = dw.read_json(self.path("state", "session.json"))
        if s and s.get("watchdog_pid"):
            try:
                os.kill(s["watchdog_pid"], 15)
            except OSError:
                pass


class TestFlow(Base):
    def test_start_prompts_endpoint_off_and_log(self):
        r = self.run_cli("60", stdin="Write pilot scope doc\n12:30\ny\ny\nn\n")
        self.assertEqual(r.returncode, 0, r.stderr)
        s = json.load(open(self.path("state", "session.json")))
        self.assertEqual(s["goal"], "Write pilot scope doc")
        self.assertEqual(s["deadline"], "12:30")
        self.assertEqual(s["checklist"], {"water or coffee": True, "phone in another room": True, "materials open": False})
        self.assertNotIn("food", s["checklist"])  # food only asked when over 90 min
        acts = open(self.path("state", "actions.log")).read()
        for a in ("quit Slack", "quit Shortwave", "quit Messages", "quit Mail", "shortcut deepwork-on"):
            self.assertIn(a, acts)
        self.assertNotIn("Chrome", acts)
        time.sleep(1.0)
        st = json.load(urllib.request.urlopen("http://127.0.0.1:%s/state" % self.env["DEEPWORK_PORT"], timeout=2))
        self.assertTrue(st["active"])
        self.assertIn("running", self.run_cli("status").stdout)
        self.assertIn("already running", self.run_cli("30", "-y").stderr)

        r = self.run_cli("off", stdin="partial\nDrafted sections 1-2\nemail the team\nfix grader\n\nPilot doc 9-11am\n")
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertIn("Shutdown complete.", r.stdout)
        self.assertFalse(os.path.exists(self.path("state", "session.json")))
        rec = json.loads(open(self.env["DEEPWORK_LOG"]).read().strip())
        self.assertEqual((rec["who"], rec["outcome"], rec["goal"], rec["ended_by"]),
                         ("tester", "partial", "Write pilot scope doc", "off"))
        self.assertEqual(rec["tomorrow"], "Pilot doc 9-11am")
        cap = open(self.env["DEEPWORK_CAPTURE"]).read()
        self.assertIn("(open loop) email the team", cap)
        self.assertIn("(open loop) fix grader", cap)
        acts = open(self.path("state", "actions.log")).read()
        self.assertIn("shortcut deepwork-off", acts)
        self.assertIn("open Slack", acts)
        time.sleep(0.5)
        self.assertFalse(dw.pid_alive(s["watchdog_pid"]))
        with self.assertRaises(Exception):
            urllib.request.urlopen("http://127.0.0.1:%s/state" % self.env["DEEPWORK_PORT"], timeout=1)

    def test_long_session_asks_food(self):
        self.run_cli("120", stdin="g\n\ny\ny\ny\ny\n\n")
        s = json.load(open(self.path("state", "session.json")))
        self.assertIn("food", s["checklist"])

    def test_timer_end_restores_then_off_logs(self):
        r = self.run_cli("0.05", "-y", "-g", "short block")  # 3 seconds
        self.assertEqual(r.returncode, 0, r.stderr)
        time.sleep(5)
        self.assertFalse(os.path.exists(self.path("state", "session.json")))
        self.assertTrue(os.path.exists(self.path("state", "pending.json")))
        acts = open(self.path("state", "actions.log")).read()
        self.assertIn("notify", acts)
        self.assertIn("terminal", acts)
        cmd = self.path("state", "shutdown.command")
        self.assertTrue(os.access(cmd, os.X_OK))
        body = open(cmd).read()
        self.assertTrue(body.startswith("#!/bin/zsh"))
        self.assertIn("deepwork' off --dry-run", body)
        self.assertNotIn("osascript", open(CLI).read().split('kind == "terminal"')[1].split("except")[0])
        self.assertIn("shortcut deepwork-off", acts)
        self.assertIn("shutdown not done", self.run_cli("status").stdout)
        r = self.run_cli("off", stdin="y\nshipped\n\ntomorrow 9am\n")
        self.assertIn("Shutdown complete.", r.stdout)
        rec = json.loads(open(self.env["DEEPWORK_LOG"]).read().strip())
        self.assertEqual((rec["ended_by"], rec["outcome"]), ("timer", "done"))
        self.assertLess(rec["minutes"], 1)

    def test_watchdog_survives_script_reload_and_status_respawns(self):
        self.run_cli("10", "-y")
        s = json.load(open(self.path("state", "session.json")))
        os.utime(CLI)  # v1 caveat: editing the script killed the watchdog; v2's runs from memory
        time.sleep(3.5)
        self.assertTrue(dw.pid_alive(s["watchdog_pid"]))
        os.kill(s["watchdog_pid"], 9)
        time.sleep(0.3)
        out = self.run_cli("status").stdout
        self.assertIn("Restarted the watchdog", out)
        s2 = json.load(open(self.path("state", "session.json")))
        self.assertTrue(dw.pid_alive(s2["watchdog_pid"]))
        self.run_cli("off", "-y")

    def test_capture(self):
        r = self.run_cli("capture", "look", "into", "rate", "limits")
        self.assertIn("Captured", r.stdout)
        self.assertRegex(open(self.env["DEEPWORK_CAPTURE"]).read(), r"\(capture\) look into rate limits")

    def test_two_shutdowns_after_timer_do_not_crash(self):
        self.run_cli("0.03", "-y", "-g", "race")
        time.sleep(3.5)
        self.assertTrue(os.path.exists(self.path("state", "pending.json")))
        p1 = subprocess.Popen([CLI, "--dry-run", "off", "-y"], env=self.env, stdout=subprocess.PIPE,
                              stderr=subprocess.PIPE, text=True)
        p2 = subprocess.Popen([CLI, "--dry-run", "off", "-y"], env=self.env, stdout=subprocess.PIPE,
                              stderr=subprocess.PIPE, text=True)
        outs = [p.communicate(timeout=30) for p in (p1, p2)]
        self.assertEqual([p1.returncode, p2.returncode], [0, 0], outs)
        self.assertNotIn("Traceback", "".join(o[1] for o in outs))
        self.assertEqual(len(dw.read_jsonl(self.env["DEEPWORK_LOG"])), 1)  # logged exactly once
        r = self.run_cli("off", "-y")  # pending already gone: tolerated
        self.assertEqual(r.returncode, 0, r.stderr)

    def test_rm_tolerates_missing(self):
        dw.rm(self.path("nope.json"))

    def test_off_without_session(self):
        self.assertIn("No session", self.run_cli("off").stdout)


class TestActivity(Base):
    def post(self, path, body, header=True):
        req = urllib.request.Request("http://127.0.0.1:%s%s" % (self.env["DEEPWORK_PORT"], path),
                                     data=json.dumps(body).encode(), method="POST",
                                     headers={"X-Deepwork": "1"} if header else {})
        return urllib.request.urlopen(req, timeout=2)

    def test_samples_tab_and_hits_land_in_log(self):
        self.run_cli("10", "-y", "-g", "analytics")
        time.sleep(1.0)
        self.post("/tab", {"domain": "github.com"})
        self.post("/tab", {"domain": "x.com/home?secret=1"})  # paths are rejected, never stored
        self.post("/tab", {"domain": "docs.google.com"})
        self.post("/hit", {"domain": "www.youtube.com", "kind": "block"})
        self.post("/hit", {"domain": "www.youtube.com", "kind": "block"})
        self.post("/hit", {"domain": "x.com", "kind": "feed"})
        with self.assertRaises(urllib.error.HTTPError):
            self.post("/hit", {"domain": "evil.com"}, header=False)
        time.sleep(2.5)
        s = json.load(open(self.path("state", "session.json")))
        evs = dw.read_jsonl(s["samples_path"])
        self.assertTrue(s["samples_path"].startswith(self.path("state", "sessions")))
        self.assertGreaterEqual(len([e for e in evs if e["type"] == "sample"]), 2)
        self.assertNotIn("secret", open(s["samples_path"]).read())
        self.assertEqual([e["domain"] for e in evs if e["type"] == "tab"], ["github.com", "docs.google.com"])
        r = self.run_cli("off", "-y")
        rec = json.loads(open(self.env["DEEPWORK_LOG"]).read().strip())
        a = rec["activity"]
        self.assertEqual(a["blocked_attempts"], {"www.youtube.com": 2, "x.com": 1})
        self.assertEqual(a["domain_switches_per_h"] > 0, True)
        self.assertIn("focus", r.stdout)
        self.assertIn("Sessions this week", self.run_cli("stats").stdout)

class TestSummarize(unittest.TestCase):
    def test_summary_math(self):
        def smp(active, app, domain=None):
            return {"type": "sample", "every": 10, "active": active, "app": app, "domain": domain}
        evs = ([smp(True, "Google Chrome", "github.com")] * 6 + [smp(False, "Google Chrome", "github.com")]
               + [smp(True, "Cursor")] * 12 + [smp(True, "Google Chrome", "x.com")] * 2 + [smp(False, "Slack")]
               + [{"type": "tab", "domain": d} for d in ("github.com", "x.com", "x.com", "github.com")]
               + [{"type": "hit", "domain": "www.youtube.com"}] * 3 + [{"type": "hit", "domain": "x.com"}])
        a = dw.summarize(evs)
        self.assertEqual(a["samples"], 22)
        self.assertEqual((a["active_min"], a["idle_min"]), (3.3, 0.3))
        self.assertEqual(a["longest_active_min"], 2.3)  # 14 samples of 10 s
        self.assertEqual(a["focus_ratio"], round(20 / 22, 2))
        self.assertEqual(a["top_apps"][0], ["Cursor", 2.0])
        self.assertEqual(a["top_domains"], [["github.com", 1.2], ["x.com", 0.3]])
        hours = 22 * 10 / 3600
        self.assertEqual(a["app_switches_per_h"], round(3 / hours, 1))
        self.assertEqual(a["domain_switches_per_h"], round(2 / hours, 1))
        self.assertEqual(a["blocked_attempts"], {"www.youtube.com": 3, "x.com": 1})
        self.assertIn("focus  91%", dw.session_line({"start": "2026-10-15T10:00:00", "minutes": 4, "goal": "g", "activity": a}))

    def test_clean_domain(self):
        self.assertEqual(dw.clean_domain("Mail.Google.com"), "mail.google.com")
        self.assertIsNone(dw.clean_domain("x.com/home"))
        self.assertIsNone(dw.clean_domain("a b"))


class TestStats(unittest.TestCase):
    def test_stats_report(self):
        today = dt.date(2026, 10, 15)  # Thursday
        def rec(day, m, goal, who="phillip"):
            return {"who": who, "start": "%sT10:00:00-07:00" % day, "minutes": m, "goal": goal}
        recs = [rec("2026-10-15", 90, "pilot doc"), rec("2026-10-15", 30, "grader"),
                rec("2026-10-13", 60, "pilot doc"), rec("2026-10-11", 600, "old week"),
                rec("2026-10-15", 120, "david thing", who="david"),
                dict(rec("2026-10-15", 45, "old baseline"), kind="baseline")]
        out = dw.stats_report(recs, "phillip", today)
        self.assertIn("today:     2.0", out)
        self.assertIn("this week: 3.0", out)
        self.assertIn("2.5 h  pilot doc", out)
        self.assertNotIn("old week", out)
        self.assertNotIn("old baseline", out)
        self.assertIn("this week: 5.0", dw.stats_report(recs, None, today))


class TestStore(Base):
    def test_local_only_by_default(self):
        self.assertIsNone(dw.Cfg(True).database_url)
        self.run_cli("10", "-y", "-g", "local")
        r = self.run_cli("off", "-y")
        self.assertNotIn("database", r.stdout.lower())
        self.assertIn("No database set", self.run_cli("sync").stderr)

    def test_unreachable_database_keeps_local_log(self):
        self.env["DEEPWORK_DATABASE_URL"] = "postgresql://nobody@127.0.0.1:1/none?connect_timeout=2"
        self.run_cli("10", "-y", "-g", "offline")
        r = self.run_cli("off", "-y")
        self.assertIn("saved locally", r.stdout)
        self.assertEqual(dw.read_jsonl(self.env["DEEPWORK_LOG"])[0]["goal"], "offline")
        r = self.run_cli("stats")
        self.assertIn("showing the local log", r.stderr)
        self.assertIn("offline", r.stdout)

    @unittest.skipUnless(shutil.which("initdb") and shutil.which("pg_ctl") and shutil.which("psql"), "no local Postgres")
    def test_postgres_mirror(self):
        data, sock = self.path("pg"), tempfile.mkdtemp(prefix="dwpg")
        subprocess.run(["initdb", "-D", data, "-U", "dw", "--auth=trust"], check=True, capture_output=True)
        port = str(55000 + os.getpid() % 1000)
        # Postgres inherits pg_ctl's output, so capturing it would wait forever: log to a file instead.
        subprocess.run(["pg_ctl", "-D", data, "-w", "-l", self.path("pg.log"), "-o",
                        "-p %s -k %s -c listen_addresses=''" % (port, sock), "start"],
                       check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        self.addCleanup(subprocess.run, ["pg_ctl", "-D", data, "-m", "immediate", "stop"], capture_output=True)
        self.env["DEEPWORK_DATABASE_URL"] = "postgresql://dw@/postgres?host=%s&port=%s" % (sock, port)
        # A session logged before the database was set gets pushed on the first sync.
        earlier = (dt.datetime.now() - dt.timedelta(minutes=1)).astimezone().isoformat(timespec="seconds")
        with open(self.env["DEEPWORK_LOG"], "w") as f:
            f.write(json.dumps({"who": "tester", "start": earlier, "minutes": 30, "goal": "it's $dw$ quoted"}) + "\n")
        self.run_cli("10", "-y", "-g", "mirrored")
        r = self.run_cli("off", "-y")
        self.assertIn("Synced 2 session(s)", r.stdout)
        self.assertIn("Synced 2 session(s)", self.run_cli("sync").stdout)  # idempotent
        os.remove(self.env["DEEPWORK_LOG"])  # stats now come from the database alone
        out = self.run_cli("stats").stdout
        self.assertIn("mirrored", out)
        self.assertIn("it's $dw$ quoted", out)
        count = subprocess.run(["psql", self.env["DEEPWORK_DATABASE_URL"], "-Atc", "select count(*) from deepwork_sessions"],
                               capture_output=True, text=True).stdout.strip()
        self.assertEqual(count, "2")


def m_all_frames(ext):
    m = json.load(open(os.path.join(ext, "manifest.json")))
    return any(cs.get("all_frames") and "overlay.js" in cs["js"] for cs in m["content_scripts"])


class TestExtension(unittest.TestCase):
    EXT = os.path.join(ROOT, "chrome-ext")

    def test_manifest_and_rules(self):
        m = json.load(open(os.path.join(self.EXT, "manifest.json")))
        self.assertEqual(m["manifest_version"], 3)
        for f in [m["background"]["service_worker"]] + [j for cs in m["content_scripts"] for j in cs["js"]] + \
                 [r["path"] for r in m["declarative_net_request"]["rule_resources"]] + \
                 m["web_accessible_resources"][0]["resources"]:
            self.assertTrue(os.path.exists(os.path.join(self.EXT, f)), f)
        rs = m["declarative_net_request"]["rule_resources"][0]
        self.assertFalse(rs["enabled"])  # off unless a session is running
        rules = json.load(open(os.path.join(self.EXT, rs["path"])))
        ids = [r["id"] for r in rules]
        self.assertEqual(len(ids), len(set(ids)))
        doms = rules[0]["condition"]["requestDomains"]
        for d in ("amazon.com", "doordash.com", "mail.google.com", "app.shortwave.com", "calendar.google.com",
                  "youtube.com", "youtu.be", "superhuman.com"):
            self.assertIn(d, doms)
        self.assertEqual(rules[0]["action"]["redirect"]["extensionPath"], "/blocked.html")
        self.assertNotIn("m.youtube.com", doms)  # requestDomains already covers subdomains
        cover = m["content_scripts"][1]["matches"]
        self.assertIn("https://*.youtube.com/*", cover)
        self.assertIn("https://*.superhuman.com/*", cover)  # mail.superhuman.com  # m.youtube.com and www, for already-open tabs
        self.assertIn("declarativeNetRequestFeedback", m["permissions"])
        bg = open(os.path.join(self.EXT, "background.js")).read()
        self.assertNotIn("tab.title", bg)  # privacy: domains only
        self.assertIn("http://127.0.0.1:47615/*", m["host_permissions"])
        self.assertIn("47615", open(os.path.join(self.EXT, "background.js")).read())

    def test_js_syntax_and_feed_rules(self):
        for f in os.listdir(self.EXT):
            if f.endswith(".js"):
                r = subprocess.run(["node", "--check", os.path.join(self.EXT, f)], capture_output=True, text=True)
                self.assertEqual(r.returncode, 0, f + r.stderr)
        for t in ("test_feeds.js", "test_media.js", "test_cover.js"):
            r = subprocess.run(["node", os.path.join(ROOT, "tests", t)], capture_output=True, text=True)
            self.assertEqual(r.returncode, 0, t + r.stdout + r.stderr)
        self.assertTrue(m_all_frames(self.EXT))


if __name__ == "__main__":
    unittest.main()

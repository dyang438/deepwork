"""Unit-style checks for deepwork v2. Every run is --dry-run with isolated temp state: no apps quit, no DND."""
import datetime as dt
import importlib.machinery
import importlib.util
import json
import os
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
        r = self.run_cli("60", stdin="Write pilot scope doc\n12:30\ny\ny\nn\nnotion.so, arxiv.org\n")
        self.assertEqual(r.returncode, 0, r.stderr)
        s = json.load(open(self.path("state", "session.json")))
        self.assertEqual(s["goal"], "Write pilot scope doc")
        self.assertEqual(s["deadline"], "12:30")
        self.assertEqual(s["checklist"], {"water or coffee": True, "phone in another room": True, "materials open": False})
        self.assertNotIn("food", s["checklist"])  # food only asked when over 90 min
        self.assertEqual(s["goal_domains"], ["notion.so", "arxiv.org"])
        active = json.load(open(self.path("state", "active.json")))
        self.assertEqual(active["goal"], "Write pilot scope doc")
        acts = open(self.path("state", "actions.log")).read()
        for a in ("quit Slack", "quit Shortwave", "quit Messages", "quit Mail", "shortcut deepwork-on"):
            self.assertIn(a, acts)
        self.assertNotIn("Chrome", acts)
        time.sleep(1.0)
        st = json.load(urllib.request.urlopen("http://127.0.0.1:%s/state" % self.env["DEEPWORK_PORT"], timeout=2))
        self.assertTrue(st["active"])
        self.assertIn("running", self.run_cli("status").stdout)
        self.assertIn("already running", self.run_cli("30", "-y").stderr)

        r = self.run_cli("off", stdin="partial\nDrafted sections 1-2\nemail Raoul\nfix grader\n\nPilot doc 9-11am\n3\n")
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertIn("Shutdown complete.", r.stdout)
        self.assertFalse(os.path.exists(self.path("state", "active.json")))
        self.assertFalse(os.path.exists(self.path("state", "session.json")))
        rec = json.loads(open(self.env["DEEPWORK_LOG"]).read().strip())
        self.assertEqual((rec["who"], rec["outcome"], rec["goal"], rec["ended_by"]),
                         ("tester", "partial", "Write pilot scope doc", "off"))
        self.assertEqual(rec["tomorrow"], "Pilot doc 9-11am")
        self.assertEqual(rec["tasks"]["used"], {"n": 3, "source": "self"})
        cap = open(self.env["DEEPWORK_CAPTURE"]).read()
        self.assertIn("(open loop) email Raoul", cap)
        self.assertIn("(open loop) fix grader", cap)
        acts = open(self.path("state", "actions.log")).read()
        self.assertIn("shortcut deepwork-off", acts)
        self.assertIn("open Slack", acts)
        time.sleep(0.5)
        self.assertFalse(dw.watchdog_alive(s))
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
        self.assertFalse(os.path.exists(self.path("state", "active.json")))
        self.assertTrue(os.path.exists(self.path("state", "pending.json")))
        acts = open(self.path("state", "actions.log")).read()
        self.assertIn("notify", acts)
        self.assertIn("terminal", acts)
        cmd = self.path("state", "shutdown.command")
        self.assertTrue(os.access(cmd, os.X_OK))
        body = open(cmd).read()
        self.assertTrue(body.startswith("#!/bin/zsh"))
        self.assertIn("deepwork' off --dry-run", body)
        self.assertNotIn("osascript", open(CLI).read().split("def shortcut_names")[0].split('kind == "terminal"')[1].split("elif")[0])
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
        self.assertTrue(dw.watchdog_alive(s))
        os.kill(s["watchdog_pid"], 9)
        time.sleep(0.3)
        out = self.run_cli("status").stdout
        self.assertIn("Restarted the watchdog", out)
        s2 = json.load(open(self.path("state", "session.json")))
        self.assertTrue(dw.watchdog_alive(s2))
        self.run_cli("off", "-y")

    def test_capture(self):
        r = self.run_cli("capture", "look", "into", "Voyager", "limits")
        self.assertIn("Captured", r.stdout)
        self.assertRegex(open(self.env["DEEPWORK_CAPTURE"]).read(), r"\(capture\) look into Voyager limits")

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
        self.assertEqual(len(dw.load_log(self.env["DEEPWORK_LOG"])), 1)  # logged exactly once
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
        evs = dw.load_log(s["samples_path"])
        self.assertTrue(s["samples_path"].startswith(self.path("sessions")))
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

    def test_baseline_samples_without_blocking(self):
        r = self.run_cli("baseline", "0.05")
        self.assertIn("Nothing is blocked", r.stdout)
        time.sleep(0.8)
        st = json.load(urllib.request.urlopen("http://127.0.0.1:%s/state" % self.env["DEEPWORK_PORT"], timeout=2))
        self.assertEqual((st["active"], st["sampling"]), (False, True))
        self.assertFalse(os.path.exists(self.path("state", "active.json")))  # no agent hold
        time.sleep(4.5)
        acts = open(self.path("state", "actions.log")).read()
        self.assertNotIn("quit", acts)
        self.assertNotIn("shortcut", acts)
        rec = json.loads(open(self.env["DEEPWORK_LOG"]).read().strip())
        self.assertEqual((rec["kind"], rec["ended_by"]), ("baseline", "timer"))
        self.assertGreater(rec["activity"]["samples"], 0)
        out = self.run_cli("stats").stdout
        self.assertIn("Week, baseline", out)
        self.assertIn("Deep hours today:     0.0", out)  # baseline is not deep time


class TestExperimental(Base):
    def test_break_starts_after_delay_unblocks_then_resumes(self):
        self.run_cli("1", "-y", "-g", "breaks")
        time.sleep(0.8)
        t0 = time.time()
        r = self.run_cli("break", "0.05")  # 3 s break, test delay 2 s (real minimum is 5 min)
        self.assertIn("Break planned", r.stdout)
        self.assertIn("already planned", self.run_cli("break").stderr)
        b = json.load(open(self.path("state", "session.json")))["breaks"][0]
        self.assertGreaterEqual(b["start"] - b["requested"], 2)
        self.assertAlmostEqual(b["end"] - b["start"], 3, delta=0.1)
        url = "http://127.0.0.1:%s/state" % self.env["DEEPWORK_PORT"]
        self.assertTrue(json.load(urllib.request.urlopen(url))["active"])  # still blocked before the break
        time.sleep(max(0, b["start"] - time.time()) + 0.3)
        st = json.load(urllib.request.urlopen(url))
        self.assertEqual((st["active"], st["on_break"], st["sampling"]), (False, True, True))
        time.sleep(1.0)
        n_quits_in_break = open(self.path("state", "actions.log")).read().count("quit")
        time.sleep(1.0)
        self.assertEqual(open(self.path("state", "actions.log")).read().count("quit"), n_quits_in_break)  # no re-quits
        time.sleep(max(0, b["end"] - time.time()) + 3.5)
        self.assertTrue(json.load(urllib.request.urlopen(url))["active"])  # blocking back
        acts = open(self.path("state", "actions.log")).read()
        self.assertIn("Planned break until", acts)
        self.assertIn("Break over", acts)
        self.assertGreater(acts.count("quit"), n_quits_in_break)
        self.run_cli("off", "-y")
        rec = json.loads(open(self.env["DEEPWORK_LOG"]).read().strip())
        self.assertEqual(len(rec["breaks"]), 1)
        self.assertLessEqual(rec["breaks"][0]["minutes"], 0.1)  # 3 s, rounded to 0.1 min
        self.assertIn("planned breaks vs", self.run_cli("stats").stdout)

    def test_break_never_instant_in_real_mode(self):
        cfg = dw.Cfg(False)
        self.assertGreaterEqual(cfg.break_delay, 300)

    def test_break_refused_when_session_ends_first(self):
        self.env["DEEPWORK_BREAK_DELAY"] = "120"
        self.run_cli("1", "-y")
        self.assertIn("before a break could start", self.run_cli("break").stderr)
        self.run_cli("off", "-y")

    def test_halfway_walk_only_over_90(self):
        self.run_cli("91", "-y")
        s = json.load(open(self.path("state", "session.json")))
        s["start"] -= 46 * 60
        s["end"] -= 46 * 60
        dw.write_json(self.path("state", "session.json"), s)
        self.run_cli("status")  # nothing restarts; the live watchdog read start from the first session file
        dw.os.kill(s["watchdog_pid"], 9)
        self.run_cli("status")  # respawn picks up the shifted halfway point
        time.sleep(1.5)
        self.assertIn("Halfway. Take a short walk", open(self.path("state", "actions.log")).read())
        self.run_cli("off", "-y")

    def test_git_commits_counted(self):
        repo = os.path.join(self.env["DEEPWORK_GIT_ROOT"], "proj")
        subprocess.run(["git", "init", "-q", repo], check=True)
        self.run_cli("10", "-y", "-g", "ship it")
        genv = dict(self.env, GIT_AUTHOR_NAME="Tester", GIT_AUTHOR_EMAIL="t@x", GIT_COMMITTER_NAME="T",
                    GIT_COMMITTER_EMAIL="t@x")
        for i in range(2):
            subprocess.run(["git", "-C", repo, "commit", "-q", "--allow-empty", "-m", "c%d" % i], env=genv, check=True)
        subprocess.run(["git", "-C", repo, "commit", "-q", "--allow-empty", "-m",
                        "agent\n\nCo-Authored-By: Claude Opus <noreply@anthropic.com>"], env=genv, check=True)
        genv["GIT_AUTHOR_NAME"] = "David"
        subprocess.run(["git", "-C", repo, "commit", "-q", "--allow-empty", "-m", "d"], env=genv, check=True)
        time.sleep(1.1)
        self.run_cli("off", "-y")
        rec = json.loads(open(self.env["DEEPWORK_LOG"]).read().strip())
        self.assertEqual(rec["tasks"]["git_commits"], 2)
        self.assertIsNone(rec["tasks"]["used"])  # commits never count
        self.assertIn("commits (mostly agents) 2", self.run_cli("stats").stdout)

    def test_daily_cap_warning(self):
        today = dt.date(2026, 10, 15)
        recs = [{"who": "p", "start": "2026-10-15T09:00:00", "minutes": 180},
                {"who": "p", "start": "2026-10-15T07:00:00", "minutes": 30, "kind": "baseline"},
                {"who": "d", "start": "2026-10-15T09:00:00", "minutes": 300}]
        self.assertIsNone(dw.daily_cap_warning(recs, "p", 60, today))
        w = dw.daily_cap_warning(recs, "p", 90, today)
        self.assertIn("270", w)
        self.assertIn("two blocks: 60 min now", w)
        r = self.run_cli("250", "-y")
        self.assertIn("past the 240 min cap", r.stdout)
        self.run_cli("off", "-y")


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

    def test_on_goal_and_breaks(self):
        goal = ({"cursor", "terminal"}, ["github.com", "*.example.com", "notion.so"])
        evs = [{"type": "sample", "t": i, "every": 10, "active": True, "app": app, "domain": dom}
               for i, (app, dom) in enumerate([("Cursor", None), ("Google Chrome", "github.com"),
                                               ("Google Chrome", "docs.example.com"), ("Google Chrome", "example.com"),
                                               ("Google Chrome", "x.com"), ("Slack", None), ("Google Chrome", "notion.so"),
                                               ("Terminal", None)])]
        a = dw.summarize(evs, goal=goal)
        self.assertEqual(a["on_goal_ratio"], round(5 / 8, 2))  # bare example.com is not in this list
        a = dw.summarize(evs, goal=goal, breaks=[[4, 6]])  # samples at t=4,5 fall in a break
        self.assertEqual(a["samples"], 6)
        self.assertEqual(a["on_goal_ratio"], round(5 / 6, 2))

    def test_tasks_used_sources(self):
        self.assertEqual(dw.tasks_used({"self": 2, "git_commits": 9}), {"n": 2, "source": "self"})
        self.assertIsNone(dw.tasks_used({"self": None, "git_commits": 9}))
        self.assertIn("tasks n/a", dw.experimental_line({"start": "2026-10-15T10:00", "minutes": 60,
                                                         "tasks": {"used": None, "git_commits": 9}}))

    def test_experimental_week(self):
        def r(m, outcome, used, hits=0, breaks=0):
            return {"start": "2026-10-15T10:00:00", "minutes": m, "outcome": outcome,
                    "tasks": {"used": used}, "breaks": [{"minutes": 10}] * breaks,
                    "activity": {"on_goal_ratio": 0.5, "blocked_attempts": {"x.com": hits}}}
        out = "\n".join(dw.experimental_week([r(60, "done", {"n": 3, "source": "self"}, 4, 1),
                                               r(60, "partial", {"n": 1, "source": "self"}),
                                               r(60, "not done", None)]))
        self.assertIn("tasks per deep hour 2.0 (4 tasks over 2.0 h)", out)
        self.assertIn("time on goal 50%", out)
        self.assertIn("1 of 3 done, 1 partial", out)
        self.assertIn("1 planned breaks vs 4 blocked-site pulls", out)

    def test_clean_domain(self):
        self.assertEqual(dw.clean_domain("Mail.Google.com"), "mail.google.com")
        self.assertIsNone(dw.clean_domain("x.com/home"))
        self.assertIsNone(dw.clean_domain("a b"))


class TestScore(unittest.TestCase):
    def test_score_report(self):
        today = dt.date(2026, 10, 15)  # Thursday
        def rec(day, m, goal, who="phillip"):
            return {"who": who, "start": "%sT10:00:00-07:00" % day, "minutes": m, "goal": goal}
        recs = [rec("2026-10-15", 90, "pilot doc"), rec("2026-10-15", 30, "grader"),
                rec("2026-10-13", 60, "pilot doc"), rec("2026-10-11", 600, "old week"),
                rec("2026-10-15", 120, "david thing", who="david")]
        out = dw.score_report(recs, "phillip", today)
        self.assertIn("today:     2.0", out)
        self.assertIn("this week: 3.0", out)
        self.assertIn("2.5 h  pilot doc", out)
        self.assertNotIn("old week", out)
        self.assertIn("this week: 5.0", dw.score_report(recs, None, today))


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

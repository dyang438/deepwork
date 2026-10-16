function show(s) {
  if (!s || !s.active) {
    document.querySelector("h1").textContent = "Session over";
    document.getElementById("goal").textContent = "Go back and reload the page.";
    return;
  }
  const end = new Date(s.end_ts * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  document.getElementById("goal").textContent = "Goal: " + (s.goal || "") + ". Ends at " + end + ".";
}
chrome.runtime.sendMessage({ type: "deepwork-refresh" }).then(show).catch(() => {});
setInterval(() => chrome.runtime.sendMessage({ type: "deepwork-refresh" }).then(show).catch(() => {}), 30000);

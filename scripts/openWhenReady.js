const { exec } = require("child_process");

const URL = "http://localhost:5174/";
const POLL_MS = 800;
const TIMEOUT_MS = 30000;

async function waitForReady() {
  const deadline = Date.now() + TIMEOUT_MS;

  while (Date.now() < deadline) {
    try {
      const res = await fetch(URL);
      if (res.ok) return true;
    } catch {}
    await sleep(POLL_MS);
  }
  return false;
}

function openBrowser(url) {
  const cmd =
    process.platform === "darwin"
      ? `open "${url}"`
      : process.platform === "win32"
        ? `start "" "${url}"`
        : `xdg-open "${url}"`;

  exec(cmd, (err) => {
    if (err) console.error(`Failed to open browser: ${err.message}`);
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

(async () => {
  console.log(`Waiting for ${URL} ...`);
  const ok = await waitForReady();
  if (ok) {
    openBrowser(URL);
    console.log(`Opened UI at ${URL}`);
  } else {
    console.error(`Timed out waiting for ${URL}`);
    process.exit(1);
  }
  // Keep alive so concurrently -k doesn't tear down the other processes.
  const keepAlive = setInterval(() => {}, 60000);
  const exit = () => { clearInterval(keepAlive); process.exit(0); };
  process.on("SIGTERM", exit);
  process.on("SIGINT", exit);
})();

const { execSync } = require("child_process");

const PORTS = [5055, 5174, 5175];

for (const port of PORTS) {
  try {
    const pids = execSync(`lsof -ti:${port}`, { encoding: "utf8" })
      .trim()
      .split("\n")
      .filter(Boolean);

    if (pids.length === 0) {
      console.log(`  :${port}  already free`);
      continue;
    }

    for (const pid of pids) {
      try {
        process.kill(Number(pid), "SIGTERM");
      } catch {}
    }

    // Give SIGTERM a moment, then force-kill survivors
    execSync("sleep 0.5");

    for (const pid of pids) {
      try {
        process.kill(Number(pid), 0); // check if still alive
        process.kill(Number(pid), "SIGKILL");
      } catch {}
    }

    console.log(`  :${port}  freed (pids: ${pids.join(", ")})`);
  } catch {
    console.log(`  :${port}  already free`);
  }
}

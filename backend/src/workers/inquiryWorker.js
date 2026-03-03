const { Worker } = require("bullmq");
const { setLatestInquiry } = require("../state/latestInquiry");

const connection = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: Number(process.env.REDIS_PORT || 6379),
  db: Number(process.env.REDIS_DB || 0),
};

const worker = new Worker(
  "resolver-inquiry",
  async (job) => {
    const d = job.data || {};
    const runId = d.runId || "";
    const nodeId = d.nodeId || "";
    const nodeOrigin = d.nodeOrigin || d.node_origin || d.sourceUrl || d.url || "";
    const n = Array.isArray(d.capsules) ? d.capsules.length : 0;
    const summary = {
      runId,
      nodeId,
      nodeOrigin,
      capsuleCount: n,
      updatedAt: new Date().toISOString(),
    };
    console.log(
      `[inquiryWorker] got jobId=${job.id} name=${job.name} runId=${runId} nodeId=${nodeId} capsules=${n}`
    );
    setLatestInquiry(summary);
    return { ok: true, runId, nodeId, capsules: n };
  },
  { connection, prefix: "bull" }
);

worker.on("failed", (job, err) =>
  console.error(`[inquiryWorker] failed jobId=${job?.id}`, err?.message || err)
);
worker.on("completed", (job, result) =>
  console.log(`[inquiryWorker] completed jobId=${job.id}`, result)
);

module.exports = { worker };

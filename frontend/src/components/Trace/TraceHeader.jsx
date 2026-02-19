import { useState } from "react";

export default function TraceHeader({ trace }) {
  const [copied, setCopied] = useState(false);

  if (!trace) {
    return (
      <div className="px-3 py-2 border-b border-neutral-700 text-xs text-neutral-500">
        No trace selected
      </div>
    );
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(trace, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard unavailable */ }
  };

  const resolver = trace.resolver || {};
  const thresholds = trace.thresholds || {};
  const timing = trace.timing || {};
  const steps = trace.routing?.steps || [];

  const routeSummary = steps
    .filter((s) => s.executed)
    .map((s) => s.name)
    .join(" + ") || "resolver-only";

  return (
    <div className="px-3 py-2 border-b border-neutral-700 text-xs space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-neutral-400">
          v{trace.traceVersion || "?"}
        </span>
        <button
          onClick={handleCopy}
          className="text-blue-400 hover:text-blue-300 text-xs"
        >
          {copied ? "Copied" : "Copy Trace"}
        </button>
      </div>
      <div className="flex gap-3 text-neutral-300">
        <span>cov <strong>{resolver.coverage ?? "–"}</strong></span>
        <span>conf <strong>{resolver.confidence ?? "–"}</strong></span>
        <span className={thresholds.passed ? "text-green-400" : "text-amber-400"}>
          {thresholds.passed ? "PASSED" : "BELOW"}
        </span>
      </div>
      <div className="flex gap-3 text-neutral-500">
        <span>{timing.totalMs ?? "–"}ms</span>
        <span>{routeSummary}</span>
        {resolver.mode && <span className="italic">{resolver.mode}</span>}
      </div>
    </div>
  );
}

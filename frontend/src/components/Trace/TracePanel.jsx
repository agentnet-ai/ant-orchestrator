import { useState } from "react";
import TraceHeader from "./TraceHeader";

const TABS = ["Prompt", "Routing", "Provenance", "Raw"];

export default function TracePanel({ trace }) {
  const [tab, setTab] = useState("Routing");

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TraceHeader trace={trace} />

      {/* Tabs */}
      <div className="flex border-b border-neutral-700 text-xs">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={[
              "flex-1 py-1.5 text-center transition-colors",
              tab === t
                ? "text-blue-400 border-b-2 border-blue-400"
                : "text-neutral-500 hover:text-neutral-300",
            ].join(" ")}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-3 py-2 text-xs">
        {!trace ? (
          <p className="text-neutral-600 mt-4 text-center">
            Select an assistant message
          </p>
        ) : tab === "Prompt" ? (
          <PromptTab trace={trace} />
        ) : tab === "Routing" ? (
          <RoutingTab trace={trace} />
        ) : tab === "Provenance" ? (
          <ProvenanceTab trace={trace} />
        ) : (
          <RawTab trace={trace} />
        )}
      </div>
    </div>
  );
}

function PromptTab({ trace }) {
  const blocks = trace.promptBlocks || [];
  return (
    <div className="space-y-2">
      {blocks.map((b, i) => (
        <div key={i} className="bg-neutral-800 rounded p-2">
          <div className="text-neutral-400 font-mono mb-1">{b}</div>
        </div>
      ))}
      {blocks.length === 0 && <p className="text-neutral-600">No prompt blocks</p>}
    </div>
  );
}

function RoutingTab({ trace }) {
  const steps = trace.routing?.steps || [];
  const th = trace.thresholds || {};
  const timing = trace.timing || {};

  return (
    <div className="space-y-3">
      <div>
        <h4 className="text-neutral-400 mb-1 font-semibold">Steps</h4>
        {steps.map((s, i) => (
          <div key={i} className="flex gap-2 py-0.5">
            <span className={s.executed ? "text-green-400" : "text-neutral-600"}>
              {s.executed ? "●" : "○"}
            </span>
            <span className="text-neutral-200">{s.name}</span>
            <span className="text-neutral-500 ml-auto">{s.reason}</span>
          </div>
        ))}
      </div>

      <div>
        <h4 className="text-neutral-400 mb-1 font-semibold">Thresholds</h4>
        <p className="text-neutral-300">
          minCov={th.coverageMin ?? "–"} minConf={th.confidenceMin ?? "–"}{" "}
          <span className={th.passed ? "text-green-400" : "text-amber-400"}>
            {th.passed ? "passed" : "failed"}
          </span>
        </p>
        {th.notes && <p className="text-neutral-500 mt-1">{th.notes}</p>}
      </div>

      <div>
        <h4 className="text-neutral-400 mb-1 font-semibold">Timing</h4>
        <p className="text-neutral-300">
          total {timing.totalMs ?? "–"}ms &middot; resolver {timing.resolverMs ?? "–"}ms
          &middot; web {timing.webRagMs ?? 0}ms &middot; llm {timing.llmMs ?? 0}ms
        </p>
      </div>
    </div>
  );
}

function ProvenanceTab({ trace }) {
  const sources = trace.provenance?.sources || [];
  return (
    <div className="space-y-1">
      {sources.map((s, i) => (
        <div key={i} className="bg-neutral-800 rounded px-2 py-1">
          <span className="text-neutral-400">{s.type}</span>{" "}
          <span className="text-neutral-200">{s.id || s.url || s.source}</span>
        </div>
      ))}
      {sources.length === 0 && <p className="text-neutral-600">No provenance data</p>}
    </div>
  );
}

function RawTab({ trace }) {
  const [copied, setCopied] = useState(false);
  const json = JSON.stringify(trace, null, 2);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <div>
      <div className="flex justify-end mb-1">
        <button
          onClick={handleCopy}
          className="text-blue-400 hover:text-blue-300 text-xs"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="bg-neutral-800 rounded p-2 text-neutral-300 overflow-x-auto whitespace-pre-wrap break-words text-[11px] leading-relaxed">
        {json}
      </pre>
    </div>
  );
}

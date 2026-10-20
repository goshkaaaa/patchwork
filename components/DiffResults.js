"use client";
import { useState } from "react";

function Value({ value, present }) {
  if (!present) return <span className="missing">not present</span>;
  return <code>{JSON.stringify(value)}</code>;
}

export default function DiffResults({
  result,
  pending,
  error,
  stale,
  onDownload,
  onCopy,
}) {
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [view, setView] = useState("changes");
  const changes = result?.changes || [];
  const visible = changes.filter(
    (change) =>
      (filter === "all" || change.op === filter) &&
      change.path.toLowerCase().includes(query.toLowerCase()),
  );
  const disabled = !result || stale || pending || Boolean(error);
  return (
    <section className="results" aria-labelledby="results-heading">
      <div className="results-heading">
        <div>
          <span className="section-index">02</span>
          <h2 id="results-heading">The difference.</h2>
          {result && !stale ? (
            <span className="change-count">
              {changes.length} {changes.length === 1 ? "change" : "changes"}
            </span>
          ) : null}
        </div>
        <div className="export-actions">
          <button disabled={disabled} onClick={onCopy}>
            Copy patch
          </button>
          <button
            className="outline-button"
            disabled={disabled}
            onClick={onDownload}
          >
            Export .json ↓
          </button>
        </div>
      </div>
      {pending ? (
        <div className="result-state" role="status">
          <span className="working-mark">↻</span>Comparing in a background
          worker…
        </div>
      ) : error ? (
        <div className="error-box" role="alert" aria-label="Comparison error">
          <strong>Couldn&apos;t compare these documents.</strong>
          <p>{error}</p>
        </div>
      ) : stale ? (
        <div className="result-state">
          Your inputs changed. Run Compare to refresh the results.
        </div>
      ) : !result ? (
        <div className="result-state">
          Add two JSON documents and run Compare.
        </div>
      ) : (
        <>
          <div className="result-toolbar">
            <div className="filters" role="group" aria-label="Filter changes">
              {[
                ["all", "All changes"],
                ["add", "Added"],
                ["remove", "Removed"],
                ["replace", "Changed"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  aria-pressed={filter === key}
                  onClick={() => setFilter(key)}
                >
                  {label}
                  <span>
                    {key === "all"
                      ? changes.length
                      : changes.filter((change) => change.op === key).length}
                  </span>
                </button>
              ))}
            </div>
            <label className="search">
              <span className="sr-only">Search JSON paths</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Find a path…"
              />
            </label>
            <div className="view-switch" role="group" aria-label="Result view">
              <button
                aria-pressed={view === "changes"}
                onClick={() => setView("changes")}
              >
                Review
              </button>
              <button
                aria-pressed={view === "patch"}
                onClick={() => setView("patch")}
              >
                Patch
              </button>
            </div>
          </div>
          {view === "patch" ? (
            <pre
              className="patch-code"
              tabIndex={0}
              aria-label="JSON Patch output"
            >
              {JSON.stringify(result.patch, null, 2)}
            </pre>
          ) : changes.length === 0 ? (
            <div className="result-state equal-state">
              <span>✓</span>
              <h3>Same data. Different formatting? No problem.</h3>
              <p>
                Object key order and whitespace don&apos;t count as changes.
              </p>
            </div>
          ) : visible.length === 0 ? (
            <div className="result-state">No changes match this filter.</div>
          ) : (
            <div className="change-list">
              {visible.map((change) => (
                <article
                  key={change.path}
                  className={`change-row ${change.op}`}
                >
                  <div className="change-path">
                    <span className="operation">
                      {change.op === "add"
                        ? "+"
                        : change.op === "remove"
                          ? "−"
                          : "~"}
                    </span>
                    <code>{change.path || "(document root)"}</code>
                    <span className="operation-name">{change.op}</span>
                  </div>
                  <div className="change-values">
                    <div className="old-value">
                      <span>BEFORE</span>
                      <Value
                        value={change.before}
                        present={change.op !== "add"}
                      />
                    </div>
                    <span className="value-arrow" aria-hidden="true">
                      →
                    </span>
                    <div className="new-value">
                      <span>AFTER</span>
                      <Value
                        value={change.after}
                        present={change.op !== "remove"}
                      />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}
      <div className="results-footnote">
        <span>Array items are compared by position.</span>
        <span>JSON Pointer paths · RFC 6902 patch format</span>
      </div>
    </section>
  );
}

"use client";
import { useEffect, useRef, useState } from "react";
import JsonEditor from "../components/JsonEditor";
import DiffResults from "../components/DiffResults";
import { sampleBefore, sampleAfter } from "../lib/samples";
import { download } from "../lib/download";

export default function Home() {
  const [before, setBefore] = useState(sampleBefore);
  const [after, setAfter] = useState(sampleAfter);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(true);
  const [stale, setStale] = useState(false);
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);
  const worker = useRef(null);
  const revision = useRef(0);

  useEffect(() => {
    const instance = new Worker(
      `${process.env.NEXT_PUBLIC_BASE_PATH}/diff.worker.js`,
      { type: "module" },
    );
    worker.current = instance;
    instance.onmessage = (event) => {
      if (event.data.id !== revision.current) return;
      setPending(false);
      setError(event.data.error || "");
      setResult(event.data.result || null);
      setStale(false);
    };
    instance.onerror = () => {
      setPending(false);
      setError(
        "The comparison worker could not start. Reload the page and try again.",
      );
    };
    setReady(true);
    instance.postMessage({
      id: revision.current,
      before: sampleBefore,
      after: sampleAfter,
    });
    return () => {
      instance.terminate();
      worker.current = null;
    };
  }, []);

  function edit(side, value) {
    revision.current++;
    if (side === "before") setBefore(value);
    else setAfter(value);
    setStale(true);
    setPending(false);
    setError("");
  }
  function compare(left = before, right = after) {
    if (!worker.current) return;
    const id = ++revision.current;
    setPending(true);
    setError("");
    setMessage("");
    worker.current.postMessage({ id, before: left, after: right });
  }
  async function copyPatch() {
    try {
      await navigator.clipboard.writeText(
        JSON.stringify(result.patch, null, 2),
      );
      setMessage("JSON Patch copied.");
    } catch {
      setMessage(
        "Clipboard access is unavailable. Use Export .json to download the patch.",
      );
    }
  }

  return (
    <>
      <header className="topbar">
        <a className="brand" href="#main">
          <span className="patch-mark" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </span>
          patchwork<span className="brand-subtitle">JSON, UNDER REVIEW.</span>
        </a>
        <a
          className="source-link"
          href="https://github.com/goshkaaaa/patchwork"
        >
          Source code ↗
        </a>
      </header>
      <main id="main">
        <section className="intro">
          <div className="intro-heading">
            <p className="kicker">
              <span />
              JSON COMPARISON WORKBENCH
            </p>
            <h1>
              See what
              <br />
              <span>changed.</span>
            </h1>
          </div>
          <div className="intro-aside">
            <div className="mini-diff" aria-hidden="true">
              <span className="diff-minus">− retries: 3</span>
              <span className="diff-plus">+ retries: 5</span>
            </div>
            <p>
              Two API responses. One mystery.
              <br />
              Find the fields that actually changed.
            </p>
            <span className="privacy-note">
              ◈ Processed in your browser. Never uploaded.
            </span>
          </div>
        </section>
        <section className="input-section" aria-label="JSON documents">
          <div className="input-heading">
            <div>
              <span className="section-index">01</span>
              <h2>Bring both sides.</h2>
            </div>
            <button
              className="sample-button"
              onClick={() => {
                setBefore(sampleBefore);
                setAfter(sampleAfter);
                compare(sampleBefore, sampleAfter);
              }}
            >
              Load example ↗
            </button>
          </div>
          <div className="editors">
            <JsonEditor
              side="Before"
              value={before}
              onChange={(value) => edit("before", value)}
              onMessage={setMessage}
            />
            <div className="editor-bridge" aria-hidden="true">
              →
            </div>
            <JsonEditor
              side="After"
              value={after}
              onChange={(value) => edit("after", value)}
              onMessage={setMessage}
            />
          </div>
          <div className="compare-bar">
            <div>
              <button
                onClick={() => {
                  setBefore(after);
                  setAfter(before);
                  revision.current++;
                  setStale(true);
                  setPending(false);
                  setError("");
                }}
              >
                ⇄ Swap sides
              </button>
              <span>Whitespace is noise. Structure is the signal.</span>
            </div>
            <button
              className="primary-button"
              disabled={!ready || pending}
              onClick={() => compare()}
            >
              {pending ? "Comparing…" : "Compare JSON"} <span>↗</span>
            </button>
          </div>
        </section>
        <DiffResults
          result={result}
          pending={pending}
          error={error}
          stale={stale}
          onDownload={() => download("patchwork.patch.json", result.patch)}
          onCopy={copyPatch}
        />
        <p className="notice" role="status">
          {message}
        </p>
        <section className="how-it-works">
          <div>
            <span>01 / STRUCTURE FIRST</span>
            <h3>Skip the formatting noise.</h3>
            <p>
              Key order and indentation don&apos;t matter. A string and a number
              still count as different.
            </p>
          </div>
          <div>
            <span>02 / A PATCH YOU CAN USE</span>
            <h3>Take the changes with you.</h3>
            <p>
              Export add, remove, and replace operations in the standard JSON
              Patch format.
            </p>
          </div>
          <div>
            <span>03 / STAYS IN THIS TAB</span>
            <h3>No paste-and-pray uploads.</h3>
            <p>
              Comparison runs in a Web Worker. Your documents aren&apos;t stored
              between visits.
            </p>
          </div>
        </section>
      </main>
      <footer>
        <span className="brand">patchwork.</span>
        <span>SMALL CHANGES. THE WHOLE PICTURE.</span>
        <a href="https://www.rfc-editor.org/rfc/rfc6902">
          JSON Patch specification ↗
        </a>
      </footer>
    </>
  );
}

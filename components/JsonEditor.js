"use client";
import { useRef, useState } from "react";

export default function JsonEditor({ side, value, onChange, onMessage }) {
  const input = useRef(null);
  const [position, setPosition] = useState({
    start: 0,
    remainder: 0,
    height: 21.6,
  });
  const lineCount = value.split("\n").length;
  function scroll(event) {
    const height = parseFloat(getComputedStyle(event.currentTarget).lineHeight);
    const top = event.currentTarget.scrollTop;
    setPosition({
      start: Math.floor(top / height),
      remainder: top % height,
      height,
    });
  }
  async function importFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      if (file.size > 300000)
        throw new Error("Use a JSON file smaller than 300 KB.");
      const source = await file.text();
      onChange(source);
      onMessage(
        `${side} loaded from ${file.name}. Compare to inspect changes.`,
      );
    } catch (error) {
      onMessage(error.message);
    }
    event.target.value = "";
  }
  function format() {
    try {
      onChange(JSON.stringify(JSON.parse(value), null, 2));
      onMessage(`${side} formatted.`);
    } catch {
      onMessage(`${side} is not valid JSON. Fix its syntax before formatting.`);
    }
  }
  return (
    <section className="json-editor">
      <div className="editor-heading">
        <h2>
          <span className={`side-dot ${side.toLowerCase()}`} />
          {side}
          <span className="file-kind">.json</span>
        </h2>
        <div>
          <button
            onClick={() => input.current.click()}
            aria-label={`Import ${side} JSON`}
          >
            Import ↑
          </button>
          <button onClick={format} aria-label={`Format ${side} JSON`}>
            Format
          </button>
        </div>
      </div>
      <input
        ref={input}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={importFile}
        aria-label={`${side} JSON file`}
      />
      <div className="editor-body">
        <div className="line-numbers" aria-hidden="true">
          {
            <div style={{ transform: `translateY(-${position.remainder}px)` }}>
              {Array.from(
                {
                  length: Math.max(0, Math.min(25, lineCount - position.start)),
                },
                (_, index) => (
                  <span
                    style={{ display: "block", height: position.height }}
                    key={index}
                  >
                    {position.start + index + 1}
                  </span>
                ),
              )}
            </div>
          }
        </div>
        <textarea
          aria-label={`${side} JSON`}
          value={value}
          maxLength={300000}
          onChange={(event) => onChange(event.target.value)}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          wrap="off"
          onScroll={scroll}
        />
      </div>
      <div className="editor-footer">
        <span>
          UTF-8 <span>JSON</span>
        </span>
        <span>{value.length.toLocaleString("en")} characters</span>
      </div>
    </section>
  );
}

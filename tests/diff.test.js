import test from "node:test";
import assert from "node:assert/strict";
import {
  compareSources,
  compareDocuments,
  parseDocument,
  toPatch,
} from "../public/diff.js";

function applyPatch(value, patch) {
  let result = structuredClone(value);
  for (const operation of patch) {
    if (operation.path === "") {
      result = structuredClone(operation.value);
      continue;
    }
    const keys = operation.path
      .slice(1)
      .split("/")
      .map((key) => key.replaceAll("~1", "/").replaceAll("~0", "~"));
    const key = keys.pop();
    const parent = keys.reduce((object, part) => object[part], result);
    if (Array.isArray(parent))
      parent.splice(
        Number(key),
        operation.op === "add" ? 0 : 1,
        ...(operation.op === "remove"
          ? []
          : [structuredClone(operation.value)]),
      );
    else if (operation.op === "remove") delete parent[key];
    else
      Object.defineProperty(parent, key, {
        value: structuredClone(operation.value),
        writable: true,
        enumerable: true,
        configurable: true,
      });
  }
  return result;
}

test("ignores whitespace and object key order", () =>
  assert.deepEqual(
    compareSources('{"a":1,"b":2}', '{ "b": 2, "a": 1 }').patch,
    [],
  ));
test("distinguishes null, false, zero, and missing values", () => {
  const { changes } = compareSources(
    '{"a":null,"b":false,"c":0}',
    '{"a":false,"b":0,"d":null}',
  );
  assert.deepEqual(
    changes.map((change) => change.op),
    ["replace", "replace", "remove", "add"],
  );
});
test("escapes slashes and tildes in JSON Pointer paths", () =>
  assert.equal(
    compareDocuments({ "a/b~c": 1 }, { "a/b~c": 2 })[0].path,
    "/a~1b~0c",
  ));
test("array removals run backwards to preserve indices", () => {
  const patch = toPatch(compareDocuments([1, 2, 3, 4], [1]));
  assert.deepEqual(
    patch.map((operation) => operation.path),
    ["/3", "/2", "/1"],
  );
  assert.deepEqual(applyPatch([1, 2, 3, 4], patch), [1]);
});
test("root type changes use the empty JSON Pointer", () =>
  assert.deepEqual(compareSources("{}", "null").patch, [
    { op: "replace", path: "", value: null },
  ]));
test("empty object keys and prototype-like keys are ordinary data", () => {
  const before = JSON.parse('{"":1,"__proto__":{"value":1}}');
  const after = JSON.parse('{"":2,"__proto__":{"value":2},"constructor":3}');
  assert.deepEqual(
    applyPatch(before, toPatch(compareDocuments(before, after))),
    after,
  );
  assert.equal({}.value, undefined);
});
test("invalid, oversized, non-finite, and deeply nested inputs fail clearly", () => {
  assert.throws(() => parseDocument("{oops}"), /Document:/);
  assert.throws(() => parseDocument(" ".repeat(300001)), /limit/);
  assert.throws(() => parseDocument("1e400"), /finite/);
  assert.throws(
    () => parseDocument("[".repeat(82) + "0" + "]".repeat(82)),
    /complex/,
  );
});
test("caps change counts rather than silently exporting an incomplete patch", () =>
  assert.throws(
    () => compareDocuments(Array(2001).fill(0), Array(2001).fill(1)),
    /2,000/,
  ));
test("patches reconstruct the target for 400 deterministic generated document pairs", () => {
  let seed = 73;
  const random = () =>
    (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32;
  function value(depth = 0) {
    const type = Math.floor(random() * (depth < 3 ? 6 : 4));
    if (type === 0) return null;
    if (type === 1) return random() > 0.5;
    if (type === 2) return Math.floor(random() * 20);
    if (type === 3)
      return ["a", "b", "", "~/", "café"][Math.floor(random() * 5)];
    if (type === 4)
      return Array.from({ length: Math.floor(random() * 5) }, () =>
        value(depth + 1),
      );
    return Object.fromEntries(
      Array.from({ length: Math.floor(random() * 5) }, (_, index) => [
        [`key${index}`, `path/${index}`, `~${index}`, ""][
          Math.floor(random() * 4)
        ],
        value(depth + 1),
      ]),
    );
  }
  for (let index = 0; index < 400; index++) {
    const before = value();
    const after = value();
    assert.deepEqual(
      applyPatch(before, toPatch(compareDocuments(before, after))),
      after,
    );
  }
});

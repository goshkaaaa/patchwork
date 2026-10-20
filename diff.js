export const limits = {
  characters: 300000,
  nodes: 20000,
  depth: 80,
  changes: 2000,
};

export function parseDocument(source, label = "Document") {
  if (source.length > limits.characters)
    throw new Error(`${label} exceeds the 300,000 character limit.`);
  let value;
  try {
    value = JSON.parse(source);
  } catch (error) {
    throw new Error(`${label}: ${error.message}`);
  }
  let count = 0;
  const stack = [[value, 0]];
  while (stack.length) {
    const [item, depth] = stack.pop();
    if (++count > limits.nodes || depth > limits.depth)
      throw new Error(
        `${label} is too complex. Use at most 20,000 values and 80 nesting levels.`,
      );
    if (typeof item === "number" && !Number.isFinite(item))
      throw new Error(
        `${label} contains a number outside JavaScript's finite range.`,
      );
    if (item !== null && typeof item === "object")
      for (const child of Object.values(item)) stack.push([child, depth + 1]);
  }
  return value;
}

export function pointerSegment(key) {
  return String(key).replaceAll("~", "~0").replaceAll("/", "~1");
}
const isObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

export function compareDocuments(before, after) {
  const changes = [];
  function push(op, path, oldValue, value) {
    if (changes.length >= limits.changes)
      throw new Error(
        "More than 2,000 changes. Compare a smaller section of the documents.",
      );
    changes.push({
      op,
      path,
      ...(op !== "add" ? { before: oldValue } : {}),
      ...(op !== "remove" ? { after: value } : {}),
    });
  }
  function walk(left, right, path) {
    if (left === right) return;
    if (Array.isArray(left) && Array.isArray(right)) {
      for (let index = 0; index < Math.min(left.length, right.length); index++)
        walk(left[index], right[index], `${path}/${index}`);
      for (let index = left.length - 1; index >= right.length; index--)
        push("remove", `${path}/${index}`, left[index]);
      for (let index = left.length; index < right.length; index++)
        push("add", `${path}/${index}`, undefined, right[index]);
      return;
    }
    if (isObject(left) && isObject(right)) {
      for (const key of Object.keys(left).sort()) {
        const nextPath = `${path}/${pointerSegment(key)}`;
        if (!Object.hasOwn(right, key)) push("remove", nextPath, left[key]);
        else walk(left[key], right[key], nextPath);
      }
      for (const key of Object.keys(right).sort())
        if (!Object.hasOwn(left, key))
          push("add", `${path}/${pointerSegment(key)}`, undefined, right[key]);
      return;
    }
    push("replace", path, left, right);
  }
  walk(before, after, "");
  return changes;
}

export function toPatch(changes) {
  return changes.map((change) => ({
    op: change.op,
    path: change.path,
    ...(change.op !== "remove" ? { value: change.after } : {}),
  }));
}

export function compareSources(before, after) {
  const left = parseDocument(before, "Before");
  const right = parseDocument(after, "After");
  const changes = compareDocuments(left, right);
  return { changes, patch: toPatch(changes) };
}

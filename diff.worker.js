import { compareSources } from "./diff.js";
self.onmessage = (event) => {
  const { id, before, after } = event.data;
  try {
    self.postMessage({ id, result: compareSources(before, after) });
  } catch (error) {
    self.postMessage({ id, error: error.message });
  }
};

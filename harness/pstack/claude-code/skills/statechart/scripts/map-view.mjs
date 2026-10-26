import { isRecord, isTuple } from "./lib.mjs";

export function mapView(value, at = "v") {
  if (isRecord(value))
    return Object.fromEntries(Object.entries(value).map(([k, x]) => [k, mapView(x, `${at}.${k}`)]));
  if (!Array.isArray(value)) return value;
  if (isTuple(value))
    return tupleView(
      value.map((x, i) => mapView(x, `${at}[${i + 1}]`)),
      at,
    );
  return arrayView(value.map((x, i) => mapView(x, `${at}[${i}]`)));
}
const arrayView = (items) =>
  Object.defineProperties(items, {
    flat: { value: (depth = 1) => flatten(items, depth) },
    flatMap: { value: (f, self) => flatten(items.map(f, self), 1) },
  });
const views = new WeakMap();
const itemAt = (k) => (typeof k === "string" && /^[1-9]\d*$/.test(k) ? k - 1 : -1);
const flatten = (xs, depth) =>
  Array.prototype.flatMap.call(xs, (x) =>
    depth >= 1 && Array.isArray(x) ? flatten(views.get(x)?.items ?? x, depth - 1) : [x],
  );
function tupleView(items, at) {
  const view = new Proxy(items, {
    get(_, k) {
      if (k === "0")
        throw new Error(
          `the mapping reads ${at}[0], but a tuple reads from 1, as in TLA+. Read ${at}[1] for its first item.`,
        );
      const i = itemAt(k);
      if (i >= 0) return items[i];
      if (k === "toJSON") return () => items;
      if (k === "flat") return (depth = 1) => flatten(items, depth);
      if (k === "flatMap") return (f, self) => flatten(items.map(f, self), 1);
      const x = Reflect.get(items, k);
      if (typeof x !== "function") return x;
      return x.bind(x === Object.prototype[k] ? view : items);
    },
    set(_, k, x) {
      if (k === "0")
        throw new Error(
          `the mapping writes ${at}[0], but a tuple reads from 1, as in TLA+. Write ${at}[1] for its first item.`,
        );
      const i = itemAt(k);
      if (i < 0) return Reflect.set(items, k, x);
      items[i] = x;
      return true;
    },
    has(_, k) {
      if (k === "0")
        throw new Error(
          `the mapping looks for index 0 in ${at}, with "in" or with an array method such as concat or flat, but a tuple reads from 1, as in TLA+. Use [...${at}] for an array that reads from 0.`,
        );
      const i = itemAt(k);
      return i < 0 ? Reflect.has(items, k) : i in items;
    },
    ownKeys: () =>
      Reflect.ownKeys(items).map((k) =>
        typeof k === "string" && /^(0|[1-9]\d*)$/.test(k) ? String(+k + 1) : k,
      ),
    getOwnPropertyDescriptor(_, k) {
      if (k === "0") return undefined;
      const i = itemAt(k);
      return Reflect.getOwnPropertyDescriptor(items, i < 0 ? k : i);
    },
  });
  views.set(view, { items, at });
  return view;
}
const nativeClone = globalThis.structuredClone;
function cloneView(x, seen) {
  if (x === null || typeof x !== "object") return nativeClone(x);
  if (seen.has(x)) return seen.get(x);
  const view = views.get(x);
  if (!view && !Array.isArray(x) && Object.getPrototypeOf(x) !== Object.prototype)
    return nativeClone(x);
  const out = view || Array.isArray(x) ? [] : {};
  const copy = view ? tupleView(out, view.at) : Array.isArray(x) ? arrayView(out) : out;
  seen.set(x, copy);
  for (const [k, item] of Object.entries(view?.items ?? x)) out[k] = cloneView(item, seen);
  return copy;
}
globalThis.structuredClone = (value, options) => {
  try {
    return nativeClone(value, options);
  } catch (e) {
    if (e?.name !== "DataCloneError") throw e;
    return cloneView(value, new Map());
  }
};

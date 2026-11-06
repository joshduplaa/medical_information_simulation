import { config } from "../config";
import { createDemoApi } from "./demoApi";
import { createHttpApi } from "./httpApi";
import type { MisApi } from "./types";

type Listener = () => void;
const unauthorizedListeners = new Set<Listener>();

/** Subscribe to "the server rejected our token" so the auth context can sign the user out. */
export function onUnauthorized(fn: Listener) {
  unauthorizedListeners.add(fn);
  return () => unauthorizedListeners.delete(fn);
}

const demo = config.demoMode ? createDemoApi() : null;

/** The one API object the whole UI uses. Which implementation it is depends only on VITE_DEMO_MODE. */
export const api: MisApi = demo ?? createHttpApi(config.apiBaseUrl, () => unauthorizedListeners.forEach((fn) => fn()));

/** Demo mode only: restore the original synthetic dataset. */
export const resetDemoData = demo ? () => demo.reset() : undefined;

export * from "./types";
export { ApiError } from "./errors";

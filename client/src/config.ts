/**
 * The single place the client reads deployment configuration.
 *  - VITE_API_BASE_URL: base URL of the ASP.NET Core API, e.g. http://localhost:5029/api
 *  - VITE_DEMO_MODE:    "true" runs the app entirely in the browser with synthetic data (no API).
 */
export const config = {
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:5029/api",
  demoMode: import.meta.env.VITE_DEMO_MODE === "true",
  /** Show the synthetic demo credentials on the sign-in page (local dev and demo builds only). */
  showDemoCredentials: import.meta.env.DEV || import.meta.env.VITE_DEMO_MODE === "true",
};

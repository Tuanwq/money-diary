// Email links are opened in a browser, including when registration starts in the
// Android app. A device-local origin cannot serve as their callback destination.
const DEFAULT_PUBLIC_APP_URL = "https://money-diary-puce.vercel.app";

export function getAuthEmailRedirectUrl(): string {
  const configuredUrl = import.meta.env.VITE_PUBLIC_APP_URL?.trim();
  const appUrl = new URL(configuredUrl || DEFAULT_PUBLIC_APP_URL);
  return new URL("/login", appUrl.origin).toString();
}

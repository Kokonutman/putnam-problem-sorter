export const AUTH_COOKIE_NAME = "putnam_atlas_auth";

export function getConfiguredPassword() {
  return process.env.PUTNAM_DASHBOARD_PASSWORD?.trim() ?? "";
}

export async function hashValue(value: string) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function getExpectedAuthToken() {
  const password = getConfiguredPassword();
  if (!password) return null;
  return hashValue(password);
}

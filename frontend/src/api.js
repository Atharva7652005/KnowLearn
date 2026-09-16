export const API_URL = import.meta.env.VITE_EXPRESS_API_URL || "http://localhost:3000/api";

function userSafeMessage(message) {
  const detail = String(message || "");
  if (/resource_exhausted|quota|rate.?limit|gemini|generativelanguage/i.test(detail)) {
    return "The AI learning service is temporarily busy. Please wait a minute and try again.";
  }
  return detail || "Something went wrong. Please try again.";
}

export async function api(path, { token, method = "GET", body } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body && !(body instanceof FormData)) headers["Content-Type"] = "application/json";
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(userSafeMessage(data.message || data.detail || data.error));
  return data;
}

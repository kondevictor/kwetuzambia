import AsyncStorage from "@react-native-async-storage/async-storage";

// Point this at your running Next.js API. On an Android emulator, localhost on
// the host machine is 10.0.2.2; on a physical device use your machine's LAN IP.
// Configure via app.json "extra.apiBaseUrl" in a real build — hardcoded here for
// clarity in this reference client.
export const API_BASE_URL = "http://10.0.2.2:3000";

async function request(path: string, options: RequestInit = {}) {
  const token = await AsyncStorage.getItem("kwetu_session_cookie");
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Cookie: token } : {}),
      ...(options.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json();
}

/**
 * Login re-uses the exact same NextAuth Credentials provider the web app uses
 * (one identity across web and mobile, per IMP-13) via NextAuth's standard
 * two-step CSRF flow: fetch a CSRF token, then POST credentials against it.
 * The resulting Set-Cookie session header is stored and replayed on every
 * subsequent request.
 */
export async function login(email: string, password: string) {
  const csrfRes = await fetch(`${API_BASE_URL}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json();

  const loginRes = await fetch(`${API_BASE_URL}/api/auth/callback/credentials`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ email, password, csrfToken, json: "true" }).toString(),
    redirect: "manual",
  });

  const setCookie = loginRes.headers.get("set-cookie");
  if (!setCookie) throw new Error("Login failed — check your email and password");
  await AsyncStorage.setItem("kwetu_session_cookie", setCookie);
  return true;
}

export const api = {
  searchBuses: (origin: string, destination: string) =>
    request(`/api/bus/search?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`),
  getTrip: (id: string) => request(`/api/bus/trips/${id}`),
  checkoutBus: (payload: {
    tripId: string;
    seatNos: string[];
    passengerName: string;
    method: string;
    msisdnOrCardRef: string;
  }) => request(`/api/bus/checkout`, { method: "POST", body: JSON.stringify(payload) }),
  myDashboard: () => request(`/api/me/dashboard`),
  register: (payload: { name: string; email: string; password: string; phone?: string }) =>
    request(`/api/register`, { method: "POST", body: JSON.stringify(payload) }),
};

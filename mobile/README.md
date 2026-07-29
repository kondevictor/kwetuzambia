# Kwetu Mobile (Expo / React Native)

A reference native client covering the flagship flow only — sign in, search buses,
pick a seat, pay, and view your wallet/loyalty status — hitting the exact same
Next.js API as the web app (one backend, one identity, per IMP-13). It is **not**
feature-complete against the web app; extending it to the other 7 verticals means
adding a screen + a fetch call per vertical against endpoints that already exist
and are already exercised by the web app (see `../BUILD_GUIDE.md`).

This was not installed or run in this environment (no Expo/emulator toolchain
available here) — the code is written and internally consistent with the live API
response shapes, but you should run `npm install` and `npx expo start` yourself
to verify against a device/emulator before treating it as production-ready.

## Setup

```bash
cd mobile
npm install
```

Edit `api.ts` → `API_BASE_URL` to point at your running web app:
- Android emulator: `http://10.0.2.2:3000`
- iOS simulator: `http://localhost:3000`
- Physical device: `http://<your-machine-LAN-IP>:3000`

```bash
npx expo start
```

Scan the QR code with Expo Go, or press `a`/`i` for an emulator/simulator.

Demo login: `chanda@example.com` / `password123`.

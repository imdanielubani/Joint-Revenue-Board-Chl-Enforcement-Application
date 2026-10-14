# Joint Revenue Board – CHL Enforcement

| Folder | What it is |
|---|---|
| [`jbr_chl_enforcement/`](jbr_chl_enforcement/) | The mobile enforcement app for Android and iPhone (Flutter). [Developer guide](jbr_chl_enforcement/README.md) |
| [`iteime_backend/`](iteime_backend/) | The ITEIME Enforcement Engine backend (Node.js, Express, TypeScript, PostgreSQL). It connects to the existing CHL backend and serves the mobile app. [Developer guide](iteime_backend/README.md) |

Mobile app:

```sh
cd jbr_chl_enforcement
flutter pub get
flutter run --flavor dev --dart-define-from-file=config/dev.json
```

Each environment (dev, staging, production) has its own app flavor and
backend deployment; see the app's "Environments" section and the backend's
"Environments and deployment".

Backend:

```sh
cd iteime_backend
npm install
npm run dev
```

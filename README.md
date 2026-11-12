# Joint Revenue Board – CHL Enforcement

How the mobile app, the ITEIME Admin Dashboard and the CHL Monitoring Dashboard communicate through the backend: [SYSTEM_INTEGRATION.md](SYSTEM_INTEGRATION.md).

| Folder | What it is |
|---|---|
| [`jbr_chl_enforcement/`](jbr_chl_enforcement/) | The mobile enforcement app for Android and iPhone (Flutter). [Developer guide](jbr_chl_enforcement/README.md) |
| [`iteime_backend/`](iteime_backend/) | The ITEIME Enforcement Engine backend (Node.js, Express, TypeScript, PostgreSQL). It connects to the existing CHL backend and serves the mobile app. [Developer guide](iteime_backend/README.md) |
| [`iteime_admin_dashboard/`](iteime_admin_dashboard/) | The ITEIME Admin Dashboard. The UI is being designed first; no code yet. [Modules](iteime_admin_dashboard/modules.md) · [UI screens](iteime_admin_dashboard/ui-screens.md) |

Mobile app:

```sh
cd jbr_chl_enforcement
flutter pub get
flutter run --flavor dev --dart-define-from-file=config/dev.json
```

Each environment (dev, staging, production) has its own app flavor and
backend deployment; see the app's "Environments" section and the backend's [deployment guide](iteime_backend/docs/deployment.md).

Backend:

```sh
cd iteime_backend
npm install
npm run dev
```

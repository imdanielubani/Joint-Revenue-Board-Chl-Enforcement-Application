# CHL Enforcement (Joint Revenue Board)

Mobile app for JRB enforcement officers on Android and iPhone. Officers
verify vehicles and haulage (CHL) trips by RFID, QR code, plate entry or OCR,
record violations with evidence, issue demand notices and work offline.

This file is the developer guide. **Keep it up to date:** whenever a screen,
setting, dependency or convention changes, update the relevant section and
add a line to the [Change log](#change-log) in the same commit.

---

## Contents

1. [Requirements](#requirements)
2. [Getting started](#getting-started)
3. [Build-time configuration](#build-time-configuration)
4. [Previewing other devices](#previewing-other-devices)
5. [App flow](#app-flow)
6. [Project structure](#project-structure)
7. [Architecture and state](#architecture-and-state)
8. [Design system](#design-system)
9. [Screens implemented](#screens-implemented)
10. [Sign-in and sessions](#sign-in-and-sessions)
11. [Permissions and platform setup](#permissions-and-platform-setup)
12. [Testing](#testing)
13. [Conventions](#conventions)
14. [Known gaps and next steps](#known-gaps-and-next-steps)
15. [Change log](#change-log)

---

## Requirements

| Tool | Version |
|---|---|
| Flutter | 3.47 (stable) |
| Dart | ^3.13.3 |
| Java (Android builds) | JDK 17 |
| Android | minSdk 24 (Android 7.0), compileSdk from Flutter |
| iOS | 15.5 or later (required by ML Kit text recognition) |

On Windows, Flutter plugins need **Developer Mode** enabled
(`start ms-settings:developers`).

iOS builds need a Mac with Xcode and CocoaPods. The `ios/Podfile` is already
set up (platform 15.5 and the permission macros below).

## Getting started

```sh
cd jbr_chl_enforcement
flutter pub get
flutter run                       # connected phone or emulator
flutter run -d chrome             # browser, with a simulated phone frame
```

App ID: `com.jrb.chlenforcement` (Android and iOS). Display name:
**CHL Enforcement**.

## Build-time configuration

Settings are passed with `--dart-define` and read in
`lib/app/environment/app_environment.dart`.

| Define | Purpose |
|---|---|
| `API_BASE_URL` | Base URL of the enforcement API. Without it, sign-in shows "Sign-in is unavailable. Contact your administrator." |
| `AUTH_DEMO=true` | Debug builds only. Signs in against a local demo account instead of the API, so the screens can be tried before the backend exists. Never active in release builds. The demo account is defined in `lib/features/auth/data/repositories/demo_auth_repository.dart`. |

```sh
flutter run --dart-define=API_BASE_URL=https://api.example.gov.ng
flutter run --dart-define=AUTH_DEMO=true
```

## Previewing other devices

`device_preview` is enabled in debug builds only (`lib/app/bootstrap.dart`).

- **In the browser** (`flutter run -d chrome`) the app starts inside a phone
  frame. The starting device is set in `bootstrap.dart`
  (`DevicePresets.iPhone17Pro` at the moment). Change it there and press
  `R` (full restart) to apply.
- **To switch device while running**, open Flutter DevTools (press `v` in the
  `flutter run` terminal, or open the DevTools link it prints, or use
  *Flutter: Open DevTools* in VS Code) and use the **device_preview** tab.
  The extension is enabled in `devtools_options.yaml`.
- On a real phone the app always runs full screen.

## App flow

```
Launch (splash) ──► Permissions ──► Sign in ──► Dashboard
                    (skipped when                │
                     nothing pending)            └─► Forgot password
```

Routes are in `lib/core/navigation/` (`app_router.dart`, `route_names.dart`),
using `go_router`.

## Project structure

Feature-first, with `data` / `domain` / `presentation` layers inside each
feature.

```
lib/
  main.dart                 Calls bootstrap()
  app/                      App widget, bootstrap, app-wide providers, environment
  core/                     Constants, theme, navigation, errors, utils, extensions
  shared/                   Code used by several features
    device/                 Wrappers around device plugins (permissions, camera, RFID, ...)
    networking/             Dio client and interceptors
    security/               Tokens, encryption, pinning, device integrity
    storage/                Preferences, secure storage, local database (drift)
    ui/widgets/             Reusable widgets (buttons, fields, alerts, ...)
  features/<feature>/
    data/                   Data sources (remote/local), models (JSON), repository implementations
    domain/                 Entities, repository interfaces, use cases
    presentation/           Riverpod providers/controllers, screens, widgets
assets/
  fonts/poppins/            Poppins 300–700 and its licence (OFL.txt)
  images/                   Logos and backgrounds
  icons/                    SVG icons (auth, alerts, permissions)
test/
  helpers/fakes.dart        In-memory fakes for repositories, storage and permissions
  unit/                     Controllers, repositories, models
  widget/                   Screens, including device-size checks
integration_test/           End-to-end flows (not yet written)
```

Many files under `lib/` are **empty placeholders** that mark where a feature
will live. Leave them empty until the feature is built (see
[Conventions](#conventions)).

## Architecture and state

- **State:** Riverpod 3 (`flutter_riverpod`). Controllers are `Notifier` /
  `AsyncNotifier` classes in each feature's `presentation/providers/`.
- **Navigation:** `go_router`, provided by `appRouterProvider`.
- **Dependency seams:** anything touching a plugin or the network sits behind
  a class with a provider (`PermissionAdapter`, `PreferencesService`,
  `SecureStorageService`, `AuthRepository`, `dioProvider`). Tests override
  these providers with fakes.
- **Startup:** `bootstrap()` enables device preview (debug), registers the
  Poppins licence and runs the app inside a `ProviderScope`.

## Design system

All in `lib/core/theme/`:

| File | Contents |
|---|---|
| `app_colors.dart` | Brand navy `#012F65` and green `#137836`, ink `#1A0C21`, header gradient colours, form error colours, alert colours, status colours |
| `app_gradients.dart` | `brandHeader`, the green gradient behind headers |
| `app_typography.dart` | Poppins type scale and weights |
| `app_spacing.dart`, `app_radii.dart`, `app_shadows.dart` | Spacing scale, corner radii, shadows |
| `app_theme.dart` | Light and dark Material 3 themes |

Shared widgets in `lib/shared/ui/widgets/`:

| Widget | Use |
|---|---|
| `AppButton.primary` / `AppButton.text` | 54 px pill buttons; `isBusy` locks, `isLoading` shows a spinner (plus `loadingLabel` when given); a primary button with no `onPressed` shows the grey disabled style |
| `AppTextField` | Labelled pill field with icon, optional suffix and `errorText` |
| `AppCheckbox` | Checkbox with label and a 48 px touch target |
| `AppAlertBanner` | Error or success alert above a form |
| `AppSpinner` | Rotating loading symbol (still when reduced motion is on) |
| `GreenHeaderScaffold` | Green header with title and a rounded white sheet; pass `onBack` for the round back button and a left-aligned title |
| `BrandAccentBar` | Short green bar under brand headings |

Errors follow one rule: **typing problems** show on the field concerned (red
border `#D92D20` and a message under it); **failures not tied to one field**
(wrong credentials, no connection) show once as an alert above the form.

## Screens implemented

| Screen | Location | Notes |
|---|---|---|
| Launch | `features/auth/presentation/screens/splash_screen.dart` | Three stages with a progress bar, then routes to permissions or sign-in. Stages are timed placeholders (see TODOs in `launch_controller.dart`). Scales to the screen, works in landscape and on tablets. |
| Permissions | `features/permissions/` | Notifications, camera, location and a "GPS is disabled" step. Each permission is asked only once per install; blocked permissions open app settings and the flow continues when the user returns. |
| Sign in | `features/auth/presentation/screens/login_screen.dart` | See below. |
| Password recovery | `features/auth/presentation/screens/forgot_password_screen.dart` | Email (carried over from sign-in), Send Reset Link (disabled until an email is entered), "Verifying..." while sending, then the "link sent" sheet (`widgets/reset_link_sent_sheet.dart`) with Return to Login. Closing the sheet keeps the screen so another link can be sent. |
| Dashboard | `features/dashboard/presentation/screens/dashboard_screen.dart` | Placeholder showing the signed-in officer. |

All implemented screens are checked in widget tests across Android and iOS
phone sizes, tablets, a foldable, landscape and 200% text.

## Sign-in and sessions

- **Screen:** green header (logo, title, description, status pill) stays
  fixed; only the white sheet with the form scrolls. When the keyboard opens
  the sheet stays below the header, and may rise only into the empty space
  under the pill, so the header stays visible. On very small screens it
  rises just enough to keep one field usable.
- **Validation:** email format and empty fields are checked before any
  network call.
- **Flow:** Sign in → spinner and locked form → success alert → dashboard
  after 1.2 s.
- **Remember Session:** when ticked, the session is saved in secure storage
  (Keychain / Android Keystore) and the choice is remembered; otherwise any
  saved session is removed. *Restoring it on the next launch is not built
  yet.*
- **API contract (assumed, confirm with the backend):** `POST /auth/login`
  with `{ "email", "password" }`, answering
  `{ "accessToken", "refreshToken"?, "expiresIn"?, "officer": { "id", "name", "email" } }`.
  Parsing is in `features/auth/data/models/auth_token_model.dart`.
  HTTP 400/401/422 mean wrong credentials; timeouts and connection errors
  mean no connection; anything else is a server error
  (`auth_repository_impl.dart`).
- **Password reset (assumed contract):** `POST /auth/forgot-password` with
  `{ "email" }`; the response body is not used. A 404 (unknown email) is
  shown as sent, so the screen never reveals which emails have accounts;
  400/422 mark the email as invalid. The debug demo repository always
  succeeds.
- **Email check:** `core/utils/validators.dart` (`Validators.isEmail`) is
  shared by sign-in and password recovery.

## Permissions and platform setup

| Permission | Android (`AndroidManifest.xml`) | iOS (`Info.plist` + `Podfile` macro) |
|---|---|---|
| Camera | `CAMERA` | `NSCameraUsageDescription`, `PERMISSION_CAMERA=1` |
| Location | `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION` | `NSLocationWhenInUseUsageDescription`, `PERMISSION_LOCATION_WHENINUSE=1` |
| Notifications | `POST_NOTIFICATIONS` (Android 13+) | `PERMISSION_NOTIFICATIONS=1` |

When adding a permission, update **all three places** (manifest, Info.plist
description, Podfile macro); on iOS a missing macro makes the permission
always report "denied".

Other platform notes:

- Launcher icons and the native splash are generated from
  `flutter_native_splash.yaml` and the `flutter_launcher_icons` settings in
  `pubspec.yaml`. After regenerating icons, check
  `ios/Runner.xcodeproj/project.pbxproj`: the generator has previously
  overwritten `ASSETCATALOG_COMPILER_GENERATE_SWIFT_ASSET_SYMBOL_EXTENSIONS`,
  which must stay `YES`.
- The native splash sets `UIStatusBarHidden = true` in `Info.plist`, which
  hides the iOS status bar app-wide.

## Testing

```sh
flutter analyze
flutter test                                   # everything
flutter test test/widget/features/auth         # one area
```

- `test/helpers/fakes.dart` has in-memory fakes: `FakeAuthRepository`,
  `FakePermissionAdapter`, `FakePreferencesService`,
  `FakeSecureStorageService`. Override providers with them in
  `ProviderScope(overrides: [...])`.
- Widget tests that check layout load the real Poppins font
  (`FontLoader('Poppins')` in `setUpAll`); otherwise Flutter's test font is
  used and text sizes are wrong.
- Screen tests include a device matrix (phones, tablets, foldable,
  landscape, keyboard open, 200% text). Add new screens to the same pattern.

## Conventions

- **Formatting:** run `dart format` on the files you changed only. Running it
  on a folder writes a blank line into every empty placeholder file; if that
  happens, restore them with `git checkout -- <files>` before committing.
- **Commits:** small, one change per commit, plain messages that describe
  what changed in the app. Commit directly on `main` and push.
- **Assets:** register new asset folders in `pubspec.yaml` and add their
  paths to `lib/core/constants/asset_paths.dart`. Prefer SVG for icons.
- **Colours and text styles:** add new values to `app_colors.dart` /
  `app_typography.dart` rather than hard-coding them in widgets.
- **Comments:** explain why, not what. Keep TODOs tagged with the feature,
  e.g. `// TODO(auth): ...`.
- **This README:** update it in the same commit as the change it describes.

## Known gaps and next steps

Sign-in and sessions:

1. Real sign-in API address and contract (needs the backend team).
2. Restore a remembered session at launch (`launch_controller.dart` TODO).
3. Sign-out, token expiry and refresh (`logout.dart`, `refresh_session.dart`).
4. Attach the token to API requests and handle 401s
   (`shared/networking/interceptors/`).
5. Route guards so signed-out users cannot reach signed-in screens
   (`core/navigation/route_guards.dart`).
6. Messages for disabled accounts (403) and too many attempts (429).
7. Session lock after inactivity with biometric unlock
   (`session_lock_screen.dart`, `biometric_auth_service.dart`).
8. Certificate pinning and rooted/jailbroken device detection
   (`shared/security/`).
9. Decide whether remembered officers can sign in offline.

Elsewhere:

- Launch stages are timed placeholders; wire them to session restore and the
  offline vehicle cache.
- The dashboard is a placeholder.
- The password reset link itself (opening it and choosing a new password)
  is handled outside the app for now.
- Strings are English only.
- `nfc_manager` and `workmanager_android` still apply the Kotlin Gradle
  Plugin; future Flutter versions will require updated plugin releases.

## Change log

Newest first. Add a line for every change.

- Password recovery screen: email carried over from sign-in, disabled
  button until an email is entered, sending state and "link sent" sheet;
  reset request in the auth repository (unknown emails reported as sent);
  back button on `GreenHeaderScaffold`; grey disabled `AppButton` style;
  shared email validator. Web preview starts on iPhone 17 Pro.

- Sign-in errors: typing problems shown under the field, other failures as
  one calm alert ("Incorrect email or password."); softer red palette.
- Sign-in header stays fixed and visible when the keyboard opens; only the
  form scrolls.
- Sign-in screen with validation, loading, error and success states;
  auth data layer, secure session storage and debug demo mode.
- Permission flow (notifications, camera, location, GPS disabled) with
  Android and iOS permission setup.
- Launch screen, responsive across phones, tablets and landscape.
- Theme with Poppins, brand colours and design tokens.
- Device preview for web (debug), DevTools extension enabled.
- Project structure, dependencies, app name and ID, iOS 15.5 target, Android
  build fixes.

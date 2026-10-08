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
| `AUTH_DEMO=true` | Debug builds only. Signs in against a local demo account instead of the API, so the screens can be tried before the backend exists. Never active in release builds. The demo account is defined in `lib/features/auth/data/repositories/demo_auth_repository.dart`. The dashboard also shows a sample day (`DemoDashboardRepository`). |

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
Launch (splash) ──► Permissions ──► Sign in ──► Signed-in tabs
                    (skipped when      │         ├─ Dashboard ──► SOS
                     nothing pending)  │         │             ├─► Verify CHL Trip ──► RFID, QR, manual plate, OCR
                                       │         │             └─► Verify E-Tag ─────► RFID, QR
                                       │         ├─ History
                                       │         ├─ Notifications
                                       │         └─ Profile
                                       └─► Forgot password
```

Routes are in `lib/core/navigation/` (`app_router.dart`, `route_names.dart`),
using `go_router`. The four signed-in tabs are a `StatefulShellRoute`, so
each tab keeps its own state and scroll position; `MainShellScaffold`
draws the floating green navigation bar over them. SOS, the two verify
pages and the four verification method pages (`/verify/rfid`, `/verify/qr`,
`/verify/plate`, `/verify/ocr`) open full screen above the tabs. Back from
any of them uses `context.popOrGoHome()` (`core/extensions/`), which returns
to the dashboard when the page was opened directly.

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
  `SecureStorageService`, `AuthRepository`, `DashboardRepository`,
  `dioProvider`). Tests override these providers with fakes.
- **Device status** (used by the dashboard tiles), in `shared/device/`:
  `internetStatusProvider` (connectivity_plus, live),
  `gpsStatusProvider` (location service on and permission granted, live),
  `rfidReaderConnectedProvider` (always `false` until the reader exists).
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
| `AppButton.primary` / `AppButton.text` | 54 px pill buttons; `isBusy` locks, `isLoading` shows a spinner (plus `loadingLabel` when given); a primary button with no `onPressed` shows the grey disabled style; `tone` picks brand green, danger red or warning amber (amber uses dark text for contrast) |
| `showAppSheet` / `AppSheetCard` (`shared/ui/sheets/`) | Floating card over the dark scrim with a drag handle; content scrolls on short screens |
| `AppTextField` | Labelled pill field with icon, optional suffix and `errorText` |
| `AppCheckbox` | Checkbox with label and a 48 px touch target |
| `AppAlertBanner` | Error or success alert above a form |
| `AppSpinner` | Rotating loading symbol (still when reduced motion is on) |
| `GreenHeaderScaffold` | Green header with title and a rounded white sheet; pass `onBack` for the round back button and a left-aligned title; `headerHeight` (default 69) sets where the sheet starts and `sheetColor` its colour |
| `BrandAccentBar` | Short green bar under brand headings |
| `EmptyState` | Centred title and message for screens with nothing to show; `notBuiltYetMessage` for placeholder screens |

Accessibility adjustments to the design: dark text on amber buttons
(white on `#F0B800` is 1.9 : 1), dark amber `#B54708` for amber text on
light fills, and the calmer red `#D92D20` instead of pure `#FF0000` for red
buttons.

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
| Account deactivated | `features/auth/presentation/widgets/auth_status_sheets.dart` | Sheet over sign-in when the server refuses sign-in because the account is deactivated (HTTP 403). |
| Session expired | `features/auth/presentation/widgets/auth_status_sheets.dart` | Sheet over sign-in after a session expires. Shows "Queued work is safe" when offline actions are waiting (`pendingSyncCountProvider`). |
| Dashboard | `features/dashboard/presentation/screens/dashboard_screen.dart` | See below. |
| Verify CHL Trip | `features/verification/presentation/screens/verification_hub_screen.dart` | "Choose verification method": Read RFID tag, Scan E-Tag QR code, Enter plate manually, Scan plate with OCR. |
| Verify E-Tag | `features/verification/presentation/screens/verify_e_tag_screen.dart` | Read RFID tag or Scan E-Tag QR code. |
| Manual plate entry | `features/verification/presentation/screens/manual_plate_entry_screen.dart` | See below. |
| History, Notifications, Profile, SOS, RFID, QR and OCR verification, Verification result | `features/<feature>/presentation/screens/` | Placeholders with the green header and "This screen is not available yet." Profile has a temporary Sign out button; the result page shows the plate being verified. |

### Dashboard

- **Header:** logo, red SOS button and the notifications bell. The bell's
  badge shows `unreadNotificationCountProvider` (hidden at 0, "99+" above 99).
- **Officer card:** initials (`Officer.initials`), name, and region · role
  from the signed-in officer.
- **Actions:** Verify CHL Trip and Verify E-Tag.
- **Status tiles:** Internet, GPS, RFID reader and Sync. Green "Online" /
  "Connected" / "Up to date", red "Offline", amber "n queued" when
  `pendingSyncCountProvider` is above 0. The sync tile is labelled
  "Offline sync" while there is no connection.
- **Daily activity** and **Recent verifications** come from
  `dashboardSummaryProvider` → `DashboardRepository`. Release builds use
  `LocalDashboardRepository`, which returns zeros and an empty list until
  verifications are stored ("No verifications yet today."). A failed load
  shows a Retry card. Pull down to refresh.
- **View all** opens the History tab. The record row
  (`verification_history/presentation/widgets/history_list_item.dart`) is
  shared with the History screen.
- Wider screens cap the content at 560 px and centre it. The tile and button
  labels shrink rather than clip on very narrow phones. The list ends above
  the floating bar.
- The design's Segoe UI text is set in Poppins like the rest of the app.

### Verification method pages

Shared pieces for every verification page are in
`verification/presentation/widgets/verification_page.dart`:
`VerificationPageScaffold` (green header, back button, grey sheet 73 px
below the status bar), `VerificationHeading` and `VerificationContentWidth`
(560 px cap on tablets).

Both verify pages are a `VerificationMethodPage`
(`verification/presentation/widgets/verification_method_tile.dart`) with a
list of `VerificationOption`s, each drawn as a `VerificationMethodTile`
card that opens its method page. To add a method, add an option with its
icon, title, description and route.

- The cards' text column is 241 px on a 390 px phone, as designed; the
  chevron's artwork supplies the gap before it.
- Hyphenated words in card descriptions ("E-Tag") never split across lines
  (a word joiner is inserted after each hyphen).
- The design's "Capture, review, and confirm the plate." runs past its text
  box on one line; here it wraps, so it never clips.
- Content is capped at 560 px wide on tablets and scrolls on short screens
  and with large text.

### Manual plate entry

- The plate rules live in `PlateNumber`
  (`verification/domain/entities/plate_number.dart`): uppercase letters and
  digits only (`ABC123AA`, the value to send to the server), shown with a
  space between each letter and digit run (`ABC 123 AA`, `LA 123 ABC`).
  3 to 10 characters.
- `PlateInputField` (`widgets/plate_input_field.dart`) formats as the
  officer types via `PlateNumberFormatter` (`PlateNumber.formatForInput`):
  lowercase becomes uppercase, typed spaces and hyphens are dropped, and a
  standard plate is spaced 3-3-2 the moment each group is complete
  (`ABC` → `ABC `, `ABC123` → `ABC 123 `), so the cursor waits at the start
  of the next group. Other plates are spaced by their letter and digit
  groups (`LA 123 ABC`). The cursor stays
  beside the same character, and backspacing over a space deletes the
  character before it. Border is ink while empty, green when focused or
  filled.
- Grey dashes inside the field (`--- --- --`) show the slots of a standard
  Nigerian plate (3 letters, 3 digits, 2 letters) still to be typed, and
  are replaced as the officer types (`AB- --- --`). They are only a guide:
  once the input stops matching the standard pattern (older or special
  plates such as `LA 123 ABC`) they disappear and the plate is still
  accepted. Screen readers ignore them, and they are hidden if they would
  not fit (very large text). Pattern: `PlateNumber.standardMask`,
  `isStandardSoFar`, `remainingMask`.
- "Verify Plate" is disabled (grey) until the plate has 3 characters; the
  keyboard's Done key does the same. It opens the verification result page
  with the `PlateNumber`.
- The field is not focused on open, matching the design; the officer taps
  it to bring up the keyboard. The button sits 10 px above the bottom inset
  and rises with the keyboard; on very short screens (landscape with the
  keyboard open) it scrolls with the form instead.

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
- **Deactivated accounts:** HTTP 403 on sign-in becomes
  `AuthFailure.accountDisabled` and shows the "Account Deactivated" sheet.
  A 403 on password reset is reported as sent, like an unknown email.
- **Session expiry:** `SessionNotifier` (`presentation/providers/
  session_provider.dart`) ends the session when the access token's
  `expiresAt` passes, clears the saved session and reports
  `SessionEndReason.expired`. `ChlEnforcementApp` reacts by going to sign-in
  with `LoginNotice.sessionExpired`, which shows the "session expired"
  sheet.
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

- `fake_async` (dev dependency) drives timers in unit tests, such as
  session expiry.
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
3. Proper sign-out (the Profile placeholder ends the session and clears
   the saved copy, but nothing is sent to the server), token refresh
   (`logout.dart`, `refresh_session.dart`).
4. Attach the token to API requests and handle 401s
   (`shared/networking/interceptors/`); a 401 should call
   `SessionNotifier.expire()` so the "session expired" sheet appears.
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
- Dashboard figures: `LocalDashboardRepository` returns zeros until
  verifications are stored locally (`TODO(verification_history)`).
- RFID reader status is always "Offline" until the reader integration exists
  (`TODO(rfid)` in `rfid_reader_adapter.dart`).
- Unread notification count is always 0 until notifications are stored
  (`TODO(notifications)`).
- History, Notifications, Profile, SOS, the RFID, QR and OCR method pages
  and the verification result page are placeholders.
- Verifying a plate does not call the server yet: the result page only
  shows the plate. Plate length limits (3–10) should be confirmed against
  the registry's rules.
- `pendingSyncCountProvider` always returns 0 until the offline sync queue
  exists, so the "Queued work is safe" banner does not show yet.
- The password reset link itself (opening it and choosing a new password)
  is handled outside the app for now.
- Strings are English only.
- `nfc_manager` and `workmanager_android` still apply the Kotlin Gradle
  Plugin; future Flutter versions will require updated plugin releases.

## Change log

Newest first. Add a line for every change.

- Dashboard line heights written as plain multipliers (e.g. `1.3`) where the
  font size had changed; no visual change. Verify E-Tag button label size
  simplified to `14`.

- Dashboard text sizes reduced: page title 20, section headings 16,
  "View all" 12, officer name 18 and region/role 10, status tile label 10
  and status 9, activity card titles 12, action buttons 14, E-Tag icon 17.

- Plate field adds the 3-3-2 spaces as soon as each group is typed.

- Plate field shows a `--- --- --` guide for the standard 8-character
  plate, filled in as the officer types.

- Manual plate entry: plate formatted as it is typed (uppercase, separators
  removed, groups spaced), Verify Plate enabled once the plate is long
  enough, keyboard Done verifies, result page placeholder. `PlateNumber`
  value; shared verification page frame and heading.

- Verify CHL Trip (RFID, QR, manual plate, OCR) and Verify E-Tag (RFID, QR)
  method pages with routes to placeholder method screens;
  `GreenHeaderScaffold` header height and sheet colour options;
  `popOrGoHome` back helper.

- Dashboard: header with SOS and notifications badge, officer card, verify
  actions, live Internet / GPS / RFID / sync status tiles (offline state),
  daily activity cards and recent verifications with pull to refresh.
  Signed-in tabs with a floating navigation bar; placeholder History,
  Notifications, Profile (with sign-out), SOS and verify pages. Officer
  region and role; verification record, trip status and method entities.

- Account deactivated and session expired sheets over sign-in; HTTP 403
  mapped to a deactivated account; session expiry timer that returns the
  officer to sign-in; shared `showAppSheet` / `AppSheetCard`; `AppButton`
  tones; "link sent" sheet moved onto the shared card.

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

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
| `AUTH_DEMO=true` | Debug builds only. Signs in against a local demo account instead of the API, so the screens can be tried before the backend exists. Never active in release builds. Demo accounts: `officer@jbr.com` / `Demo@2026` is the enforcement agent and signs in; `officer@jbr.com` with any other password shows "Unable to sign in" (wrong password). Any other email, `clerk@jbr.com` included and whatever the password, shows "Agent access not authorized" (`clerk@jbr.com` / `Demo@2026` gets there through the role check, the others are refused at sign-in). Defined in `lib/features/auth/data/repositories/demo_auth_repository.dart`. The dashboard also shows a sample day (`DemoDashboardRepository`). |

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
                                       │         └─ Profile ──► Account details
                                       │                     └─► App settings ──► Security, Offline sync, Sync queue
                                       └─► Forgot password
```

Routes are in `lib/core/navigation/` (`app_router.dart`, `route_names.dart`),
using `go_router`. The four signed-in tabs are a `StatefulShellRoute`, so
each tab keeps its own state and scroll position; `MainShellScaffold`
draws the floating green navigation bar over them. SOS, the two verify
pages and the four verification method pages (`/verify/rfid`, `/verify/qr`,
`/verify/plate`, `/verify/ocr`) open full screen above the tabs, as do
Account details (`/account`), App settings (`/settings`) and the pages
opened from settings (`/settings/password`, `/settings/sync`,
`/settings/sync-queue`). Back from
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
  `gpsStatusProvider` (location service on and permission granted; live
  for the service, and checked again whenever the app returns to the
  foreground, so allowing location in the phone's settings turns the GPS
  tile Online without restarting the app),
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
| `showAppSheet` / `AppSheetCard` (`shared/ui/sheets/`) | Floating card over the dark scrim with a drag handle; content scrolls on short screens; `useRootNavigator: true` from a tab also covers the bottom bar |
| `AppTextField` | Labelled pill field with icon, optional suffix and `errorText` |
| `AppCheckbox` | Checkbox with label and a 48 px touch target |
| `AppAlertBanner` | Error or success alert above a form |
| `AppSpinner` | Rotating loading symbol (still when reduced motion is on) |
| `GreenHeaderScaffold` | Green header with title and a rounded white sheet; pass `onBack` for the round back button and a left-aligned title; `headerHeight` (default 69) sets where the sheet starts and `sheetColor` its colour; `trailing` puts a widget (the notifications bell) at the right |
| `HeaderIconButton` | 41 px round header button with an optional count badge (the notifications bell) |
| `InitialsAvatar` | Green disc with the officer's initials and a dark ring (dashboard, Profile, Account details) |
| `ScreenHeading` | 22 px page heading with a short description under it |
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
| Profile ("My Account") | `features/profile/presentation/screens/profile_screen.dart` | See below. |
| Account details | `features/profile/presentation/screens/account_details_screen.dart` | See below. |
| App settings ("My Preferences") | `features/settings/presentation/screens/settings_screen.dart` | See below. |
| History, Notifications, SOS, RFID, QR and OCR verification, Verification result, Change password, Offline sync, Sync queue | `features/<feature>/presentation/screens/` | Placeholders with the green header and "This screen is not available yet." The result page shows the plate being verified. |

### Dashboard

- **Header:** logo and the notifications bell. The bell's badge shows
  `unreadNotificationCountProvider` (hidden at 0, "99+" above 99). There is
  no SOS button on the dashboard any more (the SOS page and route remain).
- **Officer card:** initials (`Officer.initials`), name, and region · role
  from the signed-in officer.
- **Action:** one full-width Verify CHL Trip button. E-Tags are verified
  from the page it opens ("Scan E-Tag QR code"); the separate Verify E-Tag
  page has no button on the dashboard any more.
- **Status tiles:** Internet, GPS, RFID reader and Sync. Green "Online" /
  "Connected", red "Offline". Sync is amber: "Synced", or "n queued" when
  `pendingSyncCountProvider` is above 0; red "Offline" when the sync service
  cannot be reached (`syncAvailableProvider`, always true until the sync
  service exists). The sync tile is labelled "Offline sync" while there is
  no connection.
- **Daily activity:** Total Verifications across the full width, then
  Active Trips and No Active Trips. The violations count is still in
  `DashboardSummary` but not shown.
- **Daily activity** and **Recent verifications** come from
  `dashboardSummaryProvider` → `DashboardRepository`. Release builds use
  `LocalDashboardRepository`, which returns zeros and an empty list until
  verifications are stored ("No verifications yet today."). A failed load
  shows a Retry card. Pull down to refresh.
- **Recent verifications:** each row shows what was found and how the
  vehicle was identified — a CHL trip ("Active trip · RFID") or an E-Tag
  ("E-Tag valid · Tag QR", `VerificationRecord.eTagStatus`) — with the time
  and outcome (Verified, Checked, Validated, Case created, Escalated) in
  dark text.
- **Bottom bar:** the selected tab's label and icon are dark ink on the
  bright green pill (icons are tinted, so no second copy of each is needed).
- **View all** opens the History tab. The record row
  (`verification_history/presentation/widgets/history_list_item.dart`) is
  shared with the History screen.
- Wider screens cap the content at 560 px and centre it. The tile and button
  labels shrink rather than clip on very narrow phones. The list ends above
  the floating bar.
- The design's Segoe UI text is set in Poppins like the rest of the app.
- Accessibility: amber and red status text uses the darker `warningText`
  (#B54708) and `statusDownText` (#B42318) rather than the design's #CF9D00
  and #EE4031, which are too faint for 10 px text on white.

### Profile, Account details and App settings

- **Profile tab** (`profile_screen.dart`): header "My Account" with back (to
  the dashboard) and the notifications bell. The officer card
  (`widgets/profile_header.dart`) shows initials, name, region · agent ID
  and role, and opens Account details. "Activity & account" links to the
  History tab and to App settings. **Sign out** sits 28 px above the bottom
  bar on every phone and first asks "Sign out of JRB CHL?"
  (`widgets/sign_out_sheet.dart`, `confirmSignOut`). The card covers the
  whole screen, bottom bar included (`showAppSheet(useRootNavigator:
  true)`). **Sign out** there ends the session, removes the saved copy and
  returns to sign-in; **Keep working**, the close button, tapping outside
  or dragging the card down leave everything as it was. The card sits 19 px
  from the bottom on iPhones (inside the home indicator's spare space, as
  designed) and clear of the whole system inset elsewhere. Signing out
  does not tell the server yet (there is no sign-out endpoint); add the
  call in `ProfileScreen._signOut` when there is one.
- **Account details** (`account_details_screen.dart`): read-only, as the
  identity is managed centrally. Full name, Agent ID, Role, Assigned state,
  Assignment, CHL email, Organization (`widgets/assignment_card.dart`).
  Values come from the signed-in `Officer`; missing ones show "—". Long
  values (an email) wrap at the right.
- **App settings** (`features/settings/`): rows are `SettingsSection` /
  `SettingsTile` / `SettingsSwitchTile` / `SettingsLinkRow`
  (`presentation/widgets/`), logic in `presentation/providers/
  settings_controller.dart`.
  - **Notifications** switch: saved on the phone (`settings.device_alerts`,
    on by default) by `deviceAlertsProvider`. Not yet used to decide whether
    to show alerts; see the TODO there for when push notifications arrive.
  - **Permissions & devices** switch: On when camera and location are both
    allowed (`devicePermissionsProvider`), checked again whenever the app
    returns to the foreground. Turning it on asks for whatever is missing
    (or opens the phone's settings for anything refused for good). An app
    cannot take its own permissions back, so turning it off opens the
    phone's settings. **Review access details** also opens them.
  - **Security**, **Offline sync** and **Sync queue** open placeholder
    pages. The Sync queue line counts `pendingSyncCountProvider` ("2 local
    records awaiting synchronization").
- **Fonts:** a few rows in the designs (Account details values, the
  region · agent ID line) are drawn in Segoe UI, a Windows font that
  cannot be shipped on Android or iOS; the app uses Poppins everywhere.
  The design's subtitle "Your Identity in managed by central CHL" is shown
  corrected as "Your identity is managed by central CHL." The sign-out
  card leaves out the design's prototype notes ("This local walkthrough
  does not revoke a real CHL session." and "Local response walkthrough
  only.").

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
- **Flow:** Sign in → progress dialog over the screen
  (`widgets/sign_in_dialog.dart`), with "Authenticating..." on the button:
  1. **Signing you in** (Authentication): the email and password are
     checked. The badge's outer ring has a turning green arc (still when
     reduced motion is on).
  2. **Checking agent access** (Agent Authentication): Authentication shows
     Completed; the account's role is checked.
  3. Both steps Completed for 0.7 s, then the dialog closes, "Login
     Successful..." shows, and the dashboard opens after 1.2 s.

  Each step shows for at least 0.6 s (`LoginController.minStepDuration`) so
  its result can be seen. The form is locked only while sign-in runs;
  behind a result dialog it stays enabled (the dialog's barrier blocks it).
  If the dialog goes any other way than its own buttons (navigation,
  browser Back, a rebuild), `SignInDialog` tells the controller
  (`onDialogClosed`) and the form is unlocked, so it can never be left
  locked. The close button (and system back) abandons
  sign-in until access is confirmed; a late server answer is then ignored.
- **Outcomes** (all in the same dialog):
  - **Unable to sign in** (Sign-In Unsuccessful): an account that may sign
    in, with the wrong password; or no connection, server error or no API
    configured, each with its own
    explanation (`LoginMessages.rejectionFor`). *Try again* repeats with the
    same credentials; *Edit credentials* closes the dialog with the form as
    it was.
  - **Agent access not authorized** (Access Restricted): anyone who may
    not sign in at all: the server refuses the account
    (`AuthFailure.notAuthorized`), or it signs in but its role is not
    enforcement agent. *Use Another Account* closes the
    dialog and empties the form (and ends the browser's autofill session,
        which on the web would otherwise put the old password back); *Recheck
    Access* signs in again in the background (from the start when the
    server refused the account) to fetch the current role, so access just
    granted by an administrator is picked up without retyping.
  - **Account deactivated** (HTTP 403) still shows its own sheet.
- **Agent role rule:** `AgentAccessPolicy`
  (`domain/entities/agent_access.dart`) allows only the role
  `enforcement_agent`, compared case- and separator-insensitively ("Enforcement
  Agent", "ENFORCEMENT_AGENT"). An officer with no role, or any other role,
  is refused.
- **Nothing is saved until access is confirmed:** `AuthRepository.signIn`
  only returns the session. `LoginController` keeps it in memory while it
  checks agent access, and only then calls `keepSession` and starts it. A
  refused or abandoned sign-in leaves nothing on the device.
- **Remember Session:** when ticked, the confirmed session is saved in
  secure storage (Keychain / Android Keystore) and the choice is remembered;
  otherwise any saved session is removed. *Restoring it on the next launch
  is not built yet.*
- **API contract (assumed, confirm with the backend):** `POST /auth/login`
  with `{ "email", "password" }`, answering
  `{ "accessToken", "refreshToken"?, "expiresIn"?, "officer": { "id", "name", "email", "region"?, "role", "agentId"?, "assignment"?, "organization"? } }`.
  `agentId` (e.g. "JRB-AG-0142"), `assignment` and `organization` are shown
  on Profile and Account details; anything missing shows as "—".
  **`officer.role` is required for agent access**: without it every sign-in
  is refused as "Agent access not authorized".
  Parsing is in `features/auth/data/models/auth_token_model.dart`.
  HTTP 400/401/422 mean a wrong password; HTTP 404, or 403 with
  `{ "code": "not_authorized" }`, mean the account may not sign in at all
  ("Agent access not authorized"); timeouts and connection errors mean no
  connection; anything else is a server error (`auth_repository_impl.dart`).
  **Confirm with the backend** that it tells these apart: a wrong password
  for an agent (401) versus an account that is not an agent or does not
  exist (403 `not_authorized` or 404). Note that this tells someone guessing
  whether an email belongs to an agent; if that is not acceptable, the
  backend should answer 401 for both and the app will show "Unable to sign
  in" for both.
- **Password reset (assumed contract):** `POST /auth/forgot-password` with
  `{ "email" }`; the response body is not used. A 404 (unknown email) is
  shown as sent, so the screen never reveals which emails have accounts;
  400/422 mark the email as invalid. The debug demo repository always
  succeeds.
- **Deactivated accounts:** HTTP 403 (without `code: not_authorized`) on
  sign-in becomes
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
10. Confirm the role names the API returns (and whether supervisors may use
    the app); update `AgentAccessPolicy.agentRoles`. The API must include
    `officer.role` in the sign-in response.
11. When session restore at launch is built, check the restored officer
    with `AgentAccessPolicy` too, so a role removed since the last sign-in
    takes effect.
12. "Recheck Access" re-signs in to fetch the role. If the backend adds a
    profile endpoint (e.g. `GET /auth/me`), use it instead.

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

- The dashboard's GPS tile is checked again when the app returns to the
  foreground, so it turns Online after location is allowed in the phone's
  settings (it used to stay Offline until the app restarted).

- Sign out now asks first: "Sign out of JRB CHL?" card with Sign out and
  Keep working, over the whole screen. `showAppSheet` takes
  `useRootNavigator`.

- Profile ("My Account"), Account details and App settings ("My
  Preferences") screens. `Officer` gains `agentId`, `assignment` and
  `organization`. New shared `HeaderIconButton`, `InitialsAvatar` and
  `ScreenHeading`; `GreenHeaderScaffold` takes a `trailing` widget. Page
  descriptions use no letter spacing, as designed (this also corrects the
  verification pages). Placeholder pages for Change password, Offline sync
  and Sync queue.

- Dashboard update: SOS button and Verify E-Tag button removed (one
  full-width Verify CHL Trip), Sync tile shows "Synced" and a red "Offline"
  when the sync service is down, Daily activity shows three cards (Total
  full width; Violations removed), recent verifications support E-Tag rows
  and the Checked / Validated outcomes with dark time and status, dark label
  on the selected bottom-bar tab, sample data updated.

- "Agent access not authorized" is now shown for anyone who may not sign
  in at all (not an enforcement agent, or no such account), whatever the
  password; "Unable to sign in" is for an agent's wrong password and for
  connection or server problems. New `AuthFailure.notAuthorized` (HTTP 404,
  or 403 with code `not_authorized`); Recheck Access then signs in again
  from the start. Demo: only `officer@jbr.com` is an agent.

- Sign-in fixes: the form is never left locked after a sign-in dialog
  (only locked while sign-in runs; a dialog closed by navigation or browser
  Back unlocks it); "Use Another Account" no longer gets the old password
  back on the web (browser autofill copy); editing a field dismisses a
  result that is no longer showing.

- Sign-in progress and agent role authorization: progress dialog ("Signing
  you in", "Checking agent access") with a turning ring around the badge;
  "Unable to sign in" (Try again / Edit credentials) and "Agent access not
  authorized" (Use Another Account / Recheck Access) dialogs; only the
  enforcement-agent role may sign in; the session is saved only after
  access is confirmed; sign-in can be abandoned; demo clerk account.

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

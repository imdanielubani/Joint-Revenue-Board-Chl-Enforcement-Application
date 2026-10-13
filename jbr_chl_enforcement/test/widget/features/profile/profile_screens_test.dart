import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:jbr_chl_enforcement/core/constants/storage_keys.dart';
import 'package:jbr_chl_enforcement/core/navigation/main_shell_scaffold.dart';
import 'package:jbr_chl_enforcement/core/navigation/route_names.dart';
import 'package:jbr_chl_enforcement/core/theme/app_theme.dart';
import 'package:jbr_chl_enforcement/features/auth/domain/entities/auth_session.dart';
import 'package:jbr_chl_enforcement/features/auth/domain/entities/officer.dart';
import 'package:jbr_chl_enforcement/features/auth/presentation/providers/session_provider.dart';
import 'package:jbr_chl_enforcement/features/notifications/presentation/providers/notifications_controller.dart';
import 'package:jbr_chl_enforcement/features/offline_sync/presentation/providers/sync_controller.dart';
import 'package:jbr_chl_enforcement/features/profile/presentation/screens/account_details_screen.dart';
import 'package:jbr_chl_enforcement/features/profile/presentation/screens/profile_screen.dart';
import 'package:jbr_chl_enforcement/features/profile/presentation/widgets/assignment_card.dart';
import 'package:jbr_chl_enforcement/features/profile/presentation/widgets/sign_out_sheet.dart';
import 'package:jbr_chl_enforcement/features/settings/presentation/screens/settings_screen.dart';
import 'package:jbr_chl_enforcement/shared/device/permissions/permission_adapter.dart';
import 'package:jbr_chl_enforcement/shared/storage/preferences_service.dart';
import 'package:jbr_chl_enforcement/shared/storage/secure_storage_service.dart';

import '../../../helpers/fakes.dart';

const _officer = Officer(
  id: '1',
  name: 'Daniel John',
  email: 'officer@jbr.com',
  region: 'Lagos State',
  role: 'Enforcement Agent',
  agentId: 'JRB-AG-0142',
  assignment: 'Revenue Collection',
  organization: 'CHL Enforcement Unit',
);

Widget _page(String label) => Scaffold(body: Center(child: Text(label)));

GoRouter _router(String initialLocation) => GoRouter(
  initialLocation: initialLocation,
  routes: [
    GoRoute(
      path: RoutePaths.login,
      name: RouteNames.login,
      builder: (context, state) => _page('login page'),
    ),
    StatefulShellRoute.indexedStack(
      builder: (context, state, shell) =>
          MainShellScaffold(navigationShell: shell),
      branches: [
        for (final (path, name) in [
          (RoutePaths.dashboard, RouteNames.dashboard),
          (RoutePaths.history, RouteNames.history),
          (RoutePaths.notifications, RouteNames.notifications),
        ])
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: path,
                name: name,
                builder: (context, state) => _page('$name page'),
              ),
            ],
          ),
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: RoutePaths.profile,
              name: RouteNames.profile,
              builder: (context, state) => const ProfileScreen(),
            ),
          ],
        ),
      ],
    ),
    GoRoute(
      path: RoutePaths.accountDetails,
      name: RouteNames.accountDetails,
      builder: (context, state) => const AccountDetailsScreen(),
    ),
    GoRoute(
      path: RoutePaths.settings,
      name: RouteNames.settings,
      builder: (context, state) => const SettingsScreen(),
    ),
    for (final (path, name) in [
      (RoutePaths.changePassword, RouteNames.changePassword),
      (RoutePaths.syncStatus, RouteNames.syncStatus),
      (RoutePaths.syncQueue, RouteNames.syncQueue),
    ])
      GoRoute(
        path: path,
        name: name,
        builder: (context, state) => _page('$name page'),
      ),
  ],
);

class _Harness {
  _Harness(this.container, this.router, this.permissions, this.preferences);

  final ProviderContainer container;
  final GoRouter router;
  final FakePermissionAdapter permissions;
  final FakePreferencesService preferences;
}

Future<_Harness> _pump(
  WidgetTester tester, {
  String at = RoutePaths.profile,
  Size size = const Size(390, 844),
  double textScale = 1,
  Officer? officer = _officer,
  FakePermissionAdapter? permissions,
  FakePreferencesService? preferences,
  FakeSecureStorageService? secureStorage,
  int pending = 2,
  int unread = 0,
  double bottomInset = 34,
}) async {
  final padding = FakeViewPadding(top: 47 * 3, bottom: bottomInset * 3);
  tester.view
    ..physicalSize = size * 3
    ..devicePixelRatio = 3
    ..padding = padding
    ..viewPadding = padding;
  tester.platformDispatcher.textScaleFactorTestValue = textScale;
  addTearDown(tester.view.reset);
  addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);

  final fakePermissions = permissions ?? FakePermissionAdapter.allGranted();
  final fakePreferences = preferences ?? FakePreferencesService();
  final container = ProviderContainer(
    overrides: [
      permissionAdapterProvider.overrideWithValue(fakePermissions),
      preferencesServiceProvider.overrideWithValue(fakePreferences),
      secureStorageServiceProvider.overrideWithValue(
        secureStorage ?? FakeSecureStorageService(),
      ),
      pendingSyncCountProvider.overrideWithValue(pending),
      unreadNotificationCountProvider.overrideWithValue(unread),
    ],
  );
  addTearDown(container.dispose);
  if (officer != null) {
    container
        .read(sessionProvider.notifier)
        .start(AuthSession(accessToken: 'token', officer: officer));
  }

  final router = _router(at);
  addTearDown(router.dispose);
  await tester.pumpWidget(
    UncontrolledProviderScope(
      container: container,
      child: MaterialApp.router(theme: AppTheme.light, routerConfig: router),
    ),
  );
  await tester.pumpAndSettle();
  return _Harness(container, router, fakePermissions, fakePreferences);
}

Finder _semantics(String label) => find.bySemanticsLabel(label);

void main() {
  setUpAll(() async {
    final loader = FontLoader('Poppins');
    for (final weight in ['Regular', 'Medium', 'SemiBold', 'Bold']) {
      loader.addFont(
        rootBundle.load('assets/fonts/poppins/Poppins-$weight.ttf'),
      );
    }
    await loader.load();
  });

  group('Profile', () {
    testWidgets('shows the officer, the links and Sign out', (tester) async {
      await _pump(tester);

      expect(find.text('My Account'), findsOneWidget);
      expect(find.text('Profile'), findsWidgets);
      expect(
        find.text('Your agent identity and account access.'),
        findsOneWidget,
      );
      expect(find.text('Daniel John'), findsOneWidget);
      expect(find.text('DJ'), findsOneWidget);
      expect(find.text('Lagos State · JRB-AG-0142'), findsOneWidget);
      expect(find.text('Enforcement Agent'), findsOneWidget);
      expect(find.text('Activity & account'), findsOneWidget);
      expect(find.text('Verification history'), findsOneWidget);
      expect(find.text('App settings'), findsOneWidget);
      expect(find.text('Sign out'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });

    for (final bottomInset in [34.0, 0.0]) {
      testWidgets('Sign out sits 28 px above the floating bar '
          '(bottom inset $bottomInset)', (tester) async {
        await _pump(tester, bottomInset: bottomInset);

        final signOut = tester.getRect(find.byType(OutlinedButton));
        final nav = tester.getRect(_semantics('Main navigation'));
        expect(nav.top - signOut.bottom, moreOrLessEquals(28));
      });
    }

    testWidgets('leaves out the region or agent ID when missing', (
      tester,
    ) async {
      await _pump(
        tester,
        officer: const Officer(
          id: '1',
          name: 'Daniel John',
          email: 'officer@jbr.com',
          region: 'Lagos State',
        ),
      );

      expect(find.text('Lagos State'), findsOneWidget);
      expect(find.textContaining('·'), findsNothing);
    });

    testWidgets('the officer card opens Account Details', (tester) async {
      await _pump(tester);

      await tester.tap(find.text('Daniel John'));
      await tester.pumpAndSettle();

      expect(find.byType(AccountDetailsScreen), findsOneWidget);
    });

    testWidgets('Verification history switches to the History tab', (
      tester,
    ) async {
      await _pump(tester);

      await tester.tap(find.text('Verification history'));
      await tester.pumpAndSettle();

      expect(find.text('history page'), findsOneWidget);
    });

    testWidgets('App settings opens the settings', (tester) async {
      await _pump(tester);

      await tester.tap(find.text('App settings'));
      await tester.pumpAndSettle();

      expect(find.byType(SettingsScreen), findsOneWidget);
    });

    testWidgets('the bell opens Notifications and shows the unread count', (
      tester,
    ) async {
      await _pump(tester, unread: 3);

      expect(find.text('3'), findsOneWidget);
      await tester.tap(_semantics('Notifications, 3 unread'));
      await tester.pumpAndSettle();

      expect(find.text('notifications page'), findsOneWidget);
    });

    testWidgets('back goes to the dashboard', (tester) async {
      await _pump(tester);

      await tester.tap(_semantics('Back'));
      await tester.pumpAndSettle();

      expect(find.text('dashboard page'), findsOneWidget);
    });

    group('sign out', () {
      Finder sheetSignOut() => find.descendant(
        of: find.byType(SignOutSheet),
        matching: find.text('Sign out'),
      );

      Future<(_Harness, FakeSecureStorageService)> openSheet(
        WidgetTester tester, {
        Size size = const Size(390, 844),
        double textScale = 1,
      }) async {
        final storage = FakeSecureStorageService()
          ..values[StorageKeys.authSession] = '{}';
        final harness = await _pump(
          tester,
          secureStorage: storage,
          size: size,
          textScale: textScale,
        );
        await tester.drag(
          find.byType(Scrollable).first,
          const Offset(0, -3000),
        );
        await tester.pumpAndSettle();
        await tester.tap(find.byType(OutlinedButton));
        await tester.pumpAndSettle();
        return (harness, storage);
      }

      void expectStillSignedIn(_Harness harness, FakeSecureStorageService s) {
        expect(find.byType(SignOutSheet), findsNothing);
        expect(harness.container.read(sessionProvider), isNotNull);
        expect(s.values, contains(StorageKeys.authSession));
        expect(find.byType(ProfileScreen), findsOneWidget);
      }

      testWidgets('asks first, with the design text', (tester) async {
        final (harness, storage) = await openSheet(tester);

        expect(find.byType(SignOutSheet), findsOneWidget);
        expect(find.text('Account'), findsOneWidget);
        expect(find.text('Sign out of JRB CHL?'), findsOneWidget);
        expect(
          find.text(
            'Return to sign-in? Saved operational records are not deleted.',
          ),
          findsOneWidget,
        );
        expect(sheetSignOut(), findsOneWidget);
        expect(find.text('Keep working'), findsOneWidget);
        // Nothing happens until the officer confirms.
        expect(harness.container.read(sessionProvider), isNotNull);
        expect(storage.values, contains(StorageKeys.authSession));
      });

      testWidgets('covers the navigation bar', (tester) async {
        await openSheet(tester);

        // The bar is under the scrim, so it cannot be tapped.
        expect(
          find.bySemanticsLabel('Main navigation').hitTestable(),
          findsNothing,
        );
      });

      testWidgets('Sign out ends the session and opens sign-in', (
        tester,
      ) async {
        final (harness, storage) = await openSheet(tester);

        await tester.tap(sheetSignOut());
        await tester.pumpAndSettle();

        expect(harness.container.read(sessionProvider), isNull);
        expect(storage.values, isNot(contains(StorageKeys.authSession)));
        expect(find.text('login page'), findsOneWidget);
        expect(find.byType(SignOutSheet), findsNothing);
      });

      testWidgets('Keep working stays signed in', (tester) async {
        final (harness, storage) = await openSheet(tester);

        await tester.tap(find.text('Keep working'));
        await tester.pumpAndSettle();

        expectStillSignedIn(harness, storage);
      });

      testWidgets('the close button stays signed in', (tester) async {
        final (harness, storage) = await openSheet(tester);

        await tester.tap(_semantics('Close and keep working'));
        await tester.pumpAndSettle();

        expectStillSignedIn(harness, storage);
      });

      testWidgets('tapping the scrim stays signed in', (tester) async {
        final (harness, storage) = await openSheet(tester);

        await tester.tapAt(const Offset(195, 60));
        await tester.pumpAndSettle();

        expectStillSignedIn(harness, storage);
      });

      testWidgets('dragging the card down stays signed in', (tester) async {
        final (harness, storage) = await openSheet(tester);

        await tester.drag(
          find.text('Sign out of JRB CHL?'),
          const Offset(0, 500),
        );
        await tester.pumpAndSettle();

        expectStillSignedIn(harness, storage);
      });

      for (final (name, size, scale) in [
        ('small phone', const Size(320, 568), 1.0),
        ('landscape', const Size(844, 390), 1.0),
        ('200% text', const Size(390, 844), 2.0),
      ]) {
        testWidgets('fits on a $name, both buttons reachable', (tester) async {
          await openSheet(tester, size: size, textScale: scale);

          expect(tester.takeException(), isNull);
          final scrollable = find.descendant(
            of: find.byType(SignOutSheet),
            matching: find.byType(Scrollable),
          );
          await tester.scrollUntilVisible(
            find.text('Keep working'),
            100,
            scrollable: scrollable,
          );
          expect(find.text('Keep working').hitTestable(), findsOneWidget);
          // Back up (a drag would pull the whole sheet down and close it).
          await tester.scrollUntilVisible(
            find.text('Sign out of JRB CHL?'),
            -100,
            scrollable: scrollable,
          );
          await tester.scrollUntilVisible(
            sheetSignOut(),
            100,
            scrollable: scrollable,
          );
          expect(sheetSignOut().hitTestable(), findsOneWidget);
        });
      }

      testWidgets('keeps 12 px sides and clears the home indicator', (
        tester,
      ) async {
        await openSheet(tester);

        final card = tester.getRect(
          find
              .descendant(
                of: find.byType(SignOutSheet),
                matching: find.byType(DecoratedBox),
              )
              .first,
        );
        expect(card.left, 12);
        expect(card.right, 390 - 12);
        // Android (the test platform) keeps clear of the 34 px inset.
        expect(card.bottom, 844 - 34);
      });

      testWidgets('sits 19 px from the bottom on an iPhone, as designed', (
        tester,
      ) async {
        debugDefaultTargetPlatformOverride = TargetPlatform.iOS;
        try {
          await openSheet(tester);
          final card = tester.getRect(
            find
                .descendant(
                  of: find.byType(SignOutSheet),
                  matching: find.byType(DecoratedBox),
                )
                .first,
          );
          expect(card.bottom, 844 - 19);
        } finally {
          debugDefaultTargetPlatformOverride = null;
        }
      });
    });

    for (final (name, size, scale) in [
      ('small phone', const Size(320, 568), 1.0),
      ('tablet', const Size(820, 1180), 1.0),
      ('landscape', const Size(844, 390), 1.0),
      ('200% text', const Size(390, 844), 2.0),
    ]) {
      testWidgets('lays out without overflow on a $name', (tester) async {
        await _pump(tester, size: size, textScale: scale);

        expect(tester.takeException(), isNull);
        // At the end of the page, Sign out can be tapped above the bar.
        await tester.drag(
          find.byType(Scrollable).first,
          const Offset(0, -3000),
        );
        await tester.pumpAndSettle();
        expect(find.text('Sign out').hitTestable(), findsOneWidget);
        expect(
          tester.getRect(find.text('Sign out')).bottom,
          lessThanOrEqualTo(tester.getRect(_semantics('Main navigation')).top),
        );
      });
    }
  });

  group('Account Details', () {
    testWidgets('lists every detail', (tester) async {
      await _pump(tester, at: RoutePaths.accountDetails);

      expect(find.text('Account Details'), findsOneWidget);
      expect(find.text('Account details'), findsOneWidget);
      expect(
        find.text('Your identity is managed by central CHL.'),
        findsOneWidget,
      );
      expect(find.text('DJ'), findsOneWidget);
      for (final (label, value) in [
        ('Full name', 'Daniel John'),
        ('Agent ID', 'JRB-AG-0142'),
        ('Role', 'Enforcement Agent'),
        ('Assigned state', 'Lagos State'),
        ('Assignment', 'Revenue Collection'),
        ('CHL email', 'officer@jbr.com'),
        ('Organization', 'CHL Enforcement Unit'),
      ]) {
        expect(find.text(label), findsOneWidget);
        expect(find.text(value), findsOneWidget);
        expect(_semantics('$label: $value'), findsOneWidget);
      }
    });

    testWidgets('shows a dash for details the server did not send', (
      tester,
    ) async {
      await _pump(
        tester,
        at: RoutePaths.accountDetails,
        officer: const Officer(id: '1', name: 'Daniel John', email: ''),
      );

      // Agent ID, role, state, assignment, email and organization.
      expect(find.text(AssignmentCard.missing), findsNWidgets(6));
    });

    for (final (name, size, scale) in [
      ('small phone', const Size(320, 568), 1.0),
      ('200% text', const Size(390, 844), 2.0),
    ]) {
      testWidgets('lays out without overflow on a $name', (tester) async {
        await _pump(
          tester,
          at: RoutePaths.accountDetails,
          size: size,
          textScale: scale,
          officer: const Officer(
            id: '1',
            name: 'Oluwaseun Adebayo-Williams',
            email: 'oluwaseun.adebayo-williams@jointrevenueboard.gov.ng',
            agentId: 'JRB-AG-0142',
          ),
        );

        expect(tester.takeException(), isNull);
      });
    }
  });

  group('App settings', () {
    testWidgets('shows every section and row', (tester) async {
      await _pump(tester, at: RoutePaths.settings);

      for (final text in [
        'My Preferences',
        'App settings',
        'Manage how the app works for you.',
        'Preferences',
        'Notifications',
        'Device alerts only. Your inbox stays available.',
        'Permissions & devices',
        'App access to camera and location.',
        'Review access details',
        'Account protection',
        'Security',
        'Change your CHL password',
        'Saved work',
        'Offline sync',
        'Review connection and sync status',
        'Sync queue',
        '2 local records awaiting synchronization',
      ]) {
        expect(find.text(text), findsOneWidget, reason: text);
      }
      expect(tester.takeException(), isNull);
    });

    test('describes the sync queue', () {
      expect(
        SettingsScreen.queueSummary(0),
        'No local records awaiting synchronization',
      );
      expect(
        SettingsScreen.queueSummary(1),
        '1 local record awaiting synchronization',
      );
      expect(
        SettingsScreen.queueSummary(12),
        '12 local records awaiting synchronization',
      );
    });

    testWidgets('notifications are on by default and the choice is saved', (
      tester,
    ) async {
      final harness = await _pump(tester, at: RoutePaths.settings);
      final row = _semantics(
        'Notifications. Device alerts only. Your inbox stays available.',
      );

      expect(tester.getSemantics(row).value, 'On');
      await tester.tap(row);
      await tester.pumpAndSettle();

      expect(tester.getSemantics(row).value, 'Off');
      expect(harness.preferences.values[StorageKeys.deviceAlerts], isFalse);

      await tester.tap(row);
      await tester.pumpAndSettle();
      expect(harness.preferences.values[StorageKeys.deviceAlerts], isTrue);
    });

    testWidgets('notifications start off when the officer turned them off', (
      tester,
    ) async {
      await _pump(
        tester,
        at: RoutePaths.settings,
        preferences: FakePreferencesService({StorageKeys.deviceAlerts: false}),
      );

      expect(
        tester
            .getSemantics(
              _semantics(
                'Notifications. Device alerts only. '
                'Your inbox stays available.',
              ),
            )
            .value,
        'Off',
      );
    });

    Finder permissionsRow() =>
        _semantics('Permissions & devices. App access to camera and location.');

    testWidgets('permissions show On when camera and location are allowed', (
      tester,
    ) async {
      final harness = await _pump(tester, at: RoutePaths.settings);

      expect(tester.getSemantics(permissionsRow()).value, 'On');

      // The app cannot take permissions back: the phone's settings open.
      await tester.tap(permissionsRow());
      await tester.pumpAndSettle();
      expect(harness.permissions.appSettingsOpened, 1);
      expect(harness.permissions.requested, isEmpty);
    });

    testWidgets('turning permissions on asks for what is missing', (
      tester,
    ) async {
      final harness = await _pump(
        tester,
        at: RoutePaths.settings,
        permissions: FakePermissionAdapter(
          statuses: {AppPermission.camera: AppPermissionStatus.denied},
        ),
      );

      expect(tester.getSemantics(permissionsRow()).value, 'Off');
      await tester.tap(permissionsRow());
      await tester.pumpAndSettle();

      expect(harness.permissions.requested, [AppPermission.camera]);
      expect(harness.permissions.appSettingsOpened, 0);
      expect(tester.getSemantics(permissionsRow()).value, 'On');
    });

    testWidgets('a refused permission opens the phone settings', (
      tester,
    ) async {
      final harness = await _pump(
        tester,
        at: RoutePaths.settings,
        permissions: FakePermissionAdapter(
          statuses: {
            AppPermission.location: AppPermissionStatus.permanentlyDenied,
          },
        ),
      );

      await tester.tap(permissionsRow());
      await tester.pumpAndSettle();

      expect(harness.permissions.requested, isEmpty);
      expect(harness.permissions.appSettingsOpened, 1);
      expect(tester.getSemantics(permissionsRow()).value, 'Off');
    });

    testWidgets('permissions are checked again on return to the app', (
      tester,
    ) async {
      final permissions = FakePermissionAdapter(
        statuses: {AppPermission.location: AppPermissionStatus.denied},
      );
      await _pump(tester, at: RoutePaths.settings, permissions: permissions);
      expect(tester.getSemantics(permissionsRow()).value, 'Off');

      // Allowed in the phone's settings while the app was in the background.
      permissions.statuses[AppPermission.location] =
          AppPermissionStatus.granted;
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.inactive);
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
      await tester.pumpAndSettle();

      expect(tester.getSemantics(permissionsRow()).value, 'On');
    });

    testWidgets('Review access details opens the phone settings', (
      tester,
    ) async {
      final harness = await _pump(tester, at: RoutePaths.settings);

      await tester.tap(find.text('Review access details'));
      await tester.pumpAndSettle();

      expect(harness.permissions.appSettingsOpened, 1);
    });

    for (final (row, page) in [
      ('Security', 'change-password page'),
      ('Offline sync', 'sync-status page'),
      ('Sync queue', 'sync-queue page'),
    ]) {
      testWidgets('$row opens its page', (tester) async {
        await _pump(tester, at: RoutePaths.settings);

        await tester.scrollUntilVisible(
          find.text(row),
          100,
          scrollable: find.byType(Scrollable).first,
        );
        await tester.tap(find.text(row));
        await tester.pumpAndSettle();

        expect(find.text(page), findsOneWidget);
      });
    }

    testWidgets('back from settings returns to Profile', (tester) async {
      await _pump(tester);
      await tester.tap(find.text('App settings'));
      await tester.pumpAndSettle();

      await tester.tap(_semantics('Back'));
      await tester.pumpAndSettle();

      expect(find.byType(ProfileScreen), findsOneWidget);
      expect(find.byType(SettingsScreen), findsNothing);
    });

    for (final (name, size, scale) in [
      ('small phone', const Size(320, 568), 1.0),
      ('tablet', const Size(820, 1180), 1.0),
      ('200% text', const Size(390, 844), 2.0),
    ]) {
      testWidgets('lays out without overflow on a $name', (tester) async {
        await _pump(
          tester,
          at: RoutePaths.settings,
          size: size,
          textScale: scale,
        );

        expect(tester.takeException(), isNull);
      });
    }
  });
}

import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:jbr_chl_enforcement/core/navigation/route_names.dart';
import 'package:jbr_chl_enforcement/core/theme/app_theme.dart';
import 'package:jbr_chl_enforcement/features/auth/data/repositories/auth_repository_impl.dart';
import 'package:jbr_chl_enforcement/features/auth/presentation/widgets/reset_link_sent_sheet.dart';
import 'package:jbr_chl_enforcement/features/profile/presentation/screens/change_password_screen.dart';

import '../../../helpers/fakes.dart';

/// Settings underneath Account Security, as when opened from App settings.
Future<FakeAuthRepository> _pump(
  WidgetTester tester, {
  Duration resetDelay = Duration.zero,
  Size size = const Size(390, 844),
  double textScale = 1,
}) async {
  const padding = FakeViewPadding(top: 47 * 3, bottom: 34 * 3);
  tester.view
    ..physicalSize = size * 3
    ..devicePixelRatio = 3
    ..padding = padding
    ..viewPadding = padding;
  tester.platformDispatcher.textScaleFactorTestValue = textScale;
  addTearDown(tester.view.reset);
  addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);

  final repository = FakeAuthRepository(resetDelay: resetDelay);
  final router = GoRouter(
    initialLocation: RoutePaths.settings,
    routes: [
      GoRoute(
        path: RoutePaths.settings,
        name: RouteNames.settings,
        builder: (context, state) =>
            const Scaffold(body: Center(child: Text('settings page'))),
      ),
      GoRoute(
        path: RoutePaths.changePassword,
        name: RouteNames.changePassword,
        builder: (context, state) => const ChangePasswordScreen(),
      ),
      GoRoute(
        path: RoutePaths.dashboard,
        name: RouteNames.dashboard,
        builder: (context, state) =>
            const Scaffold(body: Text('dashboard page')),
      ),
    ],
  );
  addTearDown(router.dispose);

  await tester.pumpWidget(
    ProviderScope(
      overrides: [authRepositoryProvider.overrideWithValue(repository)],
      child: MaterialApp.router(theme: AppTheme.light, routerConfig: router),
    ),
  );
  await tester.pumpAndSettle();
  unawaited(router.pushNamed(RouteNames.changePassword));
  await tester.pumpAndSettle();
  return repository;
}

Finder _sendButton() => find.ancestor(
  of: find.text('Send Reset Link'),
  matching: find.byWidgetPredicate((widget) => widget is ButtonStyleButton),
);

bool _enabled(WidgetTester tester) =>
    tester.widget<ButtonStyleButton>(_sendButton()).onPressed != null;

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

  testWidgets('shows Account Security with an empty email', (tester) async {
    await _pump(tester);

    expect(find.text('Account Security'), findsOneWidget);
    expect(find.text('Recover Your Account'), findsOneWidget);
    expect(
      find.text(
        'Enter your registered enforcement email address to receive a '
        'password reset link',
      ),
      findsOneWidget,
    );
    expect(find.text('Email Address'), findsOneWidget);
    expect(find.text('Enter your email address'), findsOneWidget);
    expect(_enabled(tester), isFalse);
    expect(tester.takeException(), isNull);
  });

  testWidgets('typing an email enables Send Reset Link', (tester) async {
    await _pump(tester);

    await tester.enterText(find.byType(TextField), 'officer@jbr.com');
    await tester.pump();

    expect(_enabled(tester), isTrue);
  });

  testWidgets('sends the link, shows Verifying..., then returns to settings', (
    tester,
  ) async {
    final repository = await _pump(
      tester,
      resetDelay: const Duration(seconds: 1),
    );
    await tester.enterText(find.byType(TextField), 'officer@jbr.com');
    await tester.pump();

    await tester.tap(find.text('Send Reset Link'));
    await tester.pump();
    expect(find.text('Verifying...'), findsOneWidget);

    await tester.pump(const Duration(seconds: 1));
    await tester.pumpAndSettle();
    expect(repository.resetRequests, ['officer@jbr.com']);
    expect(find.byType(ResetLinkSentSheet), findsOneWidget);
    expect(find.text('Return to Settings'), findsOneWidget);
    expect(find.text(ResetLinkSentSheet.returnToLogin), findsNothing);

    await tester.tap(find.text('Return to Settings'));
    await tester.pumpAndSettle();
    expect(find.text('settings page'), findsOneWidget);
    expect(find.byType(ChangePasswordScreen), findsNothing);
  });

  testWidgets('closing the sheet stays, so another link can be sent', (
    tester,
  ) async {
    await _pump(tester);
    await tester.enterText(find.byType(TextField), 'officer@jbr.com');
    await tester.pump();
    await tester.tap(find.text('Send Reset Link'));
    await tester.pumpAndSettle();

    await tester.tapAt(const Offset(195, 100));
    await tester.pumpAndSettle();

    expect(find.byType(ResetLinkSentSheet), findsNothing);
    expect(find.byType(ChangePasswordScreen), findsOneWidget);
    expect(_enabled(tester), isTrue);
  });

  testWidgets('an email that cannot be right is flagged, nothing sent', (
    tester,
  ) async {
    final repository = await _pump(tester);
    await tester.enterText(find.byType(TextField), 'not-an-email');
    await tester.pump();

    await tester.tap(find.text('Send Reset Link'));
    await tester.pumpAndSettle();

    expect(repository.resetRequests, isEmpty);
    expect(find.byType(ResetLinkSentSheet), findsNothing);
  });

  testWidgets('back returns to settings', (tester) async {
    await _pump(tester);

    await tester.tap(find.bySemanticsLabel('Back'));
    await tester.pumpAndSettle();

    expect(find.text('settings page'), findsOneWidget);
  });

  for (final (name, size, scale) in [
    ('small phone', const Size(320, 568), 1.0),
    ('landscape', const Size(844, 390), 1.0),
    ('200% text', const Size(390, 844), 2.0),
  ]) {
    testWidgets('fits on a $name', (tester) async {
      await _pump(tester, size: size, textScale: scale);

      expect(tester.takeException(), isNull);
      expect(find.text('Send Reset Link').hitTestable(), findsOneWidget);
    });
  }
}

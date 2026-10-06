import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:jbr_chl_enforcement/core/navigation/route_names.dart';
import 'package:jbr_chl_enforcement/core/theme/app_theme.dart';
import 'package:jbr_chl_enforcement/features/auth/data/datasources/auth_local_data_source.dart';
import 'package:jbr_chl_enforcement/features/auth/data/repositories/auth_repository_impl.dart';
import 'package:jbr_chl_enforcement/features/auth/domain/entities/auth_failure.dart';
import 'package:jbr_chl_enforcement/features/auth/presentation/providers/auth_controller.dart';
import 'package:jbr_chl_enforcement/features/auth/presentation/screens/forgot_password_screen.dart';
import 'package:jbr_chl_enforcement/features/auth/presentation/screens/login_screen.dart';
import 'package:jbr_chl_enforcement/features/auth/presentation/widgets/reset_link_sent_sheet.dart';
import 'package:jbr_chl_enforcement/shared/ui/widgets/app_alert_banner.dart';
import 'package:jbr_chl_enforcement/shared/ui/widgets/app_spinner.dart';

import '../../../helpers/fakes.dart';

/// App starting on sign-in, as in production, so Back and "Return to Login"
/// can be checked.
Widget _app(FakeAuthRepository repository) {
  final router = GoRouter(
    initialLocation: RoutePaths.login,
    routes: [
      GoRoute(
        path: RoutePaths.login,
        name: RouteNames.login,
        builder: (context, state) => const LoginScreen(),
        routes: [
          GoRoute(
            path: 'forgot-password',
            name: RouteNames.forgotPassword,
            builder: (context, state) => ForgotPasswordScreen(
              initialEmail: state.extra is String
                  ? state.extra! as String
                  : null,
            ),
          ),
        ],
      ),
    ],
  );
  return ProviderScope(
    overrides: [
      authRepositoryProvider.overrideWithValue(repository),
      authLocalDataSourceProvider.overrideWithValue(
        AuthLocalDataSource(
          FakeSecureStorageService(),
          FakePreferencesService(),
        ),
      ),
    ],
    child: MaterialApp.router(theme: AppTheme.light, routerConfig: router),
  );
}

Future<void> _openRecovery(
  WidgetTester tester,
  FakeAuthRepository repository, {
  String? typedEmail,
}) async {
  tester.view
    ..physicalSize = const Size(390 * 3, 844 * 3)
    ..devicePixelRatio = 3
    ..padding = const FakeViewPadding(top: 47 * 3, bottom: 34 * 3);
  addTearDown(tester.view.reset);
  await tester.pumpWidget(_app(repository));
  await tester.pumpAndSettle();
  if (typedEmail != null) {
    await tester.enterText(find.byType(TextField).first, typedEmail);
  }
  await tester.tap(find.text('Forgot Password!'));
  await tester.pumpAndSettle();
  expect(find.byType(ForgotPasswordScreen), findsOneWidget);
}

final _field = find.descendant(
  of: find.byType(ForgotPasswordScreen),
  matching: find.byType(TextField),
);
final _sendButton = find.widgetWithText(FilledButton, 'Send Reset Link');

Future<void> _type(WidgetTester tester, String email) async {
  await tester.enterText(_field, email);
  await tester.pump();
}

bool _enabled(WidgetTester tester) =>
    tester.widget<FilledButton>(_sendButton).onPressed != null;

class _Device {
  const _Device(
    this.name,
    this.width,
    this.height, {
    this.top = 0,
    this.bottom = 0,
    this.left = 0,
    this.right = 0,
    this.keyboard = 0,
    this.textScale = 1,
  });

  final String name;
  final double width;
  final double height;
  final double top;
  final double bottom;
  final double left;
  final double right;
  final double keyboard;
  final double textScale;
}

const _devices = [
  _Device('small Android, 3-button nav', 360, 640, top: 24, bottom: 48),
  _Device('Pixel 9', 412, 915, top: 24, bottom: 24),
  _Device('iPhone SE', 375, 667, top: 20),
  _Device('iPhone 15 Pro Max', 430, 932, top: 59, bottom: 34),
  _Device('narrow 320x568', 320, 568, top: 20),
  _Device('iPad Pro 12.9', 1024, 1366, top: 24, bottom: 20),
  _Device('iPhone landscape', 852, 393, bottom: 21, left: 59, right: 59),
  _Device('iPhone 15 Pro, keyboard open', 393, 852, top: 59, keyboard: 336),
  _Device('small Android, keyboard open', 360, 640, top: 24, keyboard: 280),
  _Device(
    'iPhone 15 Pro, 200% text',
    393,
    852,
    top: 59,
    bottom: 34,
    textScale: 2,
  ),
];

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

  testWidgets('shows the design content with the button disabled', (
    tester,
  ) async {
    await _openRecovery(tester, FakeAuthRepository());

    expect(find.text('Password Recovery'), findsOneWidget);
    expect(find.text('Recover Your Account'), findsOneWidget);
    expect(
      find.text(
        'Enter your registered enforcement email address to receive a '
        'password reset link',
      ),
      findsOneWidget,
    );
    expect(find.text('Enter your email address'), findsOneWidget);
    expect(_enabled(tester), isFalse);

    await _type(tester, 'o');
    expect(_enabled(tester), isTrue);
    await _type(tester, '  ');
    expect(_enabled(tester), isFalse);
  });

  testWidgets('carries over the email typed on sign-in', (tester) async {
    await _openRecovery(
      tester,
      FakeAuthRepository(),
      typedEmail: ' officer@jbr.com ',
    );

    expect(
      tester.widget<TextField>(_field).controller!.text,
      'officer@jbr.com',
    );
    expect(_enabled(tester), isTrue);
  });

  testWidgets('a malformed email shows on the field', (tester) async {
    final repository = FakeAuthRepository();
    await _openRecovery(tester, repository);

    await _type(tester, 'officer@jbr');
    await tester.tap(_sendButton);
    await tester.pumpAndSettle();

    expect(find.text(LoginMessages.emailInvalid), findsOneWidget);
    expect(repository.resetRequests, isEmpty);
  });

  testWidgets('no connection shows an alert', (tester) async {
    await _openRecovery(
      tester,
      FakeAuthRepository(resetFailure: AuthFailure.network),
    );

    await _type(tester, 'officer@jbr.com');
    await tester.tap(_sendButton);
    await tester.pumpAndSettle();

    expect(find.byType(AppAlertBanner), findsOneWidget);
    expect(find.text(LoginMessages.network), findsOneWidget);
  });

  testWidgets('sends, shows the sheet, then returns to sign-in', (
    tester,
  ) async {
    final repository = FakeAuthRepository(
      resetDelay: const Duration(milliseconds: 300),
    );
    await _openRecovery(tester, repository);

    await _type(tester, 'officer@jbr.com');
    await tester.tap(_sendButton);
    await tester.pump();

    expect(find.text('Verifying...'), findsOneWidget);
    expect(find.byType(AppSpinner), findsOneWidget);

    await tester.pump(const Duration(milliseconds: 300));
    await tester.pumpAndSettle();

    expect(repository.resetRequests, ['officer@jbr.com']);
    expect(find.byType(ResetLinkSentSheet), findsOneWidget);
    expect(find.text('Reset Password'), findsOneWidget);
    expect(find.text('Reset link sent successfully'), findsOneWidget);

    await tester.tap(find.text('Return to Login'));
    await tester.pumpAndSettle();

    expect(find.byType(ForgotPasswordScreen), findsNothing);
    expect(find.byType(LoginScreen), findsOneWidget);
  });

  testWidgets('closing the sheet keeps the screen so a link can be resent', (
    tester,
  ) async {
    final repository = FakeAuthRepository();
    await _openRecovery(tester, repository);

    await _type(tester, 'officer@jbr.com');
    await tester.tap(_sendButton);
    await tester.pumpAndSettle();
    expect(find.byType(ResetLinkSentSheet), findsOneWidget);

    // Tap the dark scrim above the card.
    await tester.tapAt(const Offset(195, 100));
    await tester.pumpAndSettle();

    expect(find.byType(ResetLinkSentSheet), findsNothing);
    expect(find.byType(ForgotPasswordScreen), findsOneWidget);

    await tester.tap(_sendButton);
    await tester.pumpAndSettle();
    expect(repository.resetRequests, hasLength(2));
  });

  testWidgets('the back button returns to sign-in', (tester) async {
    await _openRecovery(tester, FakeAuthRepository());

    await tester.tap(find.bySemanticsLabel('Back'));
    await tester.pumpAndSettle();

    expect(find.byType(LoginScreen), findsOneWidget);
    expect(find.byType(ForgotPasswordScreen), findsNothing);
  });

  for (final device in _devices) {
    testWidgets('fits on ${device.name}', (tester) async {
      const dpr = 3.0;
      tester.view
        ..physicalSize = Size(device.width * dpr, device.height * dpr)
        ..devicePixelRatio = dpr
        ..padding = FakeViewPadding(
          top: device.top * dpr,
          bottom: device.bottom * dpr,
          left: device.left * dpr,
          right: device.right * dpr,
        )
        ..viewInsets = FakeViewPadding(bottom: device.keyboard * dpr);
      tester.platformDispatcher.textScaleFactorTestValue = device.textScale;
      addTearDown(() {
        tester.view.reset();
        tester.platformDispatcher.clearTextScaleFactorTestValue();
      });

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            authRepositoryProvider.overrideWithValue(FakeAuthRepository()),
          ],
          child: MaterialApp(
            theme: AppTheme.light,
            home: const ForgotPasswordScreen(initialEmail: 'officer@jbr.com'),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(tester.takeException(), isNull);

      final visible = Rect.fromLTRB(
        device.left,
        device.top,
        device.width - device.right,
        device.height - device.bottom - device.keyboard,
      ).inflate(0.5);
      bool inside(Rect r) =>
          visible.contains(r.topLeft) && visible.contains(r.bottomRight);

      // The button stays on screen, above the keyboard.
      final button = tester.getRect(_sendButton);
      expect(inside(button), isTrue, reason: 'button $button in $visible');
      expect(inside(tester.getRect(find.text('Password Recovery'))), isTrue);

      // The field can be scrolled into view above the button.
      await tester.ensureVisible(_field);
      await tester.pumpAndSettle();
      final field = tester.getRect(_field);
      expect(field.bottom, lessThanOrEqualTo(button.top));
    });
  }
}

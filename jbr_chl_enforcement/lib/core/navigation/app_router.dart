import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/presentation/screens/forgot_password_screen.dart';
import '../../features/auth/presentation/screens/login_screen.dart';
import '../../features/auth/presentation/screens/splash_screen.dart';
import '../../features/dashboard/presentation/screens/dashboard_screen.dart';
import '../../features/notifications/presentation/screens/notifications_screen.dart';
import '../../features/permissions/presentation/screens/permission_screen.dart';
import '../../features/profile/presentation/screens/profile_screen.dart';
import '../../features/sos/presentation/screens/sos_screen.dart';
import '../../features/verification/presentation/screens/manual_plate_entry_screen.dart';
import '../../features/verification/presentation/screens/ocr_capture_screen.dart';
import '../../features/verification/presentation/screens/qr_scan_screen.dart';
import '../../features/verification/presentation/screens/rfid_scan_screen.dart';
import '../../features/verification/presentation/screens/verification_hub_screen.dart';
import '../../features/verification/presentation/screens/verify_e_tag_screen.dart';
import '../../features/verification_history/presentation/screens/verification_history_screen.dart';
import 'main_shell_scaffold.dart';
import 'route_names.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  final router = GoRouter(
    initialLocation: RoutePaths.launch,
    routes: [
      GoRoute(
        path: RoutePaths.launch,
        name: RouteNames.launch,
        builder: (context, state) => const SplashScreen(),
      ),
      GoRoute(
        path: RoutePaths.permissions,
        name: RouteNames.permissions,
        builder: (context, state) => const PermissionScreen(),
      ),
      GoRoute(
        path: RoutePaths.login,
        name: RouteNames.login,
        builder: (context, state) => LoginScreen(
          notice: state.extra is LoginNotice
              ? state.extra! as LoginNotice
              : null,
        ),
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
      // Signed-in tabs, each keeping its own state.
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) =>
            MainShellScaffold(navigationShell: navigationShell),
        branches: [
          _tab(RoutePaths.dashboard, RouteNames.dashboard, DashboardScreen()),
          _tab(
            RoutePaths.history,
            RouteNames.history,
            VerificationHistoryScreen(),
          ),
          _tab(
            RoutePaths.notifications,
            RouteNames.notifications,
            NotificationsScreen(),
          ),
          _tab(RoutePaths.profile, RouteNames.profile, ProfileScreen()),
        ],
      ),
      // Full-screen pages above the tabs.
      GoRoute(
        path: RoutePaths.sos,
        name: RouteNames.sos,
        builder: (context, state) => const SosScreen(),
      ),
      GoRoute(
        path: RoutePaths.verifyTrip,
        name: RouteNames.verifyTrip,
        builder: (context, state) => const VerificationHubScreen(),
      ),
      GoRoute(
        path: RoutePaths.verifyETag,
        name: RouteNames.verifyETag,
        builder: (context, state) => const VerifyETagScreen(),
      ),
      // Verification methods, opened from either verify page.
      GoRoute(
        path: RoutePaths.rfidScan,
        name: RouteNames.rfidScan,
        builder: (context, state) => const RfidScanScreen(),
      ),
      GoRoute(
        path: RoutePaths.qrScan,
        name: RouteNames.qrScan,
        builder: (context, state) => const QrScanScreen(),
      ),
      GoRoute(
        path: RoutePaths.manualPlate,
        name: RouteNames.manualPlate,
        builder: (context, state) => const ManualPlateEntryScreen(),
      ),
      GoRoute(
        path: RoutePaths.ocrCapture,
        name: RouteNames.ocrCapture,
        builder: (context, state) => const OcrCaptureScreen(),
      ),
    ],
  );
  ref.onDispose(router.dispose);
  return router;
});

StatefulShellBranch _tab(String path, String name, Widget screen) =>
    StatefulShellBranch(
      routes: [
        GoRoute(path: path, name: name, builder: (context, state) => screen),
      ],
    );

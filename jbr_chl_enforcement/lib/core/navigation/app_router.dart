import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/presentation/screens/forgot_password_screen.dart';
import '../../features/auth/presentation/screens/login_screen.dart';
import '../../features/auth/presentation/screens/splash_screen.dart';
import '../../features/dashboard/presentation/screens/dashboard_screen.dart';
import '../../features/permissions/presentation/screens/permission_screen.dart';
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
        builder: (context, state) => const LoginScreen(),
        routes: [
          GoRoute(
            path: 'forgot-password',
            name: RouteNames.forgotPassword,
            builder: (context, state) => const ForgotPasswordScreen(),
          ),
        ],
      ),
      GoRoute(
        path: RoutePaths.dashboard,
        name: RouteNames.dashboard,
        builder: (context, state) => const DashboardScreen(),
      ),
    ],
  );
  ref.onDispose(router.dispose);
  return router;
});

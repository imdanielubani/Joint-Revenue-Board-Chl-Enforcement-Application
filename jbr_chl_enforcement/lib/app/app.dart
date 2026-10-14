import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/navigation/app_router.dart';
import '../core/navigation/route_names.dart';
import '../core/theme/app_theme.dart';
import '../features/auth/presentation/providers/session_provider.dart';
import '../features/auth/presentation/screens/login_screen.dart';
import 'environment/app_environment.dart';

class ChlEnforcementApp extends ConsumerWidget {
  const ChlEnforcementApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(appRouterProvider);

    // An expired session sends the officer to sign-in with an explanation.
    ref.listen(sessionEndProvider, (previous, reason) {
      if (reason != SessionEndReason.expired) return;
      ref.read(sessionEndProvider.notifier).clear();
      router.goNamed(RouteNames.login, extra: LoginNotice.sessionExpired);
    });

    return MaterialApp.router(
      title: 'CHL Enforcement',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      themeMode: ThemeMode.system,
      routerConfig: router,
      builder: (context, child) =>
          FlavorBanner(label: AppEnvironment.flavor.bannerLabel, child: child),
    );
  }
}

/// "DEV" or "STAGING" across the top corner of every screen, so a test
/// build is never mistaken for the real one. Nothing for production.
class FlavorBanner extends StatelessWidget {
  const FlavorBanner({super.key, required this.label, this.child});

  final String label;
  final Widget? child;

  @override
  Widget build(BuildContext context) {
    final content = child ?? const SizedBox.shrink();
    if (label.isEmpty) return content;
    return Banner(
      message: label,
      location: BannerLocation.topEnd,
      textDirection: TextDirection.ltr,
      layoutDirection: TextDirection.ltr,
      color: const Color(0xCCB3261E),
      child: content,
    );
  }
}

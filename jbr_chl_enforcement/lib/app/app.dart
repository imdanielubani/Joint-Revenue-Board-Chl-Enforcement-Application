import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/navigation/app_router.dart';
import '../core/navigation/route_names.dart';
import '../core/theme/app_theme.dart';
import '../features/auth/presentation/providers/session_provider.dart';
import '../features/auth/presentation/screens/login_screen.dart';

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
    );
  }
}

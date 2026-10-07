import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/navigation/route_names.dart';
import '../../../../shared/ui/widgets/app_button.dart';
import '../../../../shared/ui/widgets/empty_state.dart';
import '../../../../shared/ui/widgets/green_header_scaffold.dart';
import '../../../auth/data/repositories/auth_repository_impl.dart';
import '../../../auth/presentation/providers/session_provider.dart';

/// Profile tab. Placeholder until its design is implemented; offers
/// signing out meanwhile.
class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  Future<void> _signOut(BuildContext context, WidgetRef ref) async {
    ref.read(sessionProvider.notifier).end();
    try {
      await ref.read(authLocalDataSourceProvider).clearSession();
    } catch (error) {
      debugPrint('Could not clear the saved session: $error');
    }
    if (context.mounted) context.goNamed(RouteNames.login);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final officer = ref.watch(sessionProvider)?.officer;

    return GreenHeaderScaffold(
      title: 'Profile',
      body: Column(
        children: [
          Expanded(
            child: EmptyState(
              title: officer?.name ?? 'Profile',
              message: notBuiltYetMessage,
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 104),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: AppButton.text(
                label: 'Sign out',
                onPressed: () => _signOut(context, ref),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

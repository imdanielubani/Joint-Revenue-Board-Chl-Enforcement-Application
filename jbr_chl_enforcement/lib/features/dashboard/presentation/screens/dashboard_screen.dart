import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../auth/presentation/providers/session_provider.dart';

/// Home after sign-in. Placeholder until the dashboard design is
/// implemented.
class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final officer = ref.watch(sessionProvider)?.officer;

    return Scaffold(
      appBar: AppBar(title: const Text('Dashboard')),
      body: Center(
        child: Text(
          officer == null ? 'Dashboard' : 'Signed in as ${officer.name}',
        ),
      ),
    );
  }
}

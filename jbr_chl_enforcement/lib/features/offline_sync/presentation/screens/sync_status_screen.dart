import 'package:flutter/material.dart';

import '../../../../core/extensions/context_extensions.dart';
import '../../../../shared/ui/widgets/empty_state.dart';
import '../../../../shared/ui/widgets/green_header_scaffold.dart';

/// Connection and sync status. Placeholder until its design is implemented.
class SyncStatusScreen extends StatelessWidget {
  const SyncStatusScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return GreenHeaderScaffold(
      title: 'Offline sync',
      onBack: context.popOrGoHome,
      body: const EmptyState(
        title: 'Offline sync',
        message: notBuiltYetMessage,
      ),
    );
  }
}

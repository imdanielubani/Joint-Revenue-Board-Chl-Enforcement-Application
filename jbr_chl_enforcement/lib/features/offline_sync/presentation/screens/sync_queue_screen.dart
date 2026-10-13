import 'package:flutter/material.dart';

import '../../../../core/extensions/context_extensions.dart';
import '../../../../shared/ui/widgets/empty_state.dart';
import '../../../../shared/ui/widgets/green_header_scaffold.dart';

/// Records saved on the phone waiting to sync. Placeholder until its design is implemented.
class SyncQueueScreen extends StatelessWidget {
  const SyncQueueScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return GreenHeaderScaffold(
      title: 'Sync queue',
      onBack: context.popOrGoHome,
      body: const EmptyState(title: 'Sync queue', message: notBuiltYetMessage),
    );
  }
}

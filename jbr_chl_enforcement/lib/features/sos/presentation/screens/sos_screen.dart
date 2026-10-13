import 'package:flutter/material.dart';

import '../../../../core/extensions/context_extensions.dart';
import '../../../../shared/ui/widgets/empty_state.dart';
import '../../../../shared/ui/widgets/green_header_scaffold.dart';
import '../../../notifications/presentation/widgets/notifications_bell.dart';

/// Emergency SOS. Placeholder until its design is implemented.
class SosScreen extends StatelessWidget {
  const SosScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return GreenHeaderScaffold(
      title: 'SOS',
      onBack: context.popOrGoHome,
      trailing: const NotificationsBell(),
      body: const EmptyState(
        title: 'Emergency SOS',
        message: notBuiltYetMessage,
      ),
    );
  }
}

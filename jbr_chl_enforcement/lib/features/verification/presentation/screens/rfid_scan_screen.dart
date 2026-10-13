import 'package:flutter/material.dart';

import '../../../../core/extensions/context_extensions.dart';
import '../../../../shared/ui/widgets/empty_state.dart';
import '../../../../shared/ui/widgets/green_header_scaffold.dart';
import '../../../notifications/presentation/widgets/notifications_bell.dart';

/// Read RFID tag. Placeholder until its design is implemented.
class RfidScanScreen extends StatelessWidget {
  const RfidScanScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return GreenHeaderScaffold(
      title: 'Verification',
      onBack: context.popOrGoHome,
      trailing: const NotificationsBell(),
      body: const EmptyState(
        title: 'Read RFID tag',
        message: notBuiltYetMessage,
      ),
    );
  }
}

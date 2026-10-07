import 'package:flutter/material.dart';

import '../../../../core/extensions/context_extensions.dart';
import '../../../../shared/ui/widgets/empty_state.dart';
import '../../../../shared/ui/widgets/green_header_scaffold.dart';

/// Scan E-Tag QR code. Placeholder until its design is implemented.
class QrScanScreen extends StatelessWidget {
  const QrScanScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return GreenHeaderScaffold(
      title: 'Verification',
      onBack: context.popOrGoHome,
      body: const EmptyState(
        title: 'Scan E-Tag QR code',
        message: notBuiltYetMessage,
      ),
    );
  }
}

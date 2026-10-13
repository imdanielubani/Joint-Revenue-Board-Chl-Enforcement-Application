import 'package:flutter/material.dart';

import '../../../../core/extensions/context_extensions.dart';
import '../../../../shared/ui/widgets/empty_state.dart';
import '../../../../shared/ui/widgets/green_header_scaffold.dart';
import '../../../notifications/presentation/widgets/notifications_bell.dart';

/// Scan plate with OCR. Placeholder until its design is implemented.
class OcrCaptureScreen extends StatelessWidget {
  const OcrCaptureScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return GreenHeaderScaffold(
      title: 'Verification',
      onBack: context.popOrGoHome,
      trailing: const NotificationsBell(),
      body: const EmptyState(
        title: 'Scan plate with OCR',
        message: notBuiltYetMessage,
      ),
    );
  }
}

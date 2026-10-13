import 'package:flutter/material.dart';

import '../../../../core/extensions/context_extensions.dart';
import '../../../../shared/ui/widgets/empty_state.dart';
import '../../../../shared/ui/widgets/green_header_scaffold.dart';
import '../../../verification/domain/entities/plate_number.dart';
import '../../../verification/domain/entities/scanned_qr.dart';

/// Result for a verified plate, a scanned CHL receipt QR or a scanned
/// E-Tag QR; a receipt and an E-Tag each have their own result.
/// Placeholder until its designs are implemented.
class VerificationResultScreen extends StatelessWidget {
  const VerificationResultScreen({super.key, this.plate, this.scan});

  /// The plate being verified; null when the page is opened directly.
  final PlateNumber? plate;

  /// The QR code being verified, when it came from the scanner.
  final ScannedQr? scan;

  @override
  Widget build(BuildContext context) {
    return GreenHeaderScaffold(
      title: 'Verification result',
      onBack: context.popOrGoHome,
      body: EmptyState(
        title:
            plate?.display ??
            switch (scan?.kind) {
              ScannedQrKind.receipt => 'Receipt QR scanned',
              ScannedQrKind.eTag => 'E-Tag QR scanned',
              null => 'Verification result',
            },
        message: notBuiltYetMessage,
      ),
    );
  }
}

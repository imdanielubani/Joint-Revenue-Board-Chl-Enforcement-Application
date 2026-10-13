import 'package:flutter/material.dart';

import '../../../../core/extensions/context_extensions.dart';
import '../../../../shared/ui/widgets/empty_state.dart';
import '../../../../shared/ui/widgets/green_header_scaffold.dart';
import '../../../verification/domain/entities/plate_number.dart';
import '../../../verification/domain/entities/scanned_qr.dart';

/// Vehicle and CHL trip result for a verified plate or a scanned receipt or
/// E-Tag QR code. Placeholder until its design is implemented.
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
            switch (scan?.target) {
              QrScanTarget.receipt => 'Receipt QR scanned',
              QrScanTarget.eTag => 'E-Tag QR scanned',
              null => 'Verification result',
            },
        message: notBuiltYetMessage,
      ),
    );
  }
}

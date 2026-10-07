import 'package:flutter/material.dart';

import '../../../../core/extensions/context_extensions.dart';
import '../../../../shared/ui/widgets/empty_state.dart';
import '../../../../shared/ui/widgets/green_header_scaffold.dart';
import '../../../verification/domain/entities/plate_number.dart';

/// Vehicle and CHL trip result for a verified plate. Placeholder until its
/// design is implemented.
class VerificationResultScreen extends StatelessWidget {
  const VerificationResultScreen({super.key, this.plate});

  /// The plate being verified; null when the page is opened directly.
  final PlateNumber? plate;

  @override
  Widget build(BuildContext context) {
    return GreenHeaderScaffold(
      title: 'Verification result',
      onBack: context.popOrGoHome,
      body: EmptyState(
        title: plate?.display ?? 'Verification result',
        message: notBuiltYetMessage,
      ),
    );
  }
}

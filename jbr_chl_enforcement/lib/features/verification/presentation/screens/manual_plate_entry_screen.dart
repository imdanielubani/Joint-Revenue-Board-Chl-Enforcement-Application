import 'package:flutter/material.dart';

import '../../../../core/extensions/context_extensions.dart';
import '../../../../shared/ui/widgets/empty_state.dart';
import '../../../../shared/ui/widgets/green_header_scaffold.dart';

/// Enter plate manually. Placeholder until its design is implemented.
class ManualPlateEntryScreen extends StatelessWidget {
  const ManualPlateEntryScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return GreenHeaderScaffold(
      title: 'Verification',
      onBack: context.popOrGoHome,
      body: const EmptyState(
        title: 'Enter plate manually',
        message: notBuiltYetMessage,
      ),
    );
  }
}

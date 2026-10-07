import 'package:flutter/material.dart';

import '../../../../shared/ui/widgets/empty_state.dart';
import '../../../../shared/ui/widgets/green_header_scaffold.dart';

/// Verification history tab. Placeholder until its design is implemented.
class VerificationHistoryScreen extends StatelessWidget {
  const VerificationHistoryScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const GreenHeaderScaffold(
      title: 'History',
      body: EmptyState(title: 'History', message: notBuiltYetMessage),
    );
  }
}

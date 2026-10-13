import 'package:flutter/material.dart';

import '../../../../core/extensions/context_extensions.dart';
import '../../../../shared/ui/widgets/empty_state.dart';
import '../../../../shared/ui/widgets/green_header_scaffold.dart';

/// Change the officer's CHL password. Placeholder until its design is implemented.
class ChangePasswordScreen extends StatelessWidget {
  const ChangePasswordScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return GreenHeaderScaffold(
      title: 'Change password',
      onBack: context.popOrGoHome,
      body: const EmptyState(
        title: 'Change password',
        message: notBuiltYetMessage,
      ),
    );
  }
}

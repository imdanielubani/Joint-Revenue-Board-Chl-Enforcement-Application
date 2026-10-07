import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/navigation/route_names.dart';
import '../../../../shared/ui/widgets/empty_state.dart';
import '../../../../shared/ui/widgets/green_header_scaffold.dart';

/// Verify CHL Trip. Placeholder until its design is implemented.
class VerificationHubScreen extends StatelessWidget {
  const VerificationHubScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return GreenHeaderScaffold(
      title: 'Verify CHL Trip',
      onBack: () => context.canPop()
          ? context.pop()
          : context.goNamed(RouteNames.dashboard),
      body: const EmptyState(
        title: 'Verify CHL Trip',
        message: notBuiltYetMessage,
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/navigation/route_names.dart';
import '../../../../shared/ui/widgets/empty_state.dart';
import '../../../../shared/ui/widgets/green_header_scaffold.dart';

/// Emergency SOS. Placeholder until its design is implemented.
class SosScreen extends StatelessWidget {
  const SosScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return GreenHeaderScaffold(
      title: 'SOS',
      onBack: () => context.canPop()
          ? context.pop()
          : context.goNamed(RouteNames.dashboard),
      body: const EmptyState(
        title: 'Emergency SOS',
        message: notBuiltYetMessage,
      ),
    );
  }
}

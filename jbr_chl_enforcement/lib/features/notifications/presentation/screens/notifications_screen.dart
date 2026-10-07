import 'package:flutter/material.dart';

import '../../../../shared/ui/widgets/empty_state.dart';
import '../../../../shared/ui/widgets/green_header_scaffold.dart';

/// Notifications tab. Placeholder until its design is implemented.
class NotificationsScreen extends StatelessWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const GreenHeaderScaffold(
      title: 'Notifications',
      body: EmptyState(title: 'Notifications', message: notBuiltYetMessage),
    );
  }
}

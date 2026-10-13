import 'package:flutter/material.dart';

import '../../../../shared/ui/widgets/card_list_skeleton.dart';

/// "Loading your notifications…" with four placeholder cards.
class NotificationsSkeleton extends StatelessWidget {
  const NotificationsSkeleton({super.key});

  static const String label = 'Loading your notifications…';

  @override
  Widget build(BuildContext context) => const CardListSkeleton(label: label);
}

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/constants/asset_paths.dart';
import '../../../../core/navigation/route_names.dart';
import '../../../../shared/ui/widgets/header_icon_button.dart';
import '../providers/notifications_controller.dart';

/// The notifications bell at the right of a page header, with the number
/// of unread notifications. Opens the notifications.
class NotificationsBell extends ConsumerWidget {
  const NotificationsBell({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final unread = ref.watch(unreadNotificationCountProvider);
    return HeaderIconButton(
      iconAsset: AssetPaths.iconBell,
      semanticLabel: unread > 0
          ? 'Notifications, $unread unread'
          : 'Notifications',
      badgeCount: unread,
      onPressed: () => context.goNamed(RouteNames.notifications),
    );
  }
}

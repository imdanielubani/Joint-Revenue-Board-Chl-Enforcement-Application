import 'package:flutter/material.dart';

import '../../../../core/constants/asset_paths.dart';
import '../../../../shared/ui/widgets/header_icon_button.dart';

/// Logo on the left and notifications on the right, over the green header.
class DashboardHeader extends StatelessWidget {
  const DashboardHeader({
    super.key,
    required this.unreadNotifications,
    required this.onNotifications,
  });

  final int unreadNotifications;
  final VoidCallback onNotifications;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Semantics(
          image: true,
          label: 'JRB CHL Enforcement',
          child: Container(
            width: 41,
            height: 41,
            decoration: const BoxDecoration(
              color: Colors.white,
              shape: BoxShape.circle,
            ),
            alignment: Alignment.center,
            child: Image.asset(
              AssetPaths.logoShield,
              width: 24,
              height: 30.984,
              fit: BoxFit.contain,
              excludeFromSemantics: true,
            ),
          ),
        ),
        const Spacer(),
        HeaderIconButton(
          iconAsset: AssetPaths.iconBell,
          semanticLabel: unreadNotifications > 0
              ? 'Notifications, $unreadNotifications unread'
              : 'Notifications',
          onPressed: onNotifications,
          badgeCount: unreadNotifications,
        ),
      ],
    );
  }
}

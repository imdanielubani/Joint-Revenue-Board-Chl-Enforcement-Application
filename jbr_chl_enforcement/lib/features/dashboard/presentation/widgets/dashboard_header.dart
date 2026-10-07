import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../../../../core/constants/asset_paths.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_typography.dart';

/// Logo on the left; SOS and notifications on the right, over the green
/// header.
class DashboardHeader extends StatelessWidget {
  const DashboardHeader({
    super.key,
    required this.unreadNotifications,
    required this.onSos,
    required this.onNotifications,
  });

  final int unreadNotifications;
  final VoidCallback onSos;
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
        _RoundIconButton(
          iconAsset: AssetPaths.iconSos,
          background: AppColors.sos,
          semanticLabel: 'SOS emergency',
          onPressed: onSos,
        ),
        const SizedBox(width: 5),
        _RoundIconButton(
          iconAsset: AssetPaths.iconBell,
          background: AppColors.headerButton,
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

/// 41 px round button inside a 48 px touch target, with an optional badge.
class _RoundIconButton extends StatelessWidget {
  const _RoundIconButton({
    required this.iconAsset,
    required this.background,
    required this.semanticLabel,
    required this.onPressed,
    this.badgeCount = 0,
  });

  final String iconAsset;
  final Color background;
  final String semanticLabel;
  final VoidCallback onPressed;
  final int badgeCount;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: semanticLabel,
      excludeSemantics: true,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: onPressed,
        child: SizedBox(
          width: 41,
          height: 48,
          child: Stack(
            clipBehavior: Clip.none,
            alignment: Alignment.center,
            children: [
              Container(
                width: 41,
                height: 41,
                decoration: BoxDecoration(
                  color: background,
                  shape: BoxShape.circle,
                ),
                alignment: Alignment.center,
                child: SvgPicture.asset(
                  iconAsset,
                  width: 22,
                  height: 22,
                  excludeFromSemantics: true,
                ),
              ),
              if (badgeCount > 0)
                Positioned(
                  left: 25,
                  top: 4.5,
                  child: _Badge(count: badgeCount),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Badge extends StatelessWidget {
  const _Badge({required this.count});

  final int count;

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: const BoxConstraints(minWidth: 18, minHeight: 18),
      padding: const EdgeInsets.symmetric(horizontal: 4),
      decoration: const BoxDecoration(
        color: AppColors.sos,
        borderRadius: BorderRadius.all(Radius.circular(9)),
        boxShadow: [BoxShadow(color: AppColors.badgeRing, spreadRadius: 2)],
      ),
      alignment: Alignment.center,
      child: Text(
        count > 99 ? '99+' : '$count',
        style: const TextStyle(
          fontFamily: AppTypography.fontFamily,
          fontSize: 10,
          fontWeight: AppTypography.semiBold,
          height: 15 / 10,
          color: Colors.white,
        ),
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';

/// 41 px round button on the green header, inside a 48 px tall touch
/// target, with an optional count badge (e.g. unread notifications).
class HeaderIconButton extends StatelessWidget {
  const HeaderIconButton({
    super.key,
    required this.iconAsset,
    required this.semanticLabel,
    required this.onPressed,
    this.background = AppColors.headerButton,
    this.badgeCount = 0,
  });

  final String iconAsset;
  final String semanticLabel;
  final VoidCallback onPressed;
  final Color background;

  /// Shown as a red badge when above zero; "99+" above 99.
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

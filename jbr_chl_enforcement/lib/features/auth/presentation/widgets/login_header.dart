import 'package:flutter/material.dart';

import '../../../../core/constants/asset_paths.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_typography.dart';

/// Logo badge, title, subtitle and "Secure Enforcement Platform" pill on the
/// green header of the sign-in screen.
class LoginHeader extends StatelessWidget {
  const LoginHeader({super.key});

  static const TextStyle _titleStyle = TextStyle(
    fontFamily: AppTypography.fontFamily,
    fontSize: 20,
    fontWeight: AppTypography.bold,
    height: 37 / 20,
    letterSpacing: -0.4,
    color: Colors.white,
  );

  static const TextStyle _subtitleStyle = TextStyle(
    fontFamily: AppTypography.fontFamily,
    fontSize: 13,
    fontWeight: AppTypography.regular,
    height: 1.5,
    color: AppColors.onHeaderMuted,
  );

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      spacing: 19,
      children: [
        const _LogoBadge(),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Semantics(
              header: true,
              child: const Text('Sign In to Continue', style: _titleStyle),
            ),
            const Text(
              'Enter your authorized enforcement credentials to begin field '
              'operations.',
              style: _subtitleStyle,
            ),
          ],
        ),
        const _SecurePlatformPill(),
      ],
    );
  }
}

/// White circle with the JRB CHL shield, cropped from the wide logo as in
/// the design.
class _LogoBadge extends StatelessWidget {
  const _LogoBadge();

  static const double _size = 64;

  // Visible window onto the logo, and where the logo sits within it.
  static const Rect _window = Rect.fromLTWH(11.11, 4.89, 41.333, 53.778);
  static const Rect _logo = Rect.fromLTWH(-5.778, -8.002, 131.556, 65.778);

  @override
  Widget build(BuildContext context) {
    final dpr = MediaQuery.devicePixelRatioOf(context);

    return Semantics(
      image: true,
      label: 'JRB CHL Enforcement',
      child: Container(
        width: _size,
        height: _size,
        decoration: const BoxDecoration(
          color: Colors.white,
          shape: BoxShape.circle,
        ),
        child: Stack(
          children: [
            Positioned.fromRect(
              rect: _window,
              child: ClipRect(
                child: Stack(
                  clipBehavior: Clip.none,
                  children: [
                    Positioned.fromRect(
                      rect: _logo,
                      child: Image.asset(
                        AssetPaths.logoWordmark,
                        fit: BoxFit.fill,
                        cacheWidth: (_logo.width * dpr).ceil(),
                        excludeFromSemantics: true,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SecurePlatformPill extends StatelessWidget {
  const _SecurePlatformPill();

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: const BoxConstraints(minWidth: 233),
      // The design's 16 × 5 padding includes the 2 px border, which a
      // Container adds on top of its padding.
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 3),
      decoration: BoxDecoration(
        color: AppColors.statusPillFill,
        border: Border.all(color: AppColors.statusPillBorder, width: 2),
        borderRadius: const BorderRadius.all(Radius.circular(40)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          // Glowing status dot (the design's drop shadow: 3 px spread, 2 px
          // blur deviation).
          Container(
            width: 8,
            height: 8,
            decoration: const BoxDecoration(
              color: AppColors.statusDot,
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: AppColors.statusDotGlow,
                  blurRadius: 4,
                  spreadRadius: 3,
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          const Flexible(
            child: Text(
              'Secure Enforcement Platform',
              style: TextStyle(
                fontFamily: AppTypography.fontFamily,
                fontSize: 12,
                fontWeight: AppTypography.semiBold,
                height: 1.5,
                color: Colors.white,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

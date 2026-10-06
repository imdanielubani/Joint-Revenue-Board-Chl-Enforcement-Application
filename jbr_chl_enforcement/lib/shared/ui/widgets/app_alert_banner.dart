import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../../../core/constants/asset_paths.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';

enum AppAlertKind { error, success }

/// Inline alert ("toast") shown above a form. Announced to screen readers
/// when it appears.
class AppAlertBanner extends StatelessWidget {
  const AppAlertBanner({super.key, required this.kind, required this.message});

  final AppAlertKind kind;
  final String message;

  @override
  Widget build(BuildContext context) {
    final isError = kind == AppAlertKind.error;
    final accent = isError ? AppColors.alertError : AppColors.alertSuccess;

    return Semantics(
      liveRegion: true,
      container: true,
      child: Container(
        constraints: const BoxConstraints(minHeight: 42),
        // 15 + the 1 px border: one pixel inside the design's 16 so its
        // one-line messages stay on one line with Poppins' rendered widths.
        padding: const EdgeInsets.symmetric(horizontal: 15, vertical: 4),
        decoration: BoxDecoration(
          color: isError
              ? AppColors.alertErrorFill
              : AppColors.alertSuccessFill,
          border: Border.all(color: accent),
          borderRadius: const BorderRadius.all(Radius.circular(24)),
        ),
        child: Row(
          children: [
            SizedBox(
              width: 32,
              height: 32,
              child: Center(
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    color: accent,
                    borderRadius: const BorderRadius.all(Radius.circular(6)),
                  ),
                  child: SvgPicture.asset(
                    isError
                        ? AssetPaths.iconWarningCircle
                        : AssetPaths.iconCheckCircle,
                    width: 24,
                    height: 24,
                    excludeFromSemantics: true,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                message,
                style: TextStyle(
                  fontFamily: AppTypography.fontFamily,
                  fontSize: 13,
                  fontWeight: AppTypography.medium,
                  height: 22 / 13,
                  color: isError
                      ? AppColors.alertError
                      : AppColors.alertSuccessText,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../../../core/constants/asset_paths.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';

enum AppAlertKind { error, success }

/// Inline alert ("toast") shown above a form. Announced to screen readers
/// when it appears.
///
/// Errors are kept calm: a barely tinted background, a soft border, an
/// outlined warning icon and deep red text.
class AppAlertBanner extends StatelessWidget {
  const AppAlertBanner({super.key, required this.kind, required this.message});

  final AppAlertKind kind;
  final String message;

  @override
  Widget build(BuildContext context) {
    final isError = kind == AppAlertKind.error;

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
          border: Border.all(
            color: isError
                ? AppColors.alertErrorBorder
                : AppColors.alertSuccess,
          ),
          borderRadius: const BorderRadius.all(Radius.circular(24)),
        ),
        child: Row(
          children: [
            SizedBox(
              width: 32,
              height: 32,
              child: Center(
                child: isError ? const _ErrorIcon() : const _SuccessIcon(),
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
                      ? AppColors.alertErrorText
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

/// Red outlined circle with an exclamation mark.
class _ErrorIcon extends StatelessWidget {
  const _ErrorIcon();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 22,
      height: 22,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        border: Border.all(color: AppColors.alertError, width: 1.5),
      ),
      alignment: Alignment.center,
      child: SvgPicture.asset(
        AssetPaths.iconWarningCircle,
        width: 22,
        height: 22,
        colorFilter: const ColorFilter.mode(
          AppColors.alertError,
          BlendMode.srcIn,
        ),
        excludeFromSemantics: true,
      ),
    );
  }
}

/// White tick on a green rounded square.
class _SuccessIcon extends StatelessWidget {
  const _SuccessIcon();

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: const BoxDecoration(
        color: AppColors.alertSuccess,
        borderRadius: BorderRadius.all(Radius.circular(6)),
      ),
      child: SvgPicture.asset(
        AssetPaths.iconCheckCircle,
        width: 24,
        height: 24,
        excludeFromSemantics: true,
      ),
    );
  }
}

import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';
import 'app_spinner.dart';

/// Colour of a primary [AppButton].
enum AppButtonTone {
  /// Brand green with white text.
  brand,

  /// Red with white text, for account problems.
  danger,

  /// Amber with dark text (white on amber is unreadable), for warnings.
  warning,
}

/// Full-width pill button from the design system.
///
/// [AppButton.primary] is the filled green call to action; [AppButton.text]
/// is the quieter secondary action beneath it. While [isBusy] the button
/// keeps its look but ignores taps; [isLoading] also swaps the label for a
/// spinner, followed by [loadingLabel] when given (primary only). A primary
/// button with no [onPressed] (and not busy) shows the grey disabled style.
class AppButton extends StatelessWidget {
  const AppButton.primary({
    super.key,
    required this.label,
    required this.onPressed,
    this.isBusy = false,
    this.isLoading = false,
    this.loadingLabel,
    this.tone = AppButtonTone.brand,
  }) : _filled = true;

  const AppButton.text({
    super.key,
    required this.label,
    required this.onPressed,
    this.isBusy = false,
  }) : _filled = false,
       isLoading = false,
       loadingLabel = null,
       tone = AppButtonTone.brand;

  static const double height = 54;

  final String label;
  final VoidCallback? onPressed;
  final bool isBusy;
  final bool isLoading;

  /// Text shown beside the spinner while [isLoading], e.g. "Verifying...".
  final String? loadingLabel;

  /// Fill colour of a primary button.
  final AppButtonTone tone;
  final bool _filled;

  static const TextStyle _labelStyle = TextStyle(
    fontFamily: AppTypography.fontFamily,
    fontSize: 15,
    fontWeight: AppTypography.semiBold,
    height: 20.25 / 15,
  );

  static const OutlinedBorder _shape = RoundedRectangleBorder(
    borderRadius: BorderRadius.all(Radius.circular(24)),
  );

  static const EdgeInsets _padding = EdgeInsets.symmetric(
    horizontal: 18,
    vertical: 13,
  );

  @override
  Widget build(BuildContext context) {
    final busy = isBusy || isLoading;
    final callback = busy ? null : onPressed;
    final loadingLabel = this.loadingLabel;
    final Widget child = !isLoading
        ? Text(label, textAlign: TextAlign.center)
        : loadingLabel == null
        ? AppSpinner(semanticLabel: label)
        : Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const AppSpinner(),
              const SizedBox(width: 10),
              Flexible(child: Text(loadingLabel)),
            ],
          );
    final disabled = !busy && onPressed == null;
    final (fill, onFill) = switch (tone) {
      AppButtonTone.brand => (AppColors.green, Colors.white),
      AppButtonTone.danger => (AppColors.fieldError, Colors.white),
      AppButtonTone.warning => (AppColors.amber, AppColors.ink),
    };
    final minimumSize = const Size(double.infinity, height);

    return _filled
        ? FilledButton(
            onPressed: callback,
            style: FilledButton.styleFrom(
              backgroundColor: fill,
              foregroundColor: onFill,
              disabledBackgroundColor: busy
                  ? fill
                  : AppColors.buttonDisabledFill,
              disabledForegroundColor: busy
                  ? onFill
                  : AppColors.buttonDisabledText,
              side: disabled
                  ? const BorderSide(
                      color: AppColors.buttonDisabledBorder,
                      width: 1.5,
                    )
                  : null,
              minimumSize: minimumSize,
              padding: _padding,
              shape: _shape,
              textStyle: _labelStyle,
              elevation: 0,
            ),
            child: child,
          )
        : TextButton(
            onPressed: callback,
            style: TextButton.styleFrom(
              foregroundColor: AppColors.green,
              disabledForegroundColor: busy
                  ? AppColors.green
                  : AppColors.green.withValues(alpha: 0.4),
              minimumSize: minimumSize,
              padding: _padding,
              shape: _shape,
              textStyle: _labelStyle,
            ),
            child: child,
          );
  }
}

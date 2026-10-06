import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';

/// Labelled pill text field from the design system.
///
/// Ink border at rest, green when focused. With an [errorText] the border
/// turns red and the message shows under the field. Text scales with the
/// system setting; the field grows rather than clipping.
class AppTextField extends StatelessWidget {
  const AppTextField({
    super.key,
    required this.label,
    required this.controller,
    required this.iconAsset,
    this.hint,
    this.errorText,
    this.enabled = true,
    this.obscureText = false,
    this.keyboardType,
    this.textInputAction,
    this.autofillHints,
    this.focusNode,
    this.onChanged,
    this.onSubmitted,
    this.suffix,
  });

  final String label;
  final TextEditingController controller;
  final String iconAsset;
  final String? hint;

  /// Shown under the field in red; null when the field is fine.
  final String? errorText;
  final bool enabled;
  final bool obscureText;
  final TextInputType? keyboardType;
  final TextInputAction? textInputAction;
  final Iterable<String>? autofillHints;
  final FocusNode? focusNode;
  final ValueChanged<String>? onChanged;
  final ValueChanged<String>? onSubmitted;

  /// Trailing widget inside the field, e.g. a show/hide toggle.
  final Widget? suffix;

  static const double minHeight = 54;
  static const double _radius = 24;
  static const double _borderWidth = 2;

  static const TextStyle _labelStyle = TextStyle(
    fontFamily: AppTypography.fontFamily,
    fontSize: 13,
    fontWeight: AppTypography.semiBold,
    height: 16.5 / 13,
    color: AppColors.ink,
  );

  static const TextStyle _inputStyle = TextStyle(
    fontFamily: AppTypography.fontFamily,
    fontSize: 15,
    fontWeight: AppTypography.regular,
    height: 1.5,
    color: AppColors.ink,
  );

  static const TextStyle _errorStyle = TextStyle(
    fontFamily: AppTypography.fontFamily,
    fontSize: 12,
    fontWeight: AppTypography.regular,
    height: 16 / 12,
    color: AppColors.fieldErrorText,
  );

  static OutlineInputBorder _border(Color color) => OutlineInputBorder(
    borderRadius: const BorderRadius.all(Radius.circular(_radius)),
    borderSide: BorderSide(color: color, width: _borderWidth),
  );

  @override
  Widget build(BuildContext context) {
    final errorText = this.errorText;
    final hasError = errorText != null;
    final restColor = hasError ? AppColors.fieldError : AppColors.ink;
    final focusColor = hasError ? AppColors.fieldError : AppColors.green;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(label, style: _labelStyle),
        const SizedBox(height: 8),
        TextField(
          controller: controller,
          focusNode: focusNode,
          enabled: enabled,
          obscureText: obscureText,
          enableSuggestions: !obscureText,
          autocorrect: false,
          keyboardType: keyboardType,
          textInputAction: textInputAction,
          autofillHints: autofillHints,
          onChanged: onChanged,
          onSubmitted: onSubmitted,
          inputFormatters: obscureText
              ? null
              : [FilteringTextInputFormatter.deny(RegExp(r'[\n\r]'))],
          style: _inputStyle,
          cursorColor: AppColors.green,
          textAlignVertical: TextAlignVertical.center,
          decoration: InputDecoration(
            isDense: true,
            filled: true,
            fillColor: AppColors.surface,
            hintText: hint,
            hintStyle: _inputStyle.copyWith(color: AppColors.inkMuted),
            constraints: const BoxConstraints(minHeight: minHeight),
            contentPadding: const EdgeInsets.symmetric(vertical: 13),
            prefixIcon: Padding(
              padding: const EdgeInsets.only(left: 16, right: 10),
              child: SvgPicture.asset(
                iconAsset,
                width: 20,
                height: 20,
                excludeFromSemantics: true,
              ),
            ),
            prefixIconConstraints: const BoxConstraints(),
            suffixIcon: suffix == null
                ? null
                : Padding(
                    padding: const EdgeInsets.only(left: 8, right: 14),
                    child: suffix,
                  ),
            suffixIconConstraints: const BoxConstraints(),
            border: _border(restColor),
            enabledBorder: _border(restColor),
            disabledBorder: _border(restColor),
            focusedBorder: _border(focusColor),
          ),
        ),
        if (errorText != null)
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 6, 16, 0),
            child: Semantics(
              liveRegion: true,
              child: Text(errorText, style: _errorStyle),
            ),
          ),
      ],
    );
  }
}

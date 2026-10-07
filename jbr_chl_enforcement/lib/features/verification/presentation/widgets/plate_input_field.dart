import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_typography.dart';
import '../../domain/entities/plate_number.dart';

/// "Vehicle plate" label and a large pill field that formats the plate as
/// it is typed: uppercase, separators removed, letter and digit groups
/// spaced ("abc-123aa" → "ABC 123 AA").
///
/// The border is ink while empty and unfocused, green otherwise.
class PlateInputField extends StatefulWidget {
  const PlateInputField({
    super.key,
    required this.controller,
    this.focusNode,
    this.autofocus = false,
    this.onSubmitted,
  });

  final TextEditingController controller;
  final FocusNode? focusNode;
  final bool autofocus;

  /// Called when the keyboard's done key is pressed.
  final VoidCallback? onSubmitted;

  static const String label = 'Vehicle plate';

  @override
  State<PlateInputField> createState() => _PlateInputFieldState();
}

class _PlateInputFieldState extends State<PlateInputField> {
  FocusNode? _ownFocusNode;

  FocusNode get _focusNode =>
      widget.focusNode ?? (_ownFocusNode ??= FocusNode());

  static const double _radius = 24;
  static const double _borderWidth = 2;

  static const TextStyle _labelStyle = TextStyle(
    fontFamily: AppTypography.fontFamily,
    fontSize: 13,
    fontWeight: AppTypography.semiBold,
    height: 16.5 / 13,
    color: AppColors.forest,
  );

  static const TextStyle _plateStyle = TextStyle(
    fontFamily: AppTypography.fontFamily,
    fontSize: 22,
    fontWeight: AppTypography.bold,
    height: 1.5,
    letterSpacing: 1.32,
    color: AppColors.forest,
  );

  static OutlineInputBorder _border(Color color) => OutlineInputBorder(
    borderRadius: const BorderRadius.all(Radius.circular(_radius)),
    borderSide: BorderSide(color: color, width: _borderWidth),
    // No floating label, so no gap; otherwise the text shifts 4 px right.
    gapPadding: 0,
  );

  @override
  void initState() {
    super.initState();
    _focusNode.addListener(_refresh);
    widget.controller.addListener(_refresh);
  }

  @override
  void didUpdateWidget(PlateInputField oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.controller != widget.controller) {
      oldWidget.controller.removeListener(_refresh);
      widget.controller.addListener(_refresh);
    }
    if (oldWidget.focusNode != widget.focusNode) {
      (oldWidget.focusNode ?? _ownFocusNode)?.removeListener(_refresh);
      _focusNode.addListener(_refresh);
    }
  }

  @override
  void dispose() {
    widget.controller.removeListener(_refresh);
    _focusNode.removeListener(_refresh);
    _ownFocusNode?.dispose();
    super.dispose();
  }

  void _refresh() => setState(() {});

  @override
  Widget build(BuildContext context) {
    final active = _focusNode.hasFocus || widget.controller.text.isNotEmpty;
    final border = _border(active ? AppColors.green : AppColors.ink);

    // Merged so screen readers announce the label with the field.
    return MergeSemantics(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisSize: MainAxisSize.min,
        children: [
          const Text(PlateInputField.label, style: _labelStyle),
          const SizedBox(height: 8),
          TextField(
            controller: widget.controller,
            focusNode: _focusNode,
            autofocus: widget.autofocus,
            keyboardType: TextInputType.text,
            textCapitalization: TextCapitalization.characters,
            textInputAction: TextInputAction.done,
            autocorrect: false,
            enableSuggestions: false,
            inputFormatters: const [PlateNumberFormatter()],
            onSubmitted: (_) => widget.onSubmitted?.call(),
            style: _plateStyle,
            cursorColor: AppColors.green,
            textAlignVertical: TextAlignVertical.center,
            decoration: InputDecoration(
              isDense: true,
              filled: true,
              fillColor: AppColors.surface,
              constraints: const BoxConstraints(minHeight: 54),
              // Text starts 16 px inside the 2 px border.
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 16 + _borderWidth,
                vertical: 13,
              ),
              border: border,
              enabledBorder: border,
              focusedBorder: border,
            ),
          ),
        ],
      ),
    );
  }
}

/// Formats plate input as it is typed (see [PlateNumber]): uppercase,
/// separators dropped, letter and digit runs spaced, and at most
/// [PlateNumber.maxLength] characters. The cursor stays beside the same
/// character, and backspacing over a space deletes the character before it.
class PlateNumberFormatter extends TextInputFormatter {
  const PlateNumberFormatter();

  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    var canonical = PlateNumber.compact(newValue.text);
    final cursor = newValue.selection.isValid
        ? newValue.selection.extentOffset
        : newValue.text.length;
    var before = PlateNumber.compact(newValue.text.substring(0, cursor)).length;

    // Only a separator was deleted (e.g. backspace over a space): delete the
    // character before it instead, as the space would come straight back.
    final onlySeparatorRemoved =
        newValue.text.length < oldValue.text.length &&
        canonical == PlateNumber.compact(oldValue.text);
    if (onlySeparatorRemoved && newValue.selection.isCollapsed && before > 0) {
      canonical =
          canonical.substring(0, before - 1) + canonical.substring(before);
      before--;
    }

    if (canonical.length > PlateNumber.maxLength) return oldValue;

    final text = PlateNumber.group(canonical);
    var offset = 0;
    for (var seen = 0; seen < before; offset++) {
      if (text[offset] != ' ') seen++;
    }
    return TextEditingValue(
      text: text,
      selection: TextSelection.collapsed(offset: offset),
    );
  }
}

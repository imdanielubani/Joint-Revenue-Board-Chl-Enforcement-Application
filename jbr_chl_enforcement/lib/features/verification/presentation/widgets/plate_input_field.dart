import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_typography.dart';
import '../../domain/entities/plate_number.dart';

/// "Vehicle plate" label and a large pill field that formats the plate as
/// it is typed: uppercase, separators removed, and spaced 3-3-2 as each
/// group is completed ("abc" → "ABC ", "abc-123aa" → "ABC 123 AA").
/// Grey dashes show the characters of
/// a standard plate still to type (`--- --- --`).
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

  /// Text starts 16 px inside the 2 px border.
  static const double _textInset = 16 + _borderWidth;

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
          Stack(
            children: [
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
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: _textInset,
                    vertical: 13,
                  ),
                  border: border,
                  enabledBorder: border,
                  focusedBorder: border,
                ),
              ),
              Positioned.fill(
                left: _textInset,
                right: _textInset,
                child: _SlotGuide(
                  text: widget.controller.text,
                  style: _plateStyle,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// Dashes for the characters of a standard plate still to be typed, drawn
/// in grey right after the typed text: `AB` shows `AB- --- --`.
///
/// Each dash is a short bar centred in a slot one character wide, so the
/// gaps are even and the finished guide is as long as a real plate.
/// Visual only: it ignores taps and screen readers. Hidden for plates that
/// do not follow the standard pattern, and when the whole guide would not
/// fit (very large text), so it never misaligns with the field's text.
class _SlotGuide extends StatelessWidget {
  const _SlotGuide({required this.text, required this.style});

  final String text;
  final TextStyle style;

  double _measure(String sample, TextScaler textScaler) {
    final painter = TextPainter(
      text: TextSpan(text: sample, style: style),
      textDirection: TextDirection.ltr,
      textScaler: textScaler,
      maxLines: 1,
    )..layout();
    final width = painter.width;
    painter.dispose();
    return width;
  }

  @override
  Widget build(BuildContext context) {
    final remaining = PlateNumber.remainingMask(PlateNumber.compact(text));
    if (remaining.isEmpty) return const SizedBox.shrink();

    final textScaler = MediaQuery.textScalerOf(context);
    // Average character of a standard plate, and the gap between groups,
    // as the field draws them (letter spacing included).
    final slotWidth = _measure('ABC123AA', textScaler) / 8;
    final spaceWidth = _measure(' ', textScaler);
    final fontSize = textScaler.scale(style.fontSize!);
    final typedWidth = text.isEmpty ? 0.0 : _measure(text, textScaler);

    var guideWidth = typedWidth;
    for (final char in remaining.split('')) {
      guideWidth += char == ' ' ? spaceWidth : slotWidth;
    }

    final bar = Container(
      width: slotWidth * 0.5,
      height: (fontSize * 0.11).clamp(2.0, 6.0),
      decoration: const BoxDecoration(
        color: AppColors.plateGuide,
        borderRadius: BorderRadius.all(Radius.circular(2)),
      ),
    );

    return IgnorePointer(
      child: ExcludeSemantics(
        child: LayoutBuilder(
          builder: (context, constraints) {
            if (guideWidth > constraints.maxWidth) {
              return const SizedBox.shrink();
            }
            return Row(
              children: [
                SizedBox(width: typedWidth),
                for (final char in remaining.split(''))
                  char == ' '
                      ? SizedBox(width: spaceWidth)
                      : SizedBox(
                          width: slotWidth,
                          child: Center(child: bar),
                        ),
              ],
            );
          },
        ),
      ),
    );
  }
}

/// Formats plate input as it is typed (see [PlateNumber.formatForInput]):
/// uppercase, separators dropped, a standard plate spaced 3-3-2 as each
/// group is completed (other plates by letter and digit runs), and at most
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

    final text = PlateNumber.formatForInput(canonical);
    var offset = 0;
    for (var seen = 0; seen < before; offset++) {
      if (text[offset] != ' ') seen++;
    }
    // Typing at the end: step past the space that opens the next group.
    if (before == canonical.length) offset = text.length;
    return TextEditingValue(
      text: text,
      selection: TextSelection.collapsed(offset: offset),
    );
  }
}

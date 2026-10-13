import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../../../core/constants/asset_paths.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';
import '../widgets/ring_spinner.dart';

/// Floating card for a short decision or status ("Sign out of JRB CHL?",
/// "Synchronizing records"): drag handle, close button, an icon on a tinted
/// disc, a small eyebrow, the title and message, optional [details] panels
/// and the [actions] (see [StatusModalButton]). Open it with `showAppSheet`.
class StatusModal extends StatelessWidget {
  const StatusModal({
    super.key,
    required this.iconAsset,
    required this.eyebrow,
    required this.title,
    required this.message,
    required this.actions,
    required this.onClose,
    this.closeLabel = 'Close',
    this.haloColor = AppColors.greenTint,
    this.spinning = false,
    this.details = const [],
  });

  /// 32 px icon on the 64 px disc.
  final String iconAsset;
  final Color haloColor;

  /// Turns a ring round the disc while something is in progress.
  final bool spinning;

  final String eyebrow;
  final String title;
  final String message;

  /// Panels under the message, e.g. [StatusDetailList].
  final List<Widget> details;

  /// Buttons, stacked full width.
  final List<Widget> actions;

  final VoidCallback onClose;

  /// Read by screen readers for the close button.
  final String closeLabel;

  /// Widest the card grows on tablets.
  static const double maxWidth = 420;

  /// Space between the card and the bottom of the screen. The iPhone home
  /// indicator only fills the lower part of its inset, so the card may sit
  /// 15 px into it, as designed; other phones keep clear of the whole inset
  /// (e.g. Android's navigation buttons).
  static double bottomMargin(BuildContext context) {
    final inset = MediaQuery.viewPaddingOf(context).bottom;
    final usable = Theme.of(context).platform == TargetPlatform.iOS
        ? inset - 15
        : inset;
    return math.max(12, usable);
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      bottom: false,
      child: Padding(
        padding: EdgeInsets.fromLTRB(12, 0, 12, bottomMargin(context)),
        child: Center(
          heightFactor: 1,
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: maxWidth),
            child: DecoratedBox(
              decoration: const BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.all(Radius.circular(28)),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.signOutShadow,
                    offset: Offset(0, 18),
                    blurRadius: 60,
                  ),
                ],
              ),
              child: Stack(
                children: [
                  Padding(
                    padding: const EdgeInsets.fromLTRB(22, 18, 22, 24),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 40,
                          height: 5,
                          decoration: const BoxDecoration(
                            color: AppColors.signOutHandle,
                            borderRadius: BorderRadius.all(Radius.circular(5)),
                          ),
                        ),
                        // Scrolls when the screen is too short for the card
                        // (small phones in landscape, large text).
                        Flexible(
                          child: SingleChildScrollView(child: _content()),
                        ),
                      ],
                    ),
                  ),
                  Positioned(
                    top: 26,
                    right: 12,
                    child: _CloseButton(label: closeLabel, onPressed: onClose),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _content() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // 30 below the handle's top, as designed.
        const SizedBox(height: 25),
        Center(
          child: SizedBox.square(
            dimension: 63.984,
            child: Stack(
              clipBehavior: Clip.none,
              alignment: Alignment.center,
              children: [
                if (spinning)
                  const Positioned(
                    left: -5.008,
                    top: -5.008,
                    child: RingSpinner(
                      diameter: 74,
                      trackColor: AppColors.syncRing,
                    ),
                  ),
                Container(
                  decoration: BoxDecoration(
                    color: haloColor,
                    shape: BoxShape.circle,
                  ),
                  alignment: Alignment.center,
                  child: SvgPicture.asset(
                    iconAsset,
                    width: 31.9922,
                    height: 31.9922,
                    excludeFromSemantics: true,
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 8),
        Text(
          eyebrow,
          textAlign: TextAlign.center,
          style: const TextStyle(
            fontFamily: AppTypography.fontFamily,
            fontSize: 12,
            fontWeight: AppTypography.semiBold,
            letterSpacing: 0.3,
            height: 1.5,
            color: AppColors.moss,
          ),
        ),
        const SizedBox(height: 10),
        // Announced when the card changes to another state.
        Semantics(
          header: true,
          liveRegion: true,
          child: Text(
            title,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontFamily: AppTypography.fontFamily,
              fontSize: 23,
              fontWeight: AppTypography.bold,
              letterSpacing: -0.575,
              height: 28.75 / 23,
              color: AppColors.forest,
            ),
          ),
        ),
        const SizedBox(height: 12.25),
        Text(
          message,
          textAlign: TextAlign.center,
          style: const TextStyle(
            fontFamily: AppTypography.fontFamily,
            fontSize: 14,
            fontWeight: AppTypography.regular,
            letterSpacing: 0,
            height: 1.6,
            color: AppColors.signOutBody,
          ),
        ),
        for (var i = 0; i < details.length; i++) ...[
          SizedBox(height: i == 0 ? 20 : 18),
          details[i],
        ],
        const SizedBox(height: 22),
        for (var i = 0; i < actions.length; i++) ...[
          if (i > 0) const SizedBox(height: 10),
          actions[i],
        ],
      ],
    );
  }
}

/// Colours of a [StatusDetailList] or [StatusNote].
enum StatusTone {
  /// Green on pale green.
  positive,

  /// Red on pale red.
  danger,

  /// Grey-green on pale green (e.g. offline).
  muted,
}

extension on StatusTone {
  Color get background => switch (this) {
    StatusTone.danger => AppColors.destructiveTint,
    _ => AppColors.greenTint,
  };

  Color get text => switch (this) {
    StatusTone.positive => AppColors.green,
    StatusTone.danger => AppColors.destructive,
    StatusTone.muted => AppColors.moss,
  };

  Color get divider => switch (this) {
    StatusTone.danger => AppColors.destructiveDivider,
    _ => AppColors.syncDivider,
  };
}

const TextStyle _detailStyle = TextStyle(
  fontFamily: AppTypography.fontFamily,
  fontSize: 12,
  letterSpacing: 0,
  height: 1.6,
);

/// Label / value rows on a tinted panel, e.g. "Connection · Online".
class StatusDetailList extends StatelessWidget {
  const StatusDetailList({
    super.key,
    required this.rows,
    this.tone = StatusTone.positive,
  });

  final List<(String, String)> rows;
  final StatusTone tone;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
      decoration: BoxDecoration(
        color: tone.background,
        borderRadius: const BorderRadius.all(Radius.circular(16)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          for (var i = 0; i < rows.length; i++)
            Semantics(
              container: true,
              label: '${rows[i].$1}: ${rows[i].$2}',
              excludeSemantics: true,
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 11),
                decoration: i < rows.length - 1
                    ? BoxDecoration(
                        border: Border(
                          bottom: BorderSide(color: tone.divider, width: 1.5),
                        ),
                      )
                    : null,
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      rows[i].$1,
                      style: _detailStyle.copyWith(
                        fontWeight: AppTypography.regular,
                        color: tone.text,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        rows[i].$2,
                        textAlign: TextAlign.end,
                        style: _detailStyle.copyWith(
                          fontWeight: AppTypography.semiBold,
                          color: tone.text,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// A one-line status on a tinted panel, e.g. "Pending · awaiting
/// acknowledgement".
class StatusNote extends StatelessWidget {
  const StatusNote({
    super.key,
    required this.text,
    this.tone = StatusTone.positive,
  });

  final String text;
  final StatusTone tone;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: tone.background,
        borderRadius: const BorderRadius.all(Radius.circular(16)),
      ),
      child: Text(
        text,
        textAlign: TextAlign.center,
        style: _detailStyle.copyWith(
          fontWeight: AppTypography.regular,
          color: tone.text,
        ),
      ),
    );
  }
}

/// 52 px pill button for a [StatusModal]: filled, or outlined in black.
class StatusModalButton extends StatelessWidget {
  const StatusModalButton.filled({
    super.key,
    required this.label,
    required this.onPressed,
    this.color = AppColors.green,
    this.bold = false,
  }) : outlined = false;

  const StatusModalButton.outlined({
    super.key,
    required this.label,
    required this.onPressed,
  }) : outlined = true,
       color = AppColors.surface,
       bold = false;

  final String label;

  /// Null shows the button disabled.
  final VoidCallback? onPressed;
  final Color color;
  final bool outlined;

  /// Bold label instead of semi-bold.
  final bool bold;

  @override
  Widget build(BuildContext context) {
    final enabled = onPressed != null;
    return TextButton(
      onPressed: onPressed,
      style: TextButton.styleFrom(
        minimumSize: const Size(double.infinity, 52),
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 13),
        backgroundColor: color,
        foregroundColor: outlined ? Colors.black : Colors.white,
        // The app's grey disabled style (as on AppButton).
        disabledBackgroundColor: outlined
            ? AppColors.surface
            : AppColors.buttonDisabledFill,
        disabledForegroundColor: AppColors.buttonDisabledText,
        shape: RoundedRectangleBorder(
          borderRadius: const BorderRadius.all(Radius.circular(28)),
          side: !enabled
              ? const BorderSide(
                  color: AppColors.buttonDisabledBorder,
                  width: 1.5,
                )
              : outlined
              ? const BorderSide(width: 1.5)
              : BorderSide.none,
        ),
        textStyle: TextStyle(
          fontFamily: AppTypography.fontFamily,
          fontSize: 14,
          fontWeight: bold ? AppTypography.bold : AppTypography.semiBold,
          letterSpacing: 0,
          height: 18.9 / 14,
        ),
      ),
      child: Text(label, textAlign: TextAlign.center),
    );
  }
}

class _CloseButton extends StatelessWidget {
  const _CloseButton({required this.label, required this.onPressed});

  final String label;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: label,
      // Excluding the children drops their tap, so it is declared here.
      onTap: onPressed,
      excludeSemantics: true,
      child: InkResponse(
        onTap: onPressed,
        radius: 24,
        child: SizedBox(
          width: 48,
          height: 48,
          child: Center(
            child: SvgPicture.asset(
              AssetPaths.iconDialogClose,
              width: 20,
              height: 20,
              excludeFromSemantics: true,
            ),
          ),
        ),
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../../../../core/constants/asset_paths.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_typography.dart';

const TextStyle _titleStyle = TextStyle(
  fontFamily: AppTypography.fontFamily,
  fontSize: 14,
  fontWeight: AppTypography.semiBold,
  letterSpacing: 0,
  height: 1.5,
  color: AppColors.forest,
);

const TextStyle _subtitleStyle = TextStyle(
  fontFamily: AppTypography.fontFamily,
  fontSize: 12,
  fontWeight: AppTypography.regular,
  letterSpacing: 0,
  height: 1.6,
  color: AppColors.sage,
);

/// A row in a [SettingsSection]: round icon, title and a line under it,
/// and on the right a chevron (or [trailing]). Tapping runs [onTap].
class SettingsTile extends StatelessWidget {
  const SettingsTile({
    super.key,
    required this.iconAsset,
    required this.title,
    required this.subtitle,
    required this.onTap,
    this.trailing,
    this.semanticValue,
    this.toggled,
  });

  final String iconAsset;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  /// Replaces the chevron (e.g. a switch).
  final Widget? trailing;

  /// Read after the title and subtitle by screen readers (e.g. "On").
  final String? semanticValue;

  /// Set for a switch row, so screen readers announce it as a toggle.
  final bool? toggled;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      container: true,
      button: toggled == null,
      toggled: toggled,
      label: '$title. $subtitle',
      value: semanticValue,
      excludeSemantics: true,
      child: InkWell(
        onTap: onTap,
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 80),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 17),
            child: Row(
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: const BoxDecoration(
                    color: AppColors.iconWell,
                    shape: BoxShape.circle,
                  ),
                  alignment: Alignment.center,
                  child: SvgPicture.asset(
                    iconAsset,
                    width: 18.9844,
                    height: 18.9844,
                    excludeFromSemantics: true,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(title, style: _titleStyle),
                      const SizedBox(height: 5),
                      Text(subtitle, style: _subtitleStyle),
                    ],
                  ),
                ),
                const SizedBox(width: 10),
                trailing ??
                    SvgPicture.asset(
                      AssetPaths.iconRowChevron,
                      width: 16.9922,
                      height: 16.9922,
                      excludeFromSemantics: true,
                    ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// A [SettingsTile] with an On / Off switch. Tapping anywhere on the row
/// calls [onChanged] with the opposite of [value].
class SettingsSwitchTile extends StatelessWidget {
  const SettingsSwitchTile({
    super.key,
    required this.iconAsset,
    required this.title,
    required this.subtitle,
    required this.value,
    required this.onChanged,
  });

  final String iconAsset;
  final String title;
  final String subtitle;
  final bool value;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    return SettingsTile(
      iconAsset: iconAsset,
      title: title,
      subtitle: subtitle,
      onTap: () => onChanged(!value),
      toggled: value,
      semanticValue: value ? 'On' : 'Off',
      trailing: SizedBox(
        width: 48,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              value ? 'On' : 'Off',
              style: const TextStyle(
                fontFamily: AppTypography.fontFamily,
                fontSize: 11,
                fontWeight: AppTypography.regular,
                letterSpacing: 0,
                height: 1.5,
                color: AppColors.sage,
              ),
            ),
            const SizedBox(height: 5),
            _Switch(on: value),
          ],
        ),
      ),
    );
  }
}

/// The 44 × 26 switch: green with the knob right when on, pale with the
/// knob left when off.
class _Switch extends StatelessWidget {
  const _Switch({required this.on});

  final bool on;

  @override
  Widget build(BuildContext context) {
    final duration = MediaQuery.disableAnimationsOf(context)
        ? Duration.zero
        : const Duration(milliseconds: 150);
    return AnimatedContainer(
      duration: duration,
      width: 43.992,
      height: 25.992,
      padding: const EdgeInsets.all(3),
      decoration: BoxDecoration(
        color: on ? AppColors.green : AppColors.switchOffTrack,
        border: Border.all(
          color: on ? AppColors.green : AppColors.switchOffBorder,
          width: 1.5,
        ),
        borderRadius: const BorderRadius.all(Radius.circular(20)),
      ),
      child: AnimatedAlign(
        duration: duration,
        alignment: on ? Alignment.centerRight : Alignment.centerLeft,
        child: Container(
          width: 18,
          height: 18,
          decoration: const BoxDecoration(
            color: Colors.white,
            shape: BoxShape.circle,
            boxShadow: [
              BoxShadow(
                color: Color(0x21000000),
                offset: Offset(0, 1),
                blurRadius: 3,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// A short text link row ("Review access details") with a chevron.
class SettingsLinkRow extends StatelessWidget {
  const SettingsLinkRow({super.key, required this.label, required this.onTap});

  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      container: true,
      button: true,
      label: label,
      excludeSemantics: true,
      child: InkWell(
        onTap: onTap,
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 48),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 10),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    label,
                    style: const TextStyle(
                      fontFamily: AppTypography.fontFamily,
                      fontSize: 12,
                      fontWeight: AppTypography.regular,
                      letterSpacing: 0,
                      color: AppColors.forest,
                    ),
                  ),
                ),
                SvgPicture.asset(
                  AssetPaths.iconRowChevronDark,
                  width: 16.9922,
                  height: 16.9922,
                  excludeFromSemantics: true,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

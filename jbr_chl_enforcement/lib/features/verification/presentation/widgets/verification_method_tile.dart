import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../../../../core/constants/asset_paths.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_typography.dart';
import 'verification_page.dart';

/// One way of identifying a vehicle, shown as a tappable card.
@immutable
class VerificationOption {
  const VerificationOption({
    required this.iconAsset,
    required this.title,
    required this.description,
    required this.onSelected,
  });

  final String iconAsset;
  final String title;
  final String description;
  final VoidCallback onSelected;
}

/// "Verification" page: heading, short description and a card per method.
class VerificationMethodPage extends StatelessWidget {
  const VerificationMethodPage({
    super.key,
    required this.heading,
    required this.description,
    required this.options,
  });

  final String heading;
  final String description;
  final List<VerificationOption> options;

  @override
  Widget build(BuildContext context) {
    return VerificationPageScaffold(
      title: 'Verification',
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
        children: [
          VerificationContentWidth(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                VerificationHeading(heading: heading, description: description),
                const SizedBox(height: 14),
                for (final option in options)
                  Padding(
                    padding: const EdgeInsets.only(top: 16),
                    child: VerificationMethodTile(option: option),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Card with a round icon, title, description and a chevron.
class VerificationMethodTile extends StatelessWidget {
  const VerificationMethodTile({super.key, required this.option});

  final VerificationOption option;

  static const BorderRadius _radius = BorderRadius.all(Radius.circular(16));

  static const double _border = 1.5;

  /// Keeps hyphenated words such as "E-Tag" on one line (U+2060 word
  /// joiner after each hyphen).
  static String _unbreakableHyphens(String text) =>
      text.replaceAll('-', '-\u2060');

  @override
  Widget build(BuildContext context) {
    return Semantics(
      container: true,
      button: true,
      label: '${option.title}. ${option.description}',
      excludeSemantics: true,
      child: Material(
        color: Colors.white,
        shape: const RoundedRectangleBorder(
          side: BorderSide(color: AppColors.cardBorder, width: _border),
          borderRadius: _radius,
        ),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: option.onSelected,
          child: ConstrainedBox(
            constraints: const BoxConstraints(minHeight: 106),
            child: Padding(
              // The border is drawn over the padding, so it is added to it.
              padding: const EdgeInsets.symmetric(
                horizontal: 16 + _border,
                vertical: 18 + _border,
              ),
              child: Row(
                children: [
                  Container(
                    width: 46,
                    height: 46,
                    decoration: const BoxDecoration(
                      color: AppColors.mint,
                      shape: BoxShape.circle,
                    ),
                    alignment: Alignment.center,
                    child: SvgPicture.asset(
                      option.iconAsset,
                      width: 24,
                      height: 24,
                      excludeFromSemantics: true,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          option.title,
                          style: const TextStyle(
                            fontFamily: AppTypography.fontFamily,
                            fontSize: 15,
                            fontWeight: AppTypography.bold,
                            height: 1.5,
                            color: AppColors.forest,
                          ),
                        ),
                        Padding(
                          padding: const EdgeInsets.only(top: 5),
                          child: Text(
                            _unbreakableHyphens(option.description),
                            style: const TextStyle(
                              fontFamily: AppTypography.fontFamily,
                              fontSize: 12,
                              fontWeight: AppTypography.regular,
                              height: 20.15 / 12,
                              color: AppColors.inkHalf,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  // No gap: the chevron's own artwork leaves 9 px of space,
                  // giving the text the design's 241 px.
                  SvgPicture.asset(
                    AssetPaths.iconChevronRight,
                    width: 24,
                    height: 24,
                    excludeFromSemantics: true,
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

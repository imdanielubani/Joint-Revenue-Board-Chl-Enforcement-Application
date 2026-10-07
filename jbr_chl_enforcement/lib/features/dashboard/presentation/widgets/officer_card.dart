import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../../../../core/constants/asset_paths.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../auth/domain/entities/officer.dart';

/// "Welcome back" card with the officer's initials, name, region and role.
class OfficerCard extends StatelessWidget {
  const OfficerCard({super.key, required this.officer});

  final Officer? officer;

  static const TextStyle _welcomeStyle = TextStyle(
    fontFamily: AppTypography.fontFamily,
    fontSize: 12,
    fontWeight: AppTypography.medium,
    height: 19.5 / 12,
    color: AppColors.ink,
  );

  static const TextStyle _nameStyle = TextStyle(
    fontFamily: AppTypography.fontFamily,
    fontSize: 18,
    fontWeight: AppTypography.bold,
    height: 26 / 20,
    color: AppColors.forest,
  );

  static const TextStyle _postStyle = TextStyle(
    fontFamily: AppTypography.fontFamily,
    fontSize: 10,
    fontWeight: AppTypography.regular,
    height: 18 / 12,
    color: AppColors.green,
  );

  @override
  Widget build(BuildContext context) {
    final officer = this.officer;
    final post = [
      if (officer?.region case final region? when region.isNotEmpty) region,
      if (officer?.role case final role? when role.isNotEmpty) role,
    ].join(' · ');

    return Container(
      constraints: const BoxConstraints(minHeight: 96),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: AppColors.cardBorder, width: 1.5),
        borderRadius: const BorderRadius.all(Radius.circular(16)),
      ),
      child: Row(
        children: [
          // Avatar: green disc with a 4 px dark forest ring, which overlaps
          // the card padding as designed.
          Container(
            width: 60,
            height: 60,
            decoration: const BoxDecoration(
              color: AppColors.green,
              shape: BoxShape.circle,
              boxShadow: [BoxShadow(color: AppColors.forest, spreadRadius: 4)],
            ),
            alignment: Alignment.center,
            child: ExcludeSemantics(
              child: Text(
                officer?.initials ?? '',
                style: const TextStyle(
                  fontFamily: AppTypography.fontFamily,
                  fontSize: 20,
                  fontWeight: AppTypography.bold,
                  color: Colors.white,
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Welcome back,', style: _welcomeStyle),
                Padding(
                  padding: const EdgeInsets.only(top: 2),
                  child: Text(
                    officer?.name ?? '',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: _nameStyle,
                  ),
                ),
                if (post.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Row(
                      children: [
                        SvgPicture.asset(
                          AssetPaths.iconPin,
                          width: 14,
                          height: 14,
                          excludeFromSemantics: true,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            post,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: _postStyle,
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

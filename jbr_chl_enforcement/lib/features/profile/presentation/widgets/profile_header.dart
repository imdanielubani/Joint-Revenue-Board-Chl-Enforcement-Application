import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../../../../core/constants/asset_paths.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../shared/ui/widgets/initials_avatar.dart';
import '../../../auth/domain/entities/officer.dart';

/// The officer's card at the top of Profile: avatar, name, region · agent
/// ID and role. Tapping opens the account details.
class ProfileHeaderCard extends StatelessWidget {
  const ProfileHeaderCard({
    super.key,
    required this.officer,
    required this.onTap,
  });

  final Officer? officer;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final officer = this.officer;
    final post = [
      if (officer?.region case final region? when region.isNotEmpty) region,
      if (officer?.agentId case final id? when id.isNotEmpty) id,
    ].join(' · ');
    final role = officer?.role ?? '';

    return Semantics(
      container: true,
      button: true,
      label: [
        officer?.name ?? '',
        post,
        role,
        'Account details',
      ].where((part) => part.isNotEmpty).join(', '),
      // Excluding the children drops their tap, so it is declared here.
      onTap: onTap,
      excludeSemantics: true,
      child: Material(
        color: Colors.white,
        shape: const RoundedRectangleBorder(
          side: BorderSide(color: AppColors.cardBorder, width: 1.5),
          borderRadius: BorderRadius.all(Radius.circular(16)),
        ),
        // The avatar's ring sits over the card padding, so no clipping.
        child: InkWell(
          onTap: onTap,
          borderRadius: const BorderRadius.all(Radius.circular(16)),
          child: ConstrainedBox(
            constraints: const BoxConstraints(minHeight: 96),
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Row(
                children: [
                  InitialsAvatar(
                    initials: officer?.initials ?? '',
                    size: 60,
                    fontSize: 28,
                  ),
                  const SizedBox(width: 18),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          officer?.name ?? '',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontFamily: AppTypography.fontFamily,
                            fontSize: 25,
                            fontWeight: AppTypography.bold,
                            letterSpacing: 0,
                            height: 26 / 25,
                            color: AppColors.forest,
                          ),
                        ),
                        if (post.isNotEmpty)
                          Text(
                            post,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontFamily: AppTypography.fontFamily,
                              fontSize: 14,
                              fontWeight: AppTypography.regular,
                              letterSpacing: 0,
                              height: 1.5,
                              color: AppColors.green,
                            ),
                          ),
                        if (role.isNotEmpty)
                          Text(
                            role,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontFamily: AppTypography.fontFamily,
                              fontSize: 12,
                              fontWeight: AppTypography.regular,
                              letterSpacing: 0,
                              height: 1.75,
                              color: AppColors.ink,
                            ),
                          ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 18),
                  SvgPicture.asset(
                    AssetPaths.iconChevronLarge,
                    width: 19.9922,
                    height: 19.9922,
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

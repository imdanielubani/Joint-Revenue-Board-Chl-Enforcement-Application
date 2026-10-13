import 'package:flutter/material.dart';
import 'package:skeletonizer/skeletonizer.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';

/// A loading line ("Loading your notifications…") over placeholder cards
/// whose bars pulse (they hold still when the system asks for reduced
/// motion). Used while a list loads.
class CardListSkeleton extends StatelessWidget {
  const CardListSkeleton({super.key, required this.label, this.cardCount = 4});

  final String label;
  final int cardCount;

  @override
  Widget build(BuildContext context) {
    final effect = MediaQuery.disableAnimationsOf(context)
        ? const SolidColorEffect(color: AppColors.skeletonBone)
        : const PulseEffect(
            from: AppColors.skeletonBone,
            to: AppColors.skeletonBoneLight,
          );

    return Semantics(
      liveRegion: true,
      label: label,
      excludeSemantics: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.only(top: 16),
            child: Text(
              label,
              style: const TextStyle(
                fontFamily: AppTypography.fontFamily,
                fontSize: 12,
                fontWeight: AppTypography.regular,
                letterSpacing: 0,
                height: 1.5,
                color: AppColors.inkMuted,
              ),
            ),
          ),
          // Only the bars are shaded; the cards stay as drawn.
          Skeletonizer.zone(
            effect: effect,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                for (var i = 0; i < cardCount; i++) ...[
                  if (i > 0) const SizedBox(height: 14),
                  const _SkeletonCard(),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SkeletonCard extends StatelessWidget {
  const _SkeletonCard();

  static const BorderRadius _radius = BorderRadius.all(Radius.circular(6));

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Container(
        height: 107,
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Colors.white,
          border: Border.all(color: AppColors.cardBorder, width: 1.5),
          borderRadius: const BorderRadius.all(Radius.circular(16)),
        ),
        child: LayoutBuilder(
          builder: (context, constraints) => Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 10),
              // 293 of 315 px, and 124, on a 390 px wide phone.
              Bone(
                width: constraints.maxWidth * 0.929,
                height: 12,
                borderRadius: _radius,
              ),
              const SizedBox(height: 10),
              Bone(
                width: constraints.maxWidth * 0.392,
                height: 25,
                borderRadius: _radius,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

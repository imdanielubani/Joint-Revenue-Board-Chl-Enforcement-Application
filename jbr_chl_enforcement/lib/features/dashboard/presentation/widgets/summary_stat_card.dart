import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../../../../core/constants/asset_paths.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_typography.dart';
import '../../domain/entities/dashboard_summary.dart';

/// The four "Daily activity" cards in a 2 × 2 grid.
class DailyActivityGrid extends StatelessWidget {
  const DailyActivityGrid({super.key, required this.summary});

  final DashboardSummary summary;

  @override
  Widget build(BuildContext context) {
    final cards = [
      SummaryStatCard(
        title: 'Total Verifications',
        value: summary.totalVerifications,
        caption: 'Recorded attempts',
        iconAsset: AssetPaths.iconScans,
        iconBackground: AppColors.activityScans,
      ),
      SummaryStatCard(
        title: 'Active Trips',
        value: summary.activeTrips,
        caption: 'Active-trip results',
        iconAsset: AssetPaths.iconTick,
        iconBackground: AppColors.activityActive,
      ),
      SummaryStatCard(
        title: 'No Active Trips',
        value: summary.noActiveTrips,
        caption: 'No-active-trip results',
        iconAsset: AssetPaths.iconClock,
        iconBackground: AppColors.activityNoActive,
      ),
      SummaryStatCard(
        title: 'Violations Issued',
        value: summary.violationsIssued,
        caption: 'Acknowledged cases',
        iconAsset: AssetPaths.iconIssues,
        iconBackground: AppColors.activityViolations,
      ),
    ];

    Widget row(Widget left, Widget right) => IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Expanded(child: left),
          const SizedBox(width: 7),
          Expanded(child: right),
        ],
      ),
    );

    return Column(
      children: [
        row(cards[0], cards[1]),
        const SizedBox(height: 7),
        row(cards[2], cards[3]),
      ],
    );
  }
}

/// Title, big number and caption, with a round icon badge top-right.
class SummaryStatCard extends StatelessWidget {
  const SummaryStatCard({
    super.key,
    required this.title,
    required this.value,
    required this.caption,
    required this.iconAsset,
    required this.iconBackground,
  });

  final String title;
  final int value;
  final String caption;
  final String iconAsset;
  final Color iconBackground;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      container: true,
      label: '$title: $value. $caption',
      excludeSemantics: true,
      child: Container(
        constraints: const BoxConstraints(minHeight: 116),
        padding: const EdgeInsets.fromLTRB(12, 16, 12, 13),
        decoration: BoxDecoration(
          color: Colors.white,
          border: Border.all(color: AppColors.cardBorder, width: 1.5),
          borderRadius: const BorderRadius.all(Radius.circular(14)),
        ),
        child: Stack(
          clipBehavior: Clip.none,
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                ConstrainedBox(
                  constraints: const BoxConstraints(minHeight: 38),
                  child: Padding(
                    // Leaves room for the icon badge and its 6 px ring.
                    padding: const EdgeInsets.only(right: 40),
                    child: Text(
                      title,
                      style: const TextStyle(
                        fontFamily: AppTypography.fontFamily,
                        fontSize: 13,
                        fontWeight: AppTypography.semiBold,
                        height: 18.85 / 13,
                        color: AppColors.forest,
                      ),
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.only(top: 2),
                  child: Text(
                    '$value',
                    style: const TextStyle(
                      fontFamily: AppTypography.fontFamily,
                      fontSize: 27,
                      fontWeight: AppTypography.bold,
                      height: 31.05 / 27,
                      letterSpacing: -0.54,
                      color: AppColors.forest,
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.only(top: 5),
                  child: Text(
                    caption,
                    style: const TextStyle(
                      fontFamily: AppTypography.fontFamily,
                      fontSize: 12,
                      fontWeight: AppTypography.regular,
                      height: 18 / 12,
                      color: AppColors.moss,
                    ),
                  ),
                ),
              ],
            ),
            Positioned(
              // 12 from the card's top edge and 13 from its right edge.
              top: -5.5,
              right: -0.5,
              child: Container(
                width: 31,
                height: 31,
                decoration: BoxDecoration(
                  color: iconBackground,
                  shape: BoxShape.circle,
                  boxShadow: const [
                    BoxShadow(color: Colors.white, spreadRadius: 6),
                    BoxShadow(color: AppColors.activityRing, spreadRadius: 4),
                  ],
                ),
                alignment: Alignment.center,
                child: SvgPicture.asset(
                  iconAsset,
                  width: 17,
                  height: 17,
                  excludeFromSemantics: true,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

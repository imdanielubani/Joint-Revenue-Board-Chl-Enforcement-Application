import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:intl/intl.dart';

import '../../../../core/constants/asset_paths.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../chl_trips/domain/entities/trip_status.dart';
import '../../../vehicle/domain/entities/e_tag_status.dart';
import '../../domain/entities/verification_record.dart';
import 'history_list_item.dart';

/// A record in the verification history: icon, plate, what was found, how
/// the vehicle was identified and when, and Completed / Not completed.
class HistoryRecordTile extends StatelessWidget {
  const HistoryRecordTile({
    super.key,
    required this.record,
    required this.day,
    required this.onTap,
  });

  final VerificationRecord record;

  /// "Today" or "26 Sept 2026", read out with the record.
  final String day;
  final VoidCallback onTap;

  static final DateFormat _time = DateFormat('hh:mm a');

  /// Icon and disc colour: green when all was well, amber otherwise.
  static (String, Color) look(VerificationRecord record) {
    if (!record.isCompleted) {
      return (AssetPaths.iconHistoryUnfinished, AppColors.historyWarnTint);
    }
    if (record.isETagCheck) {
      return record.eTagStatus == ETagStatus.valid
          ? (AssetPaths.iconRecentETag, AppColors.historyGoodTint)
          : (AssetPaths.iconHistoryETagWarn, AppColors.historyWarnTint);
    }
    return record.tripStatus == TripStatus.active
        ? (AssetPaths.iconHistoryTripOk, AppColors.historyGoodTint)
        : (AssetPaths.iconHistoryTripWarn, AppColors.historyWarnTint);
  }

  @override
  Widget build(BuildContext context) {
    final record = this.record;
    final (icon, tint) = look(record);
    final time = _time.format(record.recordedAt);
    final completed = record.isCompleted;
    final status = completed ? 'Completed' : 'Not completed';

    return Semantics(
      container: true,
      button: true,
      label: [
        record.plateNumber,
        record.finding,
        record.historyMethod,
        status,
        day,
        time,
      ].join(', '),
      // Excluding the children drops their tap, so it is declared here.
      onTap: onTap,
      excludeSemantics: true,
      child: InkWell(
        onTap: onTap,
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 112),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 18),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: tint,
                      shape: BoxShape.circle,
                    ),
                    alignment: Alignment.center,
                    child: SvgPicture.asset(
                      icon,
                      width: 20,
                      height: 20,
                      excludeFromSemantics: true,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        record.plateNumber,
                        style: const TextStyle(
                          fontFamily: AppTypography.fontFamily,
                          fontSize: 17,
                          fontWeight: AppTypography.bold,
                          letterSpacing: 0,
                          height: 22.95 / 17,
                          color: AppColors.ink,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        record.finding,
                        style: const TextStyle(
                          fontFamily: AppTypography.fontFamily,
                          fontSize: 14,
                          fontWeight: AppTypography.regular,
                          letterSpacing: 0,
                          height: 1.5,
                          color: AppColors.ink,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${record.historyMethod} · $time',
                        style: const TextStyle(
                          fontFamily: AppTypography.fontFamily,
                          fontSize: 12,
                          fontWeight: AppTypography.regular,
                          letterSpacing: 0,
                          height: 1.5,
                          color: AppColors.inkMuted,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          SvgPicture.asset(
                            completed
                                ? AssetPaths.iconHistoryCompleted
                                : AssetPaths.iconHistoryNotCompleted,
                            width: 14,
                            height: 14,
                            excludeFromSemantics: true,
                          ),
                          const SizedBox(width: 5),
                          Flexible(
                            child: Text(
                              status,
                              style: TextStyle(
                                fontFamily: AppTypography.fontFamily,
                                fontSize: 11,
                                fontWeight: AppTypography.regular,
                                letterSpacing: 0,
                                height: 17.067 / 11,
                                color: completed
                                    ? AppColors.historyCompleted
                                    : AppColors.historyNotCompleted,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                Padding(
                  padding: const EdgeInsets.only(top: 14),
                  child: SvgPicture.asset(
                    AssetPaths.iconHistoryChevron,
                    width: 18,
                    height: 18,
                    excludeFromSemantics: true,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

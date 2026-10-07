import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../verification_history/domain/entities/verification_record.dart';
import '../../../verification_history/presentation/widgets/history_list_item.dart';

/// "Recent verifications" card listing today's latest verifications.
class RecentActivityList extends StatelessWidget {
  const RecentActivityList({super.key, required this.records});

  final List<VerificationRecord> records;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: AppColors.cardBorder, width: 1.5),
        borderRadius: const BorderRadius.all(Radius.circular(16)),
      ),
      child: records.isEmpty
          ? const Padding(
              padding: EdgeInsets.symmetric(vertical: 28, horizontal: 8),
              child: Text(
                'No verifications yet today.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontFamily: AppTypography.fontFamily,
                  fontSize: 13,
                  fontWeight: AppTypography.regular,
                  height: 1.5,
                  color: AppColors.moss,
                ),
              ),
            )
          : Column(
              children: [
                for (final record in records)
                  VerificationRecordTile(record: record),
              ],
            ),
    );
  }
}

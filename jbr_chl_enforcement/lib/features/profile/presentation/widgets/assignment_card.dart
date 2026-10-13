import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../auth/domain/entities/officer.dart';

/// The officer's identity and assignment as label / value rows, on Account
/// Details. Missing values show as "—".
class AssignmentCard extends StatelessWidget {
  const AssignmentCard({super.key, required this.officer});

  final Officer? officer;

  /// Shown for anything the server has not provided.
  static const String missing = '—';

  @override
  Widget build(BuildContext context) {
    final officer = this.officer;
    String show(String? value) =>
        value == null || value.trim().isEmpty ? missing : value;

    final rows = [
      ('Full name', show(officer?.name)),
      ('Agent ID', show(officer?.agentId)),
      ('Role', show(officer?.role)),
      ('Assigned state', show(officer?.region)),
      ('Assignment', show(officer?.assignment)),
      ('CHL email', show(officer?.email)),
      ('Organization', show(officer?.organization)),
    ];

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 25, vertical: 32),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: AppColors.cardBorder, width: 1.5),
        borderRadius: const BorderRadius.all(Radius.circular(18)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          for (var i = 0; i < rows.length; i++)
            _DetailRow(
              label: rows[i].$1,
              value: rows[i].$2,
              divider: i < rows.length - 1,
            ),
        ],
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  const _DetailRow({
    required this.label,
    required this.value,
    required this.divider,
  });

  final String label;
  final String value;
  final bool divider;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      container: true,
      label: '$label: $value',
      excludeSemantics: true,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 11),
        decoration: divider
            ? const BoxDecoration(
                border: Border(
                  bottom: BorderSide(color: AppColors.cardBorder, width: 1.5),
                ),
              )
            : null,
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: const TextStyle(
                fontFamily: AppTypography.fontFamily,
                fontSize: 14,
                fontWeight: AppTypography.regular,
                letterSpacing: 0,
                height: 1.5,
                color: AppColors.ink,
              ),
            ),
            const SizedBox(width: 14),
            // Long values (an email) wrap at the right rather than overflow.
            Expanded(
              child: Text(
                value,
                textAlign: TextAlign.end,
                style: const TextStyle(
                  fontFamily: AppTypography.fontFamily,
                  fontSize: 14,
                  fontWeight: AppTypography.semiBold,
                  letterSpacing: 0,
                  height: 1.5,
                  color: AppColors.forest,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

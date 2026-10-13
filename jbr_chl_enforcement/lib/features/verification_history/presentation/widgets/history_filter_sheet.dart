import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../shared/ui/sheets/app_bottom_sheet.dart';
import '../../../../shared/ui/widgets/segmented_switch.dart';
import '../../../../shared/ui/widgets/state_message.dart';
import '../../domain/entities/history_filter.dart';

/// Opens the Filters card. Resolves to the chosen filter, or null when it
/// was closed without choosing.
Future<HistoryFilter?> showHistoryFilterSheet(
  BuildContext context,
  HistoryFilter current,
) {
  return showAppSheet<HistoryFilter>(
    context: context,
    // Over the whole screen, navigation bar included.
    useRootNavigator: true,
    builder: (context) => HistoryFilterSheet(initial: current),
  );
}

/// Which checks and results to list: "All checks / CHL trips / E-Tags" and
/// "All results / Completed / Not completed".
class HistoryFilterSheet extends StatefulWidget {
  const HistoryFilterSheet({super.key, required this.initial});

  final HistoryFilter initial;

  @override
  State<HistoryFilterSheet> createState() => _HistoryFilterSheetState();
}

class _HistoryFilterSheetState extends State<HistoryFilterSheet> {
  late HistoryFilter _filter = widget.initial;

  static const TextStyle _groupStyle = TextStyle(
    fontFamily: AppTypography.fontFamily,
    fontSize: 14,
    fontWeight: AppTypography.semiBold,
    letterSpacing: -0.21,
    height: 18.2 / 14,
    color: AppColors.forest,
  );

  @override
  Widget build(BuildContext context) {
    return AppSheetCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisSize: MainAxisSize.min,
        children: [
          Semantics(
            header: true,
            child: const Text(
              'Filter history',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontFamily: AppTypography.fontFamily,
                fontSize: 21,
                fontWeight: AppTypography.bold,
                letterSpacing: -0.315,
                height: 1.3,
                color: AppColors.forest,
              ),
            ),
          ),
          const SizedBox(height: 22),
          const Text('Check', style: _groupStyle),
          const SizedBox(height: 10),
          SegmentedSwitch<HistoryCheck>(
            options: const [
              (HistoryCheck.all, 'All checks'),
              (HistoryCheck.chlTrips, 'CHL trips'),
              (HistoryCheck.eTags, 'E-Tags'),
            ],
            selected: _filter.check,
            onChanged: (check) =>
                setState(() => _filter = _filter.copyWith(check: check)),
          ),
          const SizedBox(height: 18),
          const Text('Result', style: _groupStyle),
          const SizedBox(height: 10),
          SegmentedSwitch<HistoryResult>(
            options: const [
              (HistoryResult.all, 'All'),
              (HistoryResult.completed, 'Completed'),
              (HistoryResult.notCompleted, 'Not completed'),
            ],
            selected: _filter.result,
            onChanged: (result) =>
                setState(() => _filter = _filter.copyWith(result: result)),
          ),
          const SizedBox(height: 24),
          PillButton(
            label: 'Show records',
            onPressed: () => Navigator.of(context).pop(_filter),
          ),
          const SizedBox(height: 4),
          TextButton(
            onPressed: () => Navigator.of(context).pop(HistoryFilter.none),
            style: TextButton.styleFrom(
              minimumSize: const Size(double.infinity, 48),
              foregroundColor: AppColors.forest,
              textStyle: const TextStyle(
                fontFamily: AppTypography.fontFamily,
                fontSize: 14,
                fontWeight: AppTypography.semiBold,
                letterSpacing: 0,
              ),
            ),
            child: const Text('Clear filters'),
          ),
        ],
      ),
    );
  }
}

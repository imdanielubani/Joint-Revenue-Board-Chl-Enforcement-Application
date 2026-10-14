import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../../core/constants/asset_paths.dart';
import '../../../../core/navigation/route_names.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../core/utils/date_formatter.dart';
import '../../../../shared/ui/widgets/app_spinner.dart';
import '../../../../shared/ui/widgets/empty_state.dart';
import '../../../../shared/ui/widgets/green_header_scaffold.dart';
import '../../../../shared/ui/widgets/state_message.dart';
import '../../../chl_trips/domain/entities/trip_status.dart';
import '../../../notifications/presentation/widgets/notifications_bell.dart';
import '../../../vehicle/domain/entities/e_tag_status.dart';
import '../../../verification/domain/entities/plate_number.dart';
import '../../domain/entities/verification_record.dart';
import '../../domain/entities/verification_record_details.dart';
import '../providers/history_controller.dart';
import '../widgets/history_list_item.dart';

/// One verification record, full screen above the tabs: its summary,
/// "Verification details" and "Result and completion". A CHL trip check is
/// as designed, with View verification result for an active trip. An
/// unfinished check ("Verification Unavailable") is built from the same
/// parts: nothing concluded, and Retry verification. E-Tag checks have no
/// design yet and show a placeholder.
class HistoryRecordDetailsScreen extends ConsumerWidget {
  const HistoryRecordDetailsScreen({super.key, required this.id});

  final String id;

  /// Payment requests are never made from this app.
  static const String paymentNote = 'No · payments are outside this scope';

  /// For a value the server did not send.
  static const String notRecorded = 'Not recorded';

  static void _back(BuildContext context) {
    if (context.canPop()) {
      context.pop();
    } else {
      context.goNamed(RouteNames.history);
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final history = ref.watch(historyProvider);
    VerificationRecord? record;
    for (final candidate in history.value ?? const <VerificationRecord>[]) {
      if (candidate.id == id) record = candidate;
    }

    final Widget body;
    if (record != null && (record.tripStatus != null || !record.isCompleted)) {
      body = _RecordPage(record: record, onBack: () => _back(context));
    } else if (record != null) {
      body = EmptyState(title: record.plateNumber, message: notBuiltYetMessage);
    } else if (history.isLoading) {
      body = const Center(
        child: AppSpinner(semanticLabel: 'Loading the verification record'),
      );
    } else {
      body = const EmptyState(
        title: 'Record unavailable',
        message: 'This verification record is not in your history.',
      );
    }

    return GreenHeaderScaffold(
      title: 'Verification Record',
      onBack: () => _back(context),
      trailing: const NotificationsBell(),
      body: body,
    );
  }
}

/// The record of a CHL trip check, or of a check that did not finish.
class _RecordPage extends StatelessWidget {
  const _RecordPage({required this.record, required this.onBack});

  final VerificationRecord record;
  final VoidCallback onBack;

  static const double _maxContentWidth = 560;
  static final DateFormat _time = DateFormat('hh:mm a');

  @override
  Widget build(BuildContext context) {
    final details = record.details;
    final active = record.tripStatus == TripStatus.active;
    final unfinished = !record.isCompleted;
    final plate = PlateNumber.tryParse(record.plateNumber);
    const notRecorded = HistoryRecordDetailsScreen.notRecorded;
    // An unfinished check concluded nothing about the trip or E-Tag.
    const notConcluded = 'Not concluded';

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 36),
      children: [
        Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: _maxContentWidth),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text(
                  'Personal Verification',
                  style: TextStyle(
                    fontFamily: AppTypography.fontFamily,
                    fontSize: 12,
                    fontWeight: AppTypography.regular,
                    letterSpacing: 0,
                    height: 1.5,
                    color: AppColors.ink,
                  ),
                ),
                const SizedBox(height: 15),
                Semantics(
                  header: true,
                  child: Text(
                    record.plateNumber,
                    style: const TextStyle(
                      fontFamily: AppTypography.fontFamily,
                      fontSize: 27,
                      fontWeight: AppTypography.bold,
                      letterSpacing: -0.945,
                      height: 33.75 / 27,
                      color: AppColors.forest,
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                _Summary(record: record),
                const SizedBox(height: 28),
                _RecordSection(
                  title: 'Verification details',
                  borderColor: AppColors.cardBorder,
                  borderWidth: 1.5,
                  rows: [
                    _Row(
                      'Verification reference',
                      details?.reference ?? record.id,
                    ),
                    _Row('Vehicle plate', record.plateNumber),
                    _Row('Vehicle type', details?.vehicleType ?? notRecorded),
                    _Row('Verification method', record.historyMethod),
                    _Row(
                      'Date and time',
                      '${DateFormatter.date(record.recordedAt)} · '
                          '${_time.format(record.recordedAt)}',
                    ),
                    _Row('Agent', details?.agentName ?? notRecorded),
                    _Row('Agent ID', details?.agentId ?? notRecorded),
                  ],
                ),
                const SizedBox(height: 26),
                _RecordSection(
                  title: 'Result and completion',
                  borderColor: AppColors.recordDivider,
                  borderWidth: 1.067,
                  rows: [
                    _Row(
                      'Trip status',
                      unfinished ? notConcluded : record.finding,
                    ),
                    _Row(
                      'E-Tag status',
                      unfinished ? notConcluded : _tagStatus(details),
                    ),
                    _Row(
                      'Completion status',
                      record.isCompleted ? 'Completed' : 'Not completed',
                    ),
                    _Row('Action taken', details?.actionTaken ?? notRecorded),
                    _Row(
                      'Pending action',
                      details == null
                          ? notRecorded
                          : details.pendingAction ?? 'None',
                    ),
                    _Row(
                      'Violation issued',
                      details == null
                          ? notRecorded
                          : (details.violationIssued ? 'Yes' : 'No'),
                    ),
                    _Row(
                      'GPS',
                      _gps(details?.location),
                      // Coordinates are larger, as designed.
                      large: details?.location != null,
                    ),
                    const _Row(
                      'Payment request generated',
                      HistoryRecordDetailsScreen.paymentNote,
                      // Label and value on two lines each, as designed.
                      maxLabelWidth: 158,
                      maxValueWidth: 128,
                    ),
                  ],
                ),
                const SizedBox(height: 21),
                // As designed, an active trip has a result to view; an
                // unfinished check can be run again for the same plate.
                if ((active || unfinished) && plate != null) ...[
                  PillButton(
                    label: unfinished
                        ? 'Retry verification'
                        : 'View verification result',
                    weight: AppTypography.medium,
                    onPressed: () => context.pushNamed(
                      RouteNames.verificationResult,
                      extra: plate,
                    ),
                  ),
                  const SizedBox(height: 8),
                ],
                OutlinedButton(
                  onPressed: onBack,
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size(double.infinity, 52),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 18,
                      vertical: 13,
                    ),
                    backgroundColor: AppColors.surface,
                    foregroundColor: AppColors.forest,
                    side: const BorderSide(color: AppColors.ink, width: 1.067),
                    shape: const RoundedRectangleBorder(
                      borderRadius: BorderRadius.all(Radius.circular(28)),
                    ),
                    textStyle: const TextStyle(
                      fontFamily: AppTypography.fontFamily,
                      fontSize: 15,
                      fontWeight: AppTypography.medium,
                      letterSpacing: 0,
                      height: 20.25 / 15,
                    ),
                  ),
                  child: const Text('Back to history'),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  /// The E-Tag as read during the trip check: "Valid", "Invalid".
  static String _tagStatus(VerificationRecordDetails? details) {
    if (details == null) return HistoryRecordDetailsScreen.notRecorded;
    return switch (details.tagStatus) {
      ETagStatus.valid => 'Valid',
      ETagStatus.invalid => 'Invalid',
      ETagStatus.missing => 'Missing',
      null => HistoryRecordDetailsScreen.notRecorded,
    };
  }

  /// "8.97439, 7.45280".
  static String _gps(RecordLocation? location) {
    if (location == null) return HistoryRecordDetailsScreen.notRecorded;
    return '${location.latitude.toStringAsFixed(5)}, '
        '${location.longitude.toStringAsFixed(5)}';
  }
}

/// The result in a card: icon, "Active Trip", "Completed · Manual plate";
/// or "Verification Unavailable", "Not completed · Receipt QR".
class _Summary extends StatelessWidget {
  const _Summary({required this.record});

  final VerificationRecord record;

  @override
  Widget build(BuildContext context) {
    final active = record.tripStatus == TripStatus.active;
    final title = switch (record.tripStatus) {
      TripStatus.active => 'Active Trip',
      TripStatus.noActive => 'No Active Trip',
      TripStatus.previous => 'Previous Trip',
      TripStatus.noHistory => 'No Trip History',
      null => 'Verification Unavailable',
    };
    final icon = switch (record.tripStatus) {
      TripStatus.active => AssetPaths.iconHistoryRecordOk,
      null => AssetPaths.iconHistoryUnfinished,
      _ => AssetPaths.iconHistoryTripWarn,
    };

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: const BoxDecoration(
        color: AppColors.surface,
        border: Border.fromBorderSide(
          BorderSide(color: AppColors.cardBorder, width: 1.5),
        ),
        borderRadius: BorderRadius.all(Radius.circular(20)),
      ),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: active ? AppColors.greenTint : AppColors.historyWarnTint,
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
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontFamily: AppTypography.fontFamily,
                    fontSize: 18,
                    fontWeight: AppTypography.bold,
                    letterSpacing: -0.27,
                    height: 25.2 / 18,
                    color: AppColors.forest,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  '${record.isCompleted ? 'Completed' : 'Not completed'} · '
                  '${record.historyMethod}',
                  style: const TextStyle(
                    fontFamily: AppTypography.fontFamily,
                    fontSize: 12,
                    fontWeight: AppTypography.regular,
                    letterSpacing: 0,
                    height: 18.6 / 12,
                    color: AppColors.ink,
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

/// A label and its value.
class _Row {
  const _Row(
    this.label,
    this.value, {
    this.large = false,
    this.maxLabelWidth,
    this.maxValueWidth,
  });

  final String label;
  final String value;

  /// Larger value, as for GPS.
  final bool large;

  /// Caps to wrap the label or value where designed.
  final double? maxLabelWidth;
  final double? maxValueWidth;
}

/// A titled card of label / value rows with dividers between them.
class _RecordSection extends StatelessWidget {
  const _RecordSection({
    required this.title,
    required this.rows,
    required this.borderColor,
    required this.borderWidth,
  });

  final String title;
  final List<_Row> rows;
  final Color borderColor;
  final double borderWidth;

  static const TextStyle _labelStyle = TextStyle(
    fontFamily: AppTypography.fontFamily,
    fontSize: 12,
    fontWeight: AppTypography.regular,
    letterSpacing: 0,
    height: 1.6,
    color: AppColors.mutedText,
  );

  static const TextStyle _valueStyle = TextStyle(
    fontFamily: AppTypography.fontFamily,
    fontSize: 12,
    fontWeight: AppTypography.semiBold,
    letterSpacing: 0,
    height: 1.6,
    color: AppColors.forest,
  );

  static const TextStyle _largeValueStyle = TextStyle(
    fontFamily: AppTypography.fontFamily,
    fontSize: 14,
    fontWeight: AppTypography.semiBold,
    letterSpacing: 0,
    color: AppColors.forest,
  );

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppColors.surface,
        border: Border.all(color: borderColor, width: borderWidth),
        borderRadius: const BorderRadius.all(Radius.circular(20)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Semantics(
            header: true,
            child: Text(
              title,
              style: const TextStyle(
                fontFamily: AppTypography.fontFamily,
                fontSize: 17,
                fontWeight: AppTypography.bold,
                letterSpacing: -0.255,
                height: 22.1 / 17,
                color: AppColors.forest,
              ),
            ),
          ),
          const SizedBox(height: 16),
          LayoutBuilder(
            builder: (context, constraints) => Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                for (var i = 0; i < rows.length; i++)
                  _row(rows[i], last: i == rows.length - 1, constraints),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _row(_Row row, BoxConstraints constraints, {required bool last}) {
    return Semantics(
      container: true,
      label: '${row.label}: ${row.value}',
      excludeSemantics: true,
      child: Container(
        constraints: const BoxConstraints(minHeight: 36),
        padding: const EdgeInsets.only(top: 10, bottom: 5.3),
        decoration: last
            ? null
            : const BoxDecoration(
                border: Border(
                  bottom: BorderSide(
                    color: AppColors.recordDivider,
                    width: 1.5,
                  ),
                ),
              ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Align(
                alignment: AlignmentDirectional.centerStart,
                child: ConstrainedBox(
                  constraints: BoxConstraints(
                    maxWidth: row.maxLabelWidth ?? double.infinity,
                  ),
                  child: Text(row.label, style: _labelStyle),
                ),
              ),
            ),
            const SizedBox(width: 12),
            // Long values wrap at a little over half the row, as designed.
            ConstrainedBox(
              constraints: BoxConstraints(
                maxWidth: math.min(
                  constraints.maxWidth * .55,
                  row.maxValueWidth ?? double.infinity,
                ),
              ),
              child: Text(
                row.value,
                textAlign: TextAlign.end,
                style: row.large ? _largeValueStyle : _valueStyle,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

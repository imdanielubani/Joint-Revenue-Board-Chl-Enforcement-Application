import 'package:flutter/foundation.dart';

import 'verification_record.dart';

/// How far back the history goes.
enum HistoryPeriod {
  /// Today and the 29 days before it.
  last30Days,

  /// Every record kept.
  all,
}

/// Which checks to list.
enum HistoryCheck { all, chlTrips, eTags }

/// Which results to list.
enum HistoryResult { all, completed, notCompleted }

/// The Filters choice: kind of check and result. [none] lists everything.
@immutable
class HistoryFilter {
  const HistoryFilter({
    this.check = HistoryCheck.all,
    this.result = HistoryResult.all,
  });

  static const HistoryFilter none = HistoryFilter();

  final HistoryCheck check;
  final HistoryResult result;

  /// Whether anything is being filtered out.
  bool get isActive => check != HistoryCheck.all || result != HistoryResult.all;

  /// How many filters are set, for the Filters button.
  int get count =>
      (check == HistoryCheck.all ? 0 : 1) +
      (result == HistoryResult.all ? 0 : 1);

  bool matches(VerificationRecord record) {
    final checkMatches = switch (check) {
      HistoryCheck.all => true,
      // An unfinished check counts as neither a trip nor an E-Tag result,
      // so it only shows under "All checks".
      HistoryCheck.chlTrips => record.tripStatus != null,
      HistoryCheck.eTags => record.eTagStatus != null,
    };
    final resultMatches = switch (result) {
      HistoryResult.all => true,
      HistoryResult.completed => record.isCompleted,
      HistoryResult.notCompleted => !record.isCompleted,
    };
    return checkMatches && resultMatches;
  }

  HistoryFilter copyWith({HistoryCheck? check, HistoryResult? result}) =>
      HistoryFilter(check: check ?? this.check, result: result ?? this.result);

  @override
  bool operator ==(Object other) =>
      other is HistoryFilter && other.check == check && other.result == result;

  @override
  int get hashCode => Object.hash(check, result);
}

/// Whether [record] falls in [period], counting from [now].
bool inPeriod(VerificationRecord record, HistoryPeriod period, DateTime now) {
  if (period == HistoryPeriod.all) return true;
  final firstDay = DateTime(now.year, now.month, now.day - 29);
  return !record.recordedAt.isBefore(firstDay);
}

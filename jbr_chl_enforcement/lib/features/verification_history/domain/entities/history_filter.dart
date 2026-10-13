import 'package:flutter/foundation.dart';

import '../../../chl_trips/domain/entities/trip_status.dart';
import '../../../vehicle/domain/entities/e_tag_status.dart';
import '../../../verification/domain/entities/verification_method.dart';
import 'verification_record.dart';

/// How far back the history goes.
enum HistoryPeriod {
  /// Today and the 29 days before it.
  last30Days('Last 30 days'),

  /// Every record kept.
  all('All available dates');

  const HistoryPeriod(this.label);

  /// As in the Date range list and the summary line.
  final String label;
}

/// How the vehicle was identified. A QR code is a receipt for a CHL trip
/// and a tag for an E-Tag check, so the two are offered separately.
enum HistoryMethod {
  manualPlate('Manual plate'),
  receiptQr('Receipt QR'),
  tagQr('Tag QR'),
  rfid('RFID'),
  ocr('OCR');

  const HistoryMethod(this.label);

  final String label;

  bool matches(VerificationRecord record) => switch (this) {
    HistoryMethod.manualPlate =>
      record.method == VerificationMethod.manualPlate,
    HistoryMethod.receiptQr =>
      record.method == VerificationMethod.qrCode && !record.isETagCheck,
    HistoryMethod.tagQr =>
      record.method == VerificationMethod.qrCode && record.isETagCheck,
    HistoryMethod.rfid => record.method == VerificationMethod.rfid,
    HistoryMethod.ocr => record.method == VerificationMethod.ocr,
  };
}

/// What the check found. An unfinished check found nothing, so it matches
/// none of these.
enum HistoryResult {
  activeTrip('Active trip'),
  noActiveTrip('No active trip'),
  previousTrip('Previous trip'),
  eTagValid('E-Tag valid'),
  eTagInvalid('E-Tag invalid'),
  eTagExpired('E-Tag expired');

  const HistoryResult(this.label);

  /// The same words as on the record.
  final String label;

  bool matches(VerificationRecord record) => switch (this) {
    HistoryResult.activeTrip => record.tripStatus == TripStatus.active,
    HistoryResult.noActiveTrip => record.tripStatus == TripStatus.noActive,
    HistoryResult.previousTrip => record.tripStatus == TripStatus.previous,
    HistoryResult.eTagValid => record.eTagStatus == ETagStatus.valid,
    HistoryResult.eTagInvalid => record.eTagStatus == ETagStatus.invalid,
    HistoryResult.eTagExpired => record.eTagStatus == ETagStatus.expired,
  };
}

/// Whether the verification finished.
enum HistoryCompletion {
  completed('Completed'),
  notCompleted('Not completed');

  const HistoryCompletion(this.label);

  final String label;

  bool matches(VerificationRecord record) =>
      record.isCompleted == (this == HistoryCompletion.completed);
}

/// What the history lists: a date range, plus optional method, result and
/// completion filters (null lists every kind). [none] is the last 30 days
/// with no filters.
@immutable
class HistoryFilter {
  const HistoryFilter({
    this.period = HistoryPeriod.last30Days,
    this.method,
    this.result,
    this.completion,
  });

  static const HistoryFilter none = HistoryFilter();

  final HistoryPeriod period;
  final HistoryMethod? method;
  final HistoryResult? result;
  final HistoryCompletion? completion;

  /// How many filters are set, for the Filters button. The date range has
  /// its own switch on the page, so it is not counted.
  int get count =>
      (method == null ? 0 : 1) +
      (result == null ? 0 : 1) +
      (completion == null ? 0 : 1);

  /// Whether a method, result or completion filter is set.
  bool get isActive => count > 0;

  bool matches(VerificationRecord record, DateTime now) =>
      inPeriod(record, period, now) &&
      (method?.matches(record) ?? true) &&
      (result?.matches(record) ?? true) &&
      (completion?.matches(record) ?? true);

  HistoryFilter withPeriod(HistoryPeriod period) => HistoryFilter(
    period: period,
    method: method,
    result: result,
    completion: completion,
  );

  HistoryFilter withMethod(HistoryMethod? method) => HistoryFilter(
    period: period,
    method: method,
    result: result,
    completion: completion,
  );

  HistoryFilter withResult(HistoryResult? result) => HistoryFilter(
    period: period,
    method: method,
    result: result,
    completion: completion,
  );

  HistoryFilter withCompletion(HistoryCompletion? completion) => HistoryFilter(
    period: period,
    method: method,
    result: result,
    completion: completion,
  );

  /// The same date range with every filter removed.
  HistoryFilter cleared() => HistoryFilter(period: period);

  @override
  bool operator ==(Object other) =>
      other is HistoryFilter &&
      other.period == period &&
      other.method == method &&
      other.result == result &&
      other.completion == completion;

  @override
  int get hashCode => Object.hash(period, method, result, completion);
}

/// Whether [record] falls in [period], counting from [now].
bool inPeriod(VerificationRecord record, HistoryPeriod period, DateTime now) {
  if (period == HistoryPeriod.all) return true;
  final firstDay = DateTime(now.year, now.month, now.day - 29);
  return !record.recordedAt.isBefore(firstDay);
}

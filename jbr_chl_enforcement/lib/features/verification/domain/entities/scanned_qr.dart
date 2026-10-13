import 'package:flutter/foundation.dart';

/// What the QR scanner is pointed at.
enum QrScanTarget {
  /// The QR code printed on a CHL haulage receipt (Verify CHL Trip).
  receipt,

  /// The QR code on the physical JRB E-Tag (Verify E-Tag).
  eTag;

  /// Query value that opens the scanner for an E-Tag: `?for=e-tag`.
  static const String eTagQuery = 'e-tag';

  /// The target named by the scanner route's `for` query parameter;
  /// a receipt unless it says [eTagQuery].
  static QrScanTarget fromQuery(String? value) =>
      value == eTagQuery ? QrScanTarget.eTag : QrScanTarget.receipt;
}

/// A QR code read by the scanner, on its way to verification.
@immutable
class ScannedQr {
  const ScannedQr({required this.target, required this.value});

  final QrScanTarget target;

  /// The decoded text, trimmed.
  final String value;

  @override
  bool operator ==(Object other) =>
      other is ScannedQr && other.target == target && other.value == value;

  @override
  int get hashCode => Object.hash(target, value);
}

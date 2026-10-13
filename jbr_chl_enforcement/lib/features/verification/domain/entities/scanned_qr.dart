import 'package:flutter/foundation.dart';

/// Which QR code was scanned. The one scanner reads both, and each leads
/// to its own result.
enum ScannedQrKind {
  /// The QR code printed on a CHL haulage receipt.
  receipt,

  /// The QR code on the physical JRB E-Tag.
  eTag,
}

/// A QR code read by the scanner, on its way to verification.
@immutable
class ScannedQr {
  const ScannedQr({required this.kind, required this.value});

  /// [value] trimmed, and recognised as a receipt or an E-Tag.
  factory ScannedQr.read(String value) {
    final text = value.trim();
    return ScannedQr(
      kind: _eTag.hasMatch(text) ? ScannedQrKind.eTag : ScannedQrKind.receipt,
      value: text,
    );
  }

  /// An E-Tag code starts "ETAG", "E-TAG" or "JRB-ETAG" (any case); any
  /// other code is taken as a CHL receipt.
  // TODO(api): match the receipt and E-Tag QR formats once JRB publishes
  // them.
  static final RegExp _eTag = RegExp(
    r'^(JRB[-_ :]?)?E-?TAG',
    caseSensitive: false,
  );

  final ScannedQrKind kind;

  /// The decoded text, trimmed.
  final String value;

  @override
  bool operator ==(Object other) =>
      other is ScannedQr && other.kind == kind && other.value == value;

  @override
  int get hashCode => Object.hash(kind, value);
}

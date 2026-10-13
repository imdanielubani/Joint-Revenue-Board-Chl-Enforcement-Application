import 'package:flutter/foundation.dart';

/// Which code was scanned. The one scanner reads both, and each leads to
/// its own page.
enum ScannedQrKind {
  /// A CHL QR code: verified like a typed plate, ending in the
  /// verification result.
  qrCode,

  /// The QR code on the physical JRB E-Tag: opens the E-Tag receipt.
  eTag,
}

/// A code read by the scanner, on its way to verification or, for an
/// E-Tag, to its receipt.
@immutable
class ScannedQr {
  const ScannedQr({required this.kind, required this.value});

  /// [value] trimmed, and recognised as a QR code or an E-Tag.
  factory ScannedQr.read(String value) {
    final text = value.trim();
    return ScannedQr(
      kind: _eTag.hasMatch(text) ? ScannedQrKind.eTag : ScannedQrKind.qrCode,
      value: text,
    );
  }

  /// An E-Tag code starts "ETAG", "E-TAG" or "JRB-ETAG" (any case); any
  /// other code is taken as a CHL QR code.
  // TODO(api): match the CHL QR and E-Tag formats once JRB publishes them.
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

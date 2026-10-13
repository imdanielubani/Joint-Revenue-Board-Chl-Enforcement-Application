import 'package:flutter/foundation.dart';

/// A haulage tag (the vehicle's physical E-Tag) read by the RFID reader.
/// Its reference is passed on to verification and never shown: a read tag
/// is not yet a verified vehicle.
@immutable
class HaulageTag {
  const HaulageTag(this.reference);

  /// What the reader read from the tag.
  final String reference;

  /// A JRB haulage tag's reference: 24 hexadecimal characters starting
  /// "E2" (an EPC-96 code). Any other tag is not part of the JRB CHL
  /// architecture, which is decided here, before anything is sent to CHL.
  // TODO(api): confirm the JRB tag format once JRB publishes it.
  static final RegExp _jrb = RegExp(r'^E2[0-9A-F]{22}$', caseSensitive: false);

  /// Whether this is a JRB haulage tag.
  bool get isJrb => _jrb.hasMatch(reference.trim());

  @override
  bool operator ==(Object other) =>
      other is HaulageTag && other.reference == reference;

  @override
  int get hashCode => reference.hashCode;

  /// Kept out of logs and error messages.
  @override
  String toString() => 'HaulageTag';
}

import 'package:flutter/foundation.dart';

import 'plate_number.dart';

/// A haulage tag (the vehicle's physical E-Tag) read by the RFID reader.
/// Its reference is passed on to verification and never shown: a read tag
/// is not yet a verified vehicle.
@immutable
class HaulageTag {
  const HaulageTag(this.reference, {this.plate});

  /// What the reader read from the tag.
  final String reference;

  /// The vehicle plate resolved on the device from the tag, if any. Used to
  /// tell vehicles apart when several tags are read; CHL still verifies the
  /// tag itself.
  final PlateNumber? plate;

  /// A JRB haulage tag's reference: 24 hexadecimal characters starting
  /// "E2" (an EPC-96 code). Any other tag is not part of the JRB CHL
  /// architecture, which is decided here, before anything is sent to CHL.
  // TODO(api): confirm the JRB tag format once JRB publishes it.
  static final RegExp _jrb = RegExp(r'^E2[0-9A-F]{22}$', caseSensitive: false);

  /// Whether this is a JRB haulage tag.
  bool get isJrb => _jrb.hasMatch(reference.trim());

  /// The same tag is the same reference, whatever was resolved from it.
  @override
  bool operator ==(Object other) =>
      other is HaulageTag && other.reference == reference;

  @override
  int get hashCode => reference.hashCode;

  /// Kept out of logs and error messages.
  @override
  String toString() => 'HaulageTag';
}

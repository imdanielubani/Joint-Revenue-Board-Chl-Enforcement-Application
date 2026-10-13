import 'package:flutter/foundation.dart';

/// A haulage tag (the vehicle's physical E-Tag) read by the RFID reader.
/// Its reference is passed on to verification and never shown: a read tag
/// is not yet a verified vehicle.
@immutable
class HaulageTag {
  const HaulageTag(this.reference);

  /// What the reader read from the tag.
  final String reference;

  @override
  bool operator ==(Object other) =>
      other is HaulageTag && other.reference == reference;

  @override
  int get hashCode => reference.hashCode;

  /// Kept out of logs and error messages.
  @override
  String toString() => 'HaulageTag';
}

import 'package:flutter/foundation.dart';

import 'haulage_tag.dart';
import 'plate_number.dart';
import 'scanned_qr.dart';

/// What the officer asked to verify: a plate they entered, a CHL QR code
/// they scanned, or a haulage tag the RFID reader read. (A scanned E-Tag
/// QR opens its receipt instead.)
@immutable
sealed class VerificationRequest {
  const VerificationRequest();

  /// The plate, when the request already names it.
  PlateNumber? get plate;
}

/// Verify the vehicle with this plate.
final class PlateVerification extends VerificationRequest {
  const PlateVerification(this.plate);

  @override
  final PlateNumber plate;

  @override
  bool operator ==(Object other) =>
      other is PlateVerification && other.plate == plate;

  @override
  int get hashCode => plate.hashCode;
}

/// Verify the vehicle a scanned CHL QR code belongs to.
final class QrVerification extends VerificationRequest {
  const QrVerification(this.code);

  final ScannedQr code;

  /// Not known until the code is looked up.
  @override
  PlateNumber? get plate => null;

  @override
  bool operator ==(Object other) =>
      other is QrVerification && other.code == code;

  @override
  int get hashCode => code.hashCode;
}

/// Verify the vehicle a haulage tag read by the RFID reader belongs to.
final class TagVerification extends VerificationRequest {
  const TagVerification(this.tag);

  final HaulageTag tag;

  /// Not known until the tag is looked up.
  @override
  PlateNumber? get plate => null;

  @override
  bool operator ==(Object other) =>
      other is TagVerification && other.tag == tag;

  @override
  int get hashCode => tag.hashCode;
}

/// The checks a verification runs, in order.
enum VerificationStage {
  identifyingVehicle('Identifying vehicle'),
  validatingETag('Validating E-Tag'),
  checkingTrip('Checking CHL trip');

  const VerificationStage(this.label);

  final String label;
}

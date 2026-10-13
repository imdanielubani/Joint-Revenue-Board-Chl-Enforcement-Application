import 'package:flutter/foundation.dart';

import 'plate_number.dart';
import 'scanned_qr.dart';

/// What the officer asked to verify: a plate they entered, or a QR code
/// they scanned (a CHL receipt or a JRB E-Tag).
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

/// Verify the vehicle a scanned receipt or E-Tag belongs to.
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

/// The checks a verification runs, in order.
enum VerificationStage {
  identifyingVehicle('Identifying vehicle'),
  validatingETag('Validating E-Tag'),
  checkingTrip('Checking CHL trip');

  const VerificationStage(this.label);

  final String label;
}

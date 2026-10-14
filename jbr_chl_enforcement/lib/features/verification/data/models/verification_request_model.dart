import '../../../../shared/device/location/location_adapter.dart';
import '../../domain/entities/scanned_qr.dart';
import '../../domain/entities/verification_request.dart';

/// The body of `POST /verifications`.
abstract final class VerificationRequestModel {
  static Map<String, dynamic> toJson(
    VerificationRequest request,
    DeviceLocation location,
  ) => {
    ...switch (request) {
      PlateVerification(:final plate) => {
        'method': 'plate',
        'plate': plate.value,
      },
      QrVerification(:final code) => {
        'method': code.kind == ScannedQrKind.eTag ? 'eTag' : 'qrCode',
        'reference': code.value,
      },
      TagVerification(:final tag) => {
        'method': 'rfid',
        'tagReference': tag.reference,
      },
    },
    'location': locationToJson(location),
  };

  static Map<String, dynamic> locationToJson(DeviceLocation location) => {
    'latitude': location.latitude,
    'longitude': location.longitude,
    'accuracyMetres': location.accuracyMetres,
  };
}

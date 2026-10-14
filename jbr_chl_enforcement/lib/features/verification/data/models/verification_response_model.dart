import '../../../../shared/device/location/location_adapter.dart';
import '../../../chl_trips/data/models/chl_trip_model.dart';
import '../../../chl_trips/domain/entities/chl_trip.dart';
import '../../../chl_trips/domain/entities/trip_status.dart';
import '../../../vehicle/domain/entities/e_tag_status.dart';
import '../../../vehicle/domain/entities/verification_result.dart';
import '../../domain/entities/plate_number.dart';

/// What `POST /verifications` found, read from its `verification` object.
sealed class VerificationResponse {
  const VerificationResponse();
}

/// CHL found the vehicle.
final class VehicleFound extends VerificationResponse {
  const VehicleFound(this.result);

  final VerificationResult result;
}

/// CHL has no vehicle for the plate, code or tag.
final class VehicleMissing extends VerificationResponse {
  const VehicleMissing();
}

/// JSON mapping for verification answers. Throws [FormatException] on an
/// answer the app can't read.
abstract final class VerificationResponseModel {
  static VerificationResponse fromJson(
    Map<String, dynamic> json, {
    DeviceLocation? location,
  }) {
    switch (json['outcome']) {
      case 'vehicleNotFound' || 'unknownTag':
        return const VehicleMissing();
      case 'found':
        return VehicleFound(result(json, location: location));
      default:
        throw FormatException('Unexpected outcome: ${json['outcome']}');
    }
  }

  /// The result of a verification CHL completed.
  static VerificationResult result(
    Map<String, dynamic> json, {
    DeviceLocation? location,
  }) {
    final vehicle = _map(json['vehicle'], 'vehicle');
    final eTag = _map(json['eTag'], 'eTag');
    final plate = PlateNumber.tryParse(vehicle['plate'] as String? ?? '');
    if (plate == null) throw const FormatException('Missing vehicle plate');
    final trip = _tripCheck(_map(json['trip'], 'trip'));
    return VerificationResult(
      id: json['id'] as String?,
      plate: plate,
      vehicleType: vehicle['type'] as String? ?? '',
      eTagStatus: eTagStatus(eTag['status']),
      tripStatus: trip.status,
      checkedAt: DateTime.parse(json['checkedAt'] as String).toLocal(),
      trip: trip.current,
      lastTrip: trip.last,
      destinationCheck: trip.destinationCheck,
      location: location ?? _location(json['location']),
    );
  }

  /// [previous] with the trip from `POST /verifications/:id/trip/refresh`.
  static VerificationResult withTrip(
    VerificationResult previous,
    Map<String, dynamic> json, {
    required DateTime checkedAt,
  }) {
    final trip = _tripCheck(json);
    return VerificationResult(
      id: previous.id,
      plate: previous.plate,
      vehicleType: previous.vehicleType,
      eTagStatus: previous.eTagStatus,
      tripStatus: trip.status,
      checkedAt: checkedAt,
      trip: trip.current,
      lastTrip: trip.last,
      destinationCheck: trip.destinationCheck,
      location: previous.location,
    );
  }

  /// The API's trip check: `{status, current, last, destinationCheck}`.
  static ({
    TripStatus status,
    ChlTrip? current,
    ChlTrip? last,
    DestinationCheck? destinationCheck,
  })
  _tripCheck(Map<String, dynamic> json) {
    final current = json['current'];
    final last = json['last'];
    final destination = json['destinationCheck'];
    return (
      status: ChlTripModel.status(json['status']),
      current: current is Map<String, dynamic>
          ? ChlTripModel.fromJson(current)
          : null,
      last: last is Map<String, dynamic> ? ChlTripModel.fromJson(last) : null,
      destinationCheck: destination is Map<String, dynamic>
          ? DestinationCheck(
              enforcementPoint: destination['enforcementPoint'] as String,
              completionDecision: destination['completionDecision'] as String,
              centralDelay: Duration(
                seconds: (destination['centralDelaySeconds'] as num).toInt(),
              ),
            )
          : null,
    );
  }

  /// The app's E-Tag status: a tag belonging to another vehicle is invalid.
  static ETagStatus eTagStatus(Object? value) => switch (value) {
    'valid' => ETagStatus.valid,
    'invalid' || 'mismatch' => ETagStatus.invalid,
    'missing' => ETagStatus.missing,
    _ => throw FormatException('Unknown E-Tag status: $value'),
  };

  static DeviceLocation? _location(Object? json) {
    if (json is! Map<String, dynamic>) return null;
    return DeviceLocation(
      latitude: (json['latitude'] as num).toDouble(),
      longitude: (json['longitude'] as num).toDouble(),
      accuracyMetres: (json['accuracyMetres'] as num?)?.toDouble() ?? 0,
      at: DateTime.now(),
    );
  }

  static Map<String, dynamic> _map(Object? value, String name) {
    if (value is! Map<String, dynamic>) {
      throw FormatException('Missing $name');
    }
    return value;
  }
}

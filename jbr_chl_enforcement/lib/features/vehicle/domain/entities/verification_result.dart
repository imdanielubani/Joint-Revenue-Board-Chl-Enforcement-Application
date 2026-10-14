import 'package:flutter/foundation.dart';

import '../../../chl_trips/domain/entities/chl_trip.dart';
import '../../../../shared/device/location/location_adapter.dart';
import '../../../chl_trips/domain/entities/trip_status.dart';
import '../../../verification/domain/entities/plate_number.dart';
import 'e_tag_status.dart';

/// What CHL returned for a verified vehicle: who it is, its E-Tag, and its
/// trip.
@immutable
class VerificationResult {
  const VerificationResult({
    required this.plate,
    required this.vehicleType,
    required this.eTagStatus,
    required this.tripStatus,
    required this.checkedAt,
    this.trip,
    this.destinationCheck,
    this.lastTrip,
    this.location,
  });

  final PlateNumber plate;

  /// e.g. "Heavy goods vehicle".
  final String vehicleType;

  final ETagStatus eTagStatus;
  final TripStatus tripStatus;
  final DateTime checkedAt;

  /// The trip, when CHL found one.
  final ChlTrip? trip;

  /// How the officer's location is checked against the destination; set
  /// with an active trip.
  final DestinationCheck? destinationCheck;

  /// The vehicle's most recent earlier trip, when it has no active one and
  /// CHL found one.
  final ChlTrip? lastTrip;

  /// Where the officer was when the vehicle was checked.
  final DeviceLocation? location;
}

/// The destination check CHL runs for an active trip: it compares the
/// officer's recorded location with the enforcement point and the
/// destination LGA's geofence.
@immutable
class DestinationCheck {
  const DestinationCheck({
    required this.enforcementPoint,
    required this.completionDecision,
    required this.centralDelay,
  });

  /// e.g. "Ikeja enforcement point".
  final String enforcementPoint;

  /// e.g. "Awaiting central validation".
  final String completionDecision;

  /// The delay CHL applies before deciding, set centrally.
  final Duration centralDelay;
}

/// A location the officer recorded for a destination check, as CHL
/// received it.
@immutable
class RecordedLocation {
  const RecordedLocation({
    required this.latitude,
    required this.longitude,
    required this.accuracyMetres,
    required this.recordedAt,
  });

  final double latitude;
  final double longitude;
  final double accuracyMetres;
  final DateTime recordedAt;
}

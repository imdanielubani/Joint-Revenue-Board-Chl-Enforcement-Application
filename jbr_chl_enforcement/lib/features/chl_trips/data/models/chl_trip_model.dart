import '../../domain/entities/chl_trip.dart';
import '../../domain/entities/trip_status.dart';

/// JSON mapping for [ChlTrip] and trip statuses, as the enforcement API
/// sends them. Throws [FormatException] when a required field is missing.
abstract final class ChlTripModel {
  static ChlTrip fromJson(Map<String, dynamic> json) => ChlTrip(
    transactionReference: _string(json, 'transactionReference'),
    startedAt: _date(json, 'startedAt'),
    paidAt: _date(json, 'transactionDate'),
    transactionType: _string(json, 'transactionType'),
    transactionStatus: _string(json, 'transactionStatus'),
    originState: _string(json, 'originState'),
    originLga: _string(json, 'originLga'),
    destinationState: _string(json, 'destinationState'),
    destinationLga: _string(json, 'destinationLga'),
    validUntil: _date(json, 'validUntil'),
    cargo: json['cargo'] as String?,
    paymentReference: json['paymentReference'] as String?,
    terminalId: json['terminalId'] as String?,
    contactNumber: json['contactNumber'] as String?,
    channel: json['channel'] as String?,
    channelType: json['channelType'] as String?,
    state: switch (json['status']) {
      'completed' => ChlTripState.completed,
      'expired' => ChlTripState.expired,
      _ => ChlTripState.active,
    },
    completedAt: json['completedAt'] is String
        ? DateTime.parse(json['completedAt'] as String).toLocal()
        : null,
  );

  /// The app's status for the API's: an expired trip is no active trip.
  static TripStatus status(Object? value) => switch (value) {
    'active' => TripStatus.active,
    'noHistory' => TripStatus.noHistory,
    'noActive' || 'expired' => TripStatus.noActive,
    _ => throw FormatException('Unknown trip status: $value'),
  };

  static String _string(Map<String, dynamic> json, String key) {
    final value = json[key];
    if (value is! String) throw FormatException('Missing trip $key');
    return value;
  }

  static DateTime _date(Map<String, dynamic> json, String key) =>
      DateTime.parse(_string(json, key)).toLocal();
}

import '../../../auth/domain/entities/officer.dart';
import '../../../chl_trips/data/models/chl_trip_model.dart';
import '../../../chl_trips/domain/entities/trip_status.dart';
import '../../../vehicle/domain/entities/e_tag_status.dart';
import '../../../verification/data/models/verification_response_model.dart';
import '../../../verification/domain/entities/plate_number.dart';
import '../../../verification/domain/entities/verification_method.dart';
import '../../domain/entities/verification_record.dart';
import '../../domain/entities/verification_record_details.dart';

/// JSON mapping for [VerificationRecord], from the enforcement API's
/// verifications (history and dashboard).
abstract final class VerificationRecordModel {
  /// The record for [json], made by [officer] (the history is the officer's
  /// own). Null for a check where CHL found no vehicle: the server keeps it
  /// for the audit trail, but it isn't listed. Throws [FormatException] on
  /// a record the app can't read.
  static VerificationRecord? fromJson(
    Map<String, dynamic> json, {
    required Officer? officer,
  }) {
    final id = json['id'];
    if (id is! String) throw const FormatException('Missing record id');
    final recordedAt = DateTime.parse(json['checkedAt'] as String).toLocal();
    final method = _method(json['method']);
    final plate = json['plate'] as String?;
    final plateNumber = plate == null
        ? 'Not identified'
        : PlateNumber.tryParse(plate)?.display ?? plate;

    VerificationRecordDetails details({
      required String actionTaken,
      ETagStatus? tagStatus,
      String? pendingAction,
    }) => VerificationRecordDetails(
      reference: json['reference'] as String? ?? id,
      vehicleType: _vehicleType(json),
      agentName: officer?.name ?? '',
      agentId: officer?.agentId ?? officer?.id ?? '',
      actionTaken: actionTaken,
      tagStatus: tagStatus,
      pendingAction: pendingAction,
      location: _location(json['location']),
    );

    switch (json['outcome']) {
      case 'vehicleNotFound' || 'unknownTag':
        return null;
      case 'unavailable':
        return VerificationRecord(
          id: id,
          plateNumber: plateNumber,
          method: method,
          outcome: VerificationOutcome.notCompleted,
          recordedAt: recordedAt,
          details: details(
            actionTaken: 'None',
            pendingAction:
                'Retry the verification when connectivity is available',
          ),
        );
      case 'found':
        final eTag = json['eTag'];
        final eTagStatus = eTag is Map<String, dynamic>
            ? VerificationResponseModel.eTagStatus(eTag['status'])
            : null;
        // A scanned E-Tag is an E-Tag check; anything else a trip check.
        if (json['method'] == 'eTag') {
          final valid = eTagStatus == ETagStatus.valid;
          return VerificationRecord(
            id: id,
            plateNumber: plateNumber,
            eTagStatus: eTagStatus ?? ETagStatus.missing,
            method: method,
            outcome: valid
                ? VerificationOutcome.validated
                : VerificationOutcome.checked,
            recordedAt: recordedAt,
            details: details(
              actionTaken: valid ? 'Validated' : 'Unverified',
              tagStatus: eTagStatus,
            ),
          );
        }
        final trip = json['trip'];
        final tripStatus = ChlTripModel.status(
          trip is Map<String, dynamic> ? trip['status'] : null,
        );
        final verified = tripStatus == TripStatus.active;
        return VerificationRecord(
          id: id,
          plateNumber: plateNumber,
          tripStatus: tripStatus,
          method: method,
          outcome: verified
              ? VerificationOutcome.verified
              : VerificationOutcome.checked,
          recordedAt: recordedAt,
          details: details(
            actionTaken: verified ? 'Verified' : 'Unverified',
            tagStatus: eTagStatus,
          ),
        );
      default:
        throw FormatException('Unexpected outcome: ${json['outcome']}');
    }
  }

  /// Every readable record in [items], in order.
  static List<VerificationRecord> listFromJson(
    Object? items, {
    required Officer? officer,
  }) {
    if (items is! List) throw const FormatException('Missing items');
    return [
      for (final item in items)
        ?fromJson(item as Map<String, dynamic>, officer: officer),
    ];
  }

  static VerificationMethod _method(Object? value) => switch (value) {
    'plate' => VerificationMethod.manualPlate,
    'qrCode' || 'eTag' => VerificationMethod.qrCode,
    'rfid' => VerificationMethod.rfid,
    _ => throw FormatException('Unknown method: $value'),
  };

  static String _vehicleType(Map<String, dynamic> json) {
    final vehicle = json['vehicle'];
    return vehicle is Map<String, dynamic>
        ? vehicle['type'] as String? ?? ''
        : '';
  }

  static RecordLocation? _location(Object? json) {
    if (json is! Map<String, dynamic>) return null;
    return RecordLocation(
      latitude: (json['latitude'] as num).toDouble(),
      longitude: (json['longitude'] as num).toDouble(),
    );
  }
}

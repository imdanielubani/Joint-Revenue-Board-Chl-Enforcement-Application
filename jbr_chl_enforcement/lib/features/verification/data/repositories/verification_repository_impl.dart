import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

import '../../../../app/environment/app_environment.dart';
import '../../../../core/constants/api_endpoints.dart';
import '../../../../core/utils/clock.dart';
import '../../../../shared/device/location/location_adapter.dart';
import '../../../../shared/networking/api_error.dart';
import '../../../../shared/networking/dio_provider.dart';
import '../../../chl_trips/domain/entities/chl_trip.dart';
import '../../../chl_trips/domain/entities/trip_status.dart';
import '../../../vehicle/domain/entities/e_tag_status.dart';
import '../../../vehicle/domain/entities/load_status.dart';
import '../../../vehicle/domain/entities/verification_result.dart';
import '../../domain/entities/haulage_tag.dart';
import '../../domain/entities/plate_number.dart';
import '../../domain/entities/verification_request.dart';
import '../../domain/repositories/verification_repository.dart';
import '../models/verification_request_model.dart';
import '../models/verification_response_model.dart';

/// Verifications: sample results in demo mode, otherwise the API's.
final verificationRepositoryProvider = Provider<VerificationRepository>(
  (ref) => AppEnvironment.authDemoMode
      ? DemoVerificationRepository(now: ref.watch(clockProvider))
      : RemoteVerificationRepository(
          ref.watch(dioProvider),
          isConfigured: AppEnvironment.hasApi,
        ),
);

/// Verifications with the enforcement API, which asks CHL and records
/// every attempt with the officer's location.
class RemoteVerificationRepository implements VerificationRepository {
  RemoteVerificationRepository(
    this._dio, {
    required this._isConfigured,
    this._uuid = const Uuid(),
  });

  final Dio _dio;
  final bool _isConfigured;
  final Uuid _uuid;

  static const String _fallback =
      'Verification could not be completed. Please try again.';

  @override
  Stream<VerificationProgress> verify(
    VerificationRequest request, {
    required DeviceLocation location,
  }) async* {
    _checkConfigured();
    yield const StageStarted(VerificationStage.identifyingVehicle);
    final json = await _post(
      ApiEndpoints.verifications,
      VerificationRequestModel.toJson(request, location),
      // The same key on a retried request returns the first result.
      headers: {'Idempotency-Key': _uuid.v4()},
    );
    final response = _read(
      () => VerificationResponseModel.fromJson(
        _map(json['verification']),
        location: location,
      ),
    );
    switch (response) {
      case VehicleMissing():
        yield const NoVehicleFound();
      case VehicleFound(:final result):
        // CHL answers every check at once; the stages follow each other.
        yield VehicleIdentified(result.plate);
        yield const StageStarted(VerificationStage.validatingETag);
        yield const StageStarted(VerificationStage.checkingTrip);
        yield VerificationCompleted(result);
    }
  }

  @override
  Future<VerificationResult> refresh(VerificationResult result) async {
    final json = await _post(ApiEndpoints.tripRefresh(_idOf(result)), {});
    return _read(
      () => VerificationResponseModel.withTrip(
        result,
        _map(json['trip']),
        checkedAt: DateTime.now(),
      ),
    );
  }

  @override
  Future<void> recordLoadStatus(
    VerificationResult result,
    LoadStatus status,
  ) async {
    final location = result.location;
    if (location == null) {
      throw const VerificationFailure(
        'The verification location is missing. Verify the vehicle again.',
      );
    }
    await _post(ApiEndpoints.loadStatus(_idOf(result)), {
      'status': status.name,
      'location': VerificationRequestModel.locationToJson(location),
    });
  }

  @override
  Future<RecordedLocation> recordDestinationLocation(
    VerificationResult result,
    DeviceLocation location,
  ) async {
    final json = await _post(ApiEndpoints.destinationLocation(_idOf(result)), {
      'location': VerificationRequestModel.locationToJson(location),
    });
    return _read(() {
      final recorded = _map(json['destinationLocation']);
      return RecordedLocation(
        latitude: (recorded['latitude'] as num).toDouble(),
        longitude: (recorded['longitude'] as num).toDouble(),
        accuracyMetres:
            (recorded['accuracyMetres'] as num?)?.toDouble() ??
            location.accuracyMetres,
        recordedAt: DateTime.parse(recorded['recordedAt'] as String).toLocal(),
      );
    });
  }

  @override
  Future<List<HaulageTag>> resolvePlates(List<HaulageTag> tags) async {
    final unresolved = [
      for (final tag in tags)
        if (tag.plate == null) tag.reference,
    ];
    if (!_isConfigured || unresolved.isEmpty) return tags;
    try {
      final json = await _post(ApiEndpoints.resolveTags, {
        'tagReferences': unresolved,
      });
      final plates = <String, PlateNumber>{
        for (final entry in json['tags'] as List<dynamic>)
          if (entry case {
            'tagReference': final String reference,
            'plate': final String plate,
          })
            reference: ?PlateNumber.tryParse(plate),
      };
      return [
        for (final tag in tags)
          switch (plates[tag.reference]) {
            final plate? when tag.plate == null => HaulageTag(
              tag.reference,
              plate: plate,
            ),
            _ => tag,
          },
      ];
    } on Object catch (error) {
      debugPrint('Could not resolve tag plates: $error');
      return tags;
    }
  }

  void _checkConfigured() {
    if (!_isConfigured) {
      throw const VerificationFailure(
        'Verification is unavailable on this device. Contact your '
        'administrator.',
      );
    }
  }

  String _idOf(VerificationResult result) {
    _checkConfigured();
    final id = result.id;
    if (id == null) {
      throw const VerificationFailure(
        'This result was not recorded. Verify the vehicle again.',
      );
    }
    return id;
  }

  /// Posts [body] and returns the answer; any failure becomes a
  /// [VerificationFailure] with a message for the officer.
  Future<Map<String, dynamic>> _post(
    String path,
    Map<String, dynamic> body, {
    Map<String, String>? headers,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        path,
        data: body,
        options: Options(headers: headers),
      );
      return response.data ?? const {};
    } on DioException catch (error) {
      throw VerificationFailure(ApiError.describe(error, fallback: _fallback));
    }
  }

  static T _read<T>(T Function() parse) {
    try {
      return parse();
    } on Object catch (error) {
      debugPrint('Unexpected verification answer: $error');
      throw const VerificationFailure(_fallback);
    }
  }

  static Map<String, dynamic> _map(Object? value) {
    if (value is! Map<String, dynamic>) {
      throw const FormatException('Unexpected answer');
    }
    return value;
  }
}

/// Sample verifications, each check taking a moment as it would over a
/// network:
/// - AAA 000 AA, and a scanned code ending "-404", is not a known vehicle;
/// - AAA 503 AA, and a scanned code ending "-503", cannot be verified (CHL
///   does not respond);
/// - AAA 001 AA has never made a CHL trip (No Trip History);
/// - LND 482 XK has no active trip (and an invalid E-Tag), and a
///   completed last trip;
/// - any other plate, and a scanned QR code (ABC 123 AA), has an active
///   trip from Abeokuta South, Ogun, to Ikeja, Lagos, and no E-Tag;
/// - a haulage tag read by RFID is ABC 123 AA's tag: the same trip, with a
///   valid JRB E-Tag.
class DemoVerificationRepository implements VerificationRepository {
  DemoVerificationRepository({
    required this.now,
    this.stepDelay = const Duration(milliseconds: 800),
  });

  final DateTime Function() now;

  /// How long each check takes.
  final Duration stepDelay;

  static final PlateNumber _qrCodePlate = PlateNumber.tryParse('ABC123AA')!;
  static final PlateNumber _noTripPlate = PlateNumber.tryParse('LND482XK')!;
  static final PlateNumber _noHistoryPlate = PlateNumber.tryParse('AAA001AA')!;
  static final PlateNumber _unknownPlate = PlateNumber.tryParse('AAA000AA')!;
  static final PlateNumber _unavailablePlate = PlateNumber.tryParse(
    'AAA503AA',
  )!;

  @override
  Stream<VerificationProgress> verify(
    VerificationRequest request, {
    required DeviceLocation location,
  }) async* {
    yield const StageStarted(VerificationStage.identifyingVehicle);
    await Future<void>.delayed(stepDelay);
    final code = switch (request) {
      QrVerification(:final code) => code.value,
      _ => '',
    };
    if (request.plate == _unknownPlate || code.endsWith('-404')) {
      yield const NoVehicleFound();
      return;
    }
    if (request.plate == _unavailablePlate || code.endsWith('-503')) {
      throw const VerificationFailure('CHL is not responding.');
    }
    final plate = request.plate ?? _qrCodePlate;
    yield VehicleIdentified(plate);

    yield const StageStarted(VerificationStage.validatingETag);
    await Future<void>.delayed(stepDelay);
    final eTag = switch (request) {
      TagVerification() => ETagStatus.valid,
      _ when plate == _noTripPlate => ETagStatus.invalid,
      _ => ETagStatus.missing,
    };

    yield const StageStarted(VerificationStage.checkingTrip);
    await Future<void>.delayed(stepDelay);
    yield VerificationCompleted(_result(plate, eTag, location));
  }

  VerificationResult _result(
    PlateNumber plate,
    ETagStatus eTag,
    DeviceLocation location,
  ) {
    final at = now();
    if (plate == _noHistoryPlate) {
      return VerificationResult(
        plate: plate,
        vehicleType: '12/14 tyres and its equivalent',
        eTagStatus: eTag,
        tripStatus: TripStatus.noHistory,
        checkedAt: at,
        location: location,
      );
    }
    if (plate == _noTripPlate) {
      return VerificationResult(
        plate: plate,
        vehicleType: '12/14 tyres and its equivalent',
        eTagStatus: eTag,
        tripStatus: TripStatus.noActive,
        checkedAt: at,
        lastTrip: _lastTrip(at),
        location: location,
      );
    }
    final started = at.subtract(const Duration(hours: 2, minutes: 8));
    return VerificationResult(
      plate: plate,
      vehicleType: '12/14 tyres and its equivalent',
      eTagStatus: eTag,
      tripStatus: TripStatus.active,
      checkedAt: at,
      location: location,
      trip: ChlTrip(
        transactionReference: '564031956608',
        startedAt: started,
        paidAt: started.subtract(const Duration(minutes: 6)),
        transactionType: 'Complete Leg',
        transactionStatus: 'Successful',
        originState: 'Ogun',
        originLga: 'Abeokuta South',
        destinationState: 'Lagos',
        destinationLga: 'Ikeja',
        validUntil: at.add(const Duration(hours: 4, minutes: 21, seconds: 2)),
        cargo: 'General haulage',
        paymentReference: 'PAY-2026-08142',
        terminalId: '2070MJHU',
        contactNumber: '8139751699',
        channel: 'Fortis',
        channelType: 'POS',
      ),
      destinationCheck: const DestinationCheck(
        enforcementPoint: 'Ikeja enforcement point',
        completionDecision: 'Awaiting central validation',
        centralDelay: Duration(seconds: 900),
      ),
    );
  }

  /// LND 482 XK's last trip: Abeokuta South, Ogun, to Ikeja, Lagos,
  /// completed the day before.
  ChlTrip _lastTrip(DateTime at) {
    final started = at.subtract(const Duration(days: 1, hours: 8));
    return ChlTrip(
      transactionReference: '564031950271',
      startedAt: started,
      paidAt: started.subtract(const Duration(minutes: 6)),
      transactionType: 'Complete Leg',
      transactionStatus: 'Successful',
      originState: 'Ogun',
      originLga: 'Abeokuta South',
      destinationState: 'Lagos',
      destinationLga: 'Ikeja',
      validUntil: started.add(const Duration(hours: 12)),
      cargo: 'General haulage',
      paymentReference: 'PAY-2026-07960',
      terminalId: '2070MJHU',
      contactNumber: '8139751699',
      channel: 'Fortis',
      channelType: 'POS',
      state: ChlTripState.completed,
      completedAt: started.add(const Duration(hours: 5, minutes: 17)),
    );
  }

  @override
  Future<void> recordLoadStatus(VerificationResult result, LoadStatus status) =>
      Future<void>.delayed(stepDelay);

  @override
  Future<VerificationResult> refresh(VerificationResult result) async {
    await Future<void>.delayed(stepDelay);
    return VerificationResult(
      plate: result.plate,
      vehicleType: result.vehicleType,
      eTagStatus: result.eTagStatus,
      tripStatus: result.tripStatus,
      checkedAt: now(),
      trip: result.trip,
      destinationCheck: result.destinationCheck,
      lastTrip: result.lastTrip,
      location: result.location,
    );
  }

  @override
  Future<List<HaulageTag>> resolvePlates(List<HaulageTag> tags) async => tags;

  @override
  Future<RecordedLocation> recordDestinationLocation(
    VerificationResult result,
    DeviceLocation location,
  ) async {
    await Future<void>.delayed(stepDelay);
    return RecordedLocation(
      latitude: location.latitude,
      longitude: location.longitude,
      accuracyMetres: location.accuracyMetres,
      recordedAt: now(),
    );
  }
}

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../app/environment/app_environment.dart';
import '../../../../core/utils/clock.dart';
import '../../../chl_trips/domain/entities/trip_status.dart';
import '../../../vehicle/domain/entities/e_tag_status.dart';
import '../../../verification/domain/entities/verification_method.dart';
import '../../domain/entities/verification_record.dart';
import '../../domain/entities/verification_record_details.dart';
import '../../domain/repositories/history_repository.dart';

/// The history: sample records in demo mode, otherwise the officer's own.
final historyRepositoryProvider = Provider<HistoryRepository>(
  (ref) => AppEnvironment.authDemoMode
      ? DemoHistoryRepository(now: ref.watch(clockProvider))
      : const RemoteHistoryRepository(),
);

/// The officer's records on the server.
// TODO(verification_history): read the officer's records from the CHL API
// (and the ones saved on the phone) once they exist. Until then the history
// is empty.
class RemoteHistoryRepository implements HistoryRepository {
  const RemoteHistoryRepository();

  @override
  Future<List<VerificationRecord>> fetchHistory() async => const [];
}

/// Seven sample records: five today, one 17 days ago (inside the last 30
/// days) and one 37 days ago (outside), so both periods can be tried before
/// the backend exists. Loading takes a moment, as it would over a network.
class DemoHistoryRepository implements HistoryRepository {
  DemoHistoryRepository({
    required this.now,
    this.delay = const Duration(milliseconds: 900),
  });

  final DateTime Function() now;
  final Duration delay;

  /// The unfinished sample record, which a sample notification links to.
  static const String unfinishedRecordId = 'VR-1042';

  /// The demo account's officer (see `DemoAuthRepository`).
  static const String _agentName = 'Demo Officer';
  static const String _agentId = 'JRB-AG-0142';

  @override
  Future<List<VerificationRecord>> fetchHistory() async {
    await Future<void>.delayed(delay);
    return _samples(now());
  }

  static List<VerificationRecord> _samples(DateTime now) {
    DateTime on(int daysAgo, int hour, int minute) =>
        DateTime(now.year, now.month, now.day - daysAgo, hour, minute);

    return [
      VerificationRecord(
        id: 'VR-1051',
        plateNumber: 'ABC 123 AA',
        tripStatus: TripStatus.active,
        method: VerificationMethod.manualPlate,
        outcome: VerificationOutcome.verified,
        recordedAt: on(0, 9, 34),
        details: const VerificationRecordDetails(
          reference: 'VRE-222-001',
          vehicleType: 'Heavy goods vehicle',
          agentName: _agentName,
          agentId: _agentId,
          actionTaken: 'Verified',
          tagStatus: ETagStatus.valid,
          location: RecordLocation(latitude: 8.97439, longitude: 7.45280),
        ),
      ),
      VerificationRecord(
        id: 'VR-1050',
        plateNumber: 'LND 482 XK',
        tripStatus: TripStatus.noActive,
        method: VerificationMethod.manualPlate,
        outcome: VerificationOutcome.checked,
        recordedAt: on(0, 9, 21),
        details: const VerificationRecordDetails(
          reference: 'VRE-222-002',
          vehicleType: 'Heavy goods vehicle',
          agentName: _agentName,
          agentId: _agentId,
          actionTaken: 'Unverified',
          tagStatus: ETagStatus.invalid,
          pendingAction: 'Complete required evidence and submit',
          location: RecordLocation(latitude: 8.97439, longitude: 7.45280),
        ),
      ),
      VerificationRecord(
        id: 'VR-1049',
        plateNumber: 'KJA 719 FG',
        tripStatus: TripStatus.active,
        method: VerificationMethod.qrCode,
        outcome: VerificationOutcome.verified,
        recordedAt: on(0, 9, 8),
        details: const VerificationRecordDetails(
          reference: 'VRE-222-003',
          vehicleType: 'Mini truck',
          agentName: _agentName,
          agentId: _agentId,
          actionTaken: 'Verified',
          tagStatus: ETagStatus.valid,
          location: RecordLocation(latitude: 9.05785, longitude: 7.49508),
        ),
      ),
      VerificationRecord(
        id: 'VR-1048',
        plateNumber: 'AKD 308 TY',
        tripStatus: TripStatus.active,
        method: VerificationMethod.manualPlate,
        outcome: VerificationOutcome.verified,
        recordedAt: on(0, 8, 56),
        details: const VerificationRecordDetails(
          reference: 'VRE-222-004',
          vehicleType: 'Articulated truck',
          agentName: _agentName,
          agentId: _agentId,
          actionTaken: 'Verified',
        ),
      ),
      VerificationRecord(
        id: 'VR-1047',
        plateNumber: 'GGE 651 PL',
        eTagStatus: ETagStatus.valid,
        method: VerificationMethod.qrCode,
        outcome: VerificationOutcome.validated,
        recordedAt: on(0, 8, 42),
      ),
      VerificationRecord(
        id: unfinishedRecordId,
        plateNumber: 'BDG 204 XY',
        method: VerificationMethod.qrCode,
        outcome: VerificationOutcome.notCompleted,
        recordedAt: on(17, 10, 18),
        details: const VerificationRecordDetails(
          reference: 'VRE-221-087',
          vehicleType: 'Heavy goods vehicle',
          agentName: _agentName,
          agentId: _agentId,
          actionTaken: 'None',
          pendingAction:
              'Retry the verification when connectivity is '
              'available',
          location: RecordLocation(latitude: 9.05785, longitude: 7.49508),
        ),
      ),
      VerificationRecord(
        id: 'VR-1031',
        plateNumber: 'APP 610 KS',
        eTagStatus: ETagStatus.invalid,
        method: VerificationMethod.qrCode,
        outcome: VerificationOutcome.checked,
        recordedAt: on(37, 14, 46),
      ),
    ];
  }
}

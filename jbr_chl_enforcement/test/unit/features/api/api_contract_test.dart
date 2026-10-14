import 'package:flutter_test/flutter_test.dart';
import 'package:jbr_chl_enforcement/features/auth/data/models/auth_token_model.dart';
import 'package:jbr_chl_enforcement/features/auth/domain/entities/agent_access.dart';
import 'package:jbr_chl_enforcement/features/auth/domain/entities/officer.dart';
import 'package:jbr_chl_enforcement/features/chl_trips/domain/entities/chl_trip.dart';
import 'package:jbr_chl_enforcement/features/chl_trips/domain/entities/trip_status.dart';
import 'package:jbr_chl_enforcement/features/dashboard/data/models/dashboard_summary_model.dart';
import 'package:jbr_chl_enforcement/features/notifications/data/models/app_notification_model.dart';
import 'package:jbr_chl_enforcement/features/notifications/domain/entities/notification_type.dart';
import 'package:jbr_chl_enforcement/features/vehicle/domain/entities/e_tag_status.dart';
import 'package:jbr_chl_enforcement/features/verification/data/models/verification_response_model.dart';
import 'package:jbr_chl_enforcement/features/verification/domain/entities/verification_method.dart';
import 'package:jbr_chl_enforcement/features/verification_history/data/models/verification_record_model.dart';
import 'package:jbr_chl_enforcement/features/verification_history/domain/entities/verification_record.dart';

import '../../../helpers/fake_api.dart';

/// The app reads what iteime_backend actually sends: every fixture here
/// was recorded from the running backend (with its sample CHL data).
void main() {
  const officer = Officer(
    id: 'JRB-AG-0142',
    name: 'Demo Officer',
    email: 'officer@jbr.com',
    agentId: 'JRB-AG-0142',
  );

  VerificationResponse verification(String name) =>
      VerificationResponseModel.fromJson(
        fixture(name)['verification'] as Map<String, dynamic>,
      );

  group('sign-in', () {
    test('reads the agent and the 24-hour session', () {
      final session = AuthTokenModel.fromLoginResponse(
        fixture('login'),
        receivedAt: DateTime.now(),
      );
      expect(session.accessToken, 'login-access-token');
      expect(session.refreshToken, 'login-refresh-token');
      expect(session.expiresAt, DateTime.parse('2026-10-15T02:56:55.979Z'));
      expect(session.officer.id, 'JRB-AG-0142');
      expect(session.officer.agentId, 'JRB-AG-0142');
      expect(session.officer.name, 'Demo Officer');
      expect(session.officer.region, 'Lagos');
      expect(session.officer.assignment, 'Ikeja enforcement point');
      expect(AgentAccessPolicy.allows(session.officer), isTrue);
    });

    test('a refresh keeps the officer and replaces the tokens', () {
      final session = AuthTokenModel.fromLoginResponse(
        fixture('login'),
        receivedAt: DateTime.now(),
      );
      final renewed = AuthTokenModel.renewed(session, fixture('refresh'));
      expect(renewed.accessToken, 'refresh-access-token');
      expect(renewed.refreshToken, 'refresh-refresh-token');
      expect(renewed.officer, same(session.officer));
      expect(renewed.expiresAt, session.expiresAt);
    });
  });

  group('verification', () {
    test('an active trip, with its destination check', () {
      final result = (verification('verify_active') as VehicleFound).result;
      expect(result.id, isNotNull);
      expect(result.plate.display, 'ABC 123 AA');
      expect(result.vehicleType, '12/14 tyres and its equivalent');
      expect(result.eTagStatus, ETagStatus.valid);
      expect(result.tripStatus, TripStatus.active);
      expect(result.trip!.transactionReference, '564031956608');
      expect(result.trip!.originLga, 'Abeokuta South');
      expect(result.trip!.destinationLga, 'Ikeja');
      expect(result.trip!.terminalId, '2070MJHU');
      expect(result.trip!.state, ChlTripState.active);
      expect(result.destinationCheck!.enforcementPoint, isNotEmpty);
      expect(result.destinationCheck!.centralDelay, isNot(Duration.zero));
      expect(result.location!.latitude, 6.6018);
    });

    test('no active trip, with the last one', () {
      final result = (verification('verify_no_active') as VehicleFound).result;
      expect(result.tripStatus, TripStatus.noActive);
      expect(result.eTagStatus, ETagStatus.invalid);
      expect(result.trip, isNull);
      expect(result.lastTrip!.state, ChlTripState.completed);
      expect(result.lastTrip!.completedAt, isNotNull);
    });

    test('no trip history; an expired trip is no active trip', () {
      expect(
        (verification('verify_no_history') as VehicleFound).result.tripStatus,
        TripStatus.noHistory,
      );
      final expired = (verification('verify_expired') as VehicleFound).result;
      expect(expired.tripStatus, TripStatus.noActive);
      expect(expired.lastTrip!.state, ChlTripState.expired);
    });

    test("another vehicle's E-Tag is invalid", () {
      expect(
        (verification('verify_mismatch') as VehicleFound).result.eTagStatus,
        ETagStatus.invalid,
      );
    });

    test('no vehicle, or a tag CHL does not know', () {
      expect(verification('verify_not_found'), isA<VehicleMissing>());
      expect(verification('verify_unknown_tag'), isA<VehicleMissing>());
    });

    test('a refreshed trip keeps the vehicle', () {
      final before = (verification('verify_active') as VehicleFound).result;
      final after = VerificationResponseModel.withTrip(
        before,
        fixture('trip_refresh')['trip'] as Map<String, dynamic>,
        checkedAt: DateTime(2026, 10, 14, 10),
      );
      expect(after.id, before.id);
      expect(after.plate, before.plate);
      expect(after.tripStatus, TripStatus.active);
      expect(after.checkedAt, DateTime(2026, 10, 14, 10));
    });
  });

  group('history and dashboard', () {
    test('lists checks of found vehicles and unfinished ones', () {
      final records = VerificationRecordModel.listFromJson(
        fixture('history')['items'],
        officer: officer,
      );
      // 9 verifications were made; 2 found no vehicle and aren't listed.
      expect(records, hasLength(7));

      final unfinished = records.firstWhere(
        (record) => record.outcome == VerificationOutcome.notCompleted,
      );
      expect(unfinished.plateNumber, 'AAA 503 AA');
      expect(unfinished.tripStatus, isNull);
      expect(unfinished.eTagStatus, isNull);
      expect(unfinished.details!.pendingAction, contains('Retry'));

      final eTag = records.firstWhere((record) => record.isETagCheck);
      expect(eTag.eTagStatus, ETagStatus.valid);
      expect(eTag.outcome, VerificationOutcome.validated);
      expect(eTag.method, VerificationMethod.qrCode);

      final active = records.firstWhere(
        (record) => record.plateNumber == 'ABC 123 AA' && !record.isETagCheck,
      );
      expect(active.outcome, VerificationOutcome.verified);
      expect(active.method, VerificationMethod.manualPlate);
      expect(active.details!.agentName, 'Demo Officer');
      expect(active.details!.agentId, 'JRB-AG-0142');
      expect(active.details!.reference, startsWith('VRF-'));
      expect(active.details!.location, isNotNull);
    });

    test("today's figures and recent verifications", () {
      final summary = DashboardSummaryModel.fromJson(
        fixture('dashboard'),
        officer: officer,
      );
      expect(summary.totalVerifications, 9);
      expect(summary.activeTrips, 2);
      expect(summary.noActiveTrips, 4);
      expect(summary.violationsIssued, 0);
      expect(summary.recentVerifications, isNotEmpty);
    });
  });

  test('notifications: categories this app knows', () {
    final inbox = AppNotificationModel.listFromJson(
      fixture('notifications')['items'],
    );
    expect(inbox, hasLength(1));
    expect(inbox.single.type, NotificationType.incompleteVerification);
    expect(inbox.single.summary, 'AAA 503 AA was not verified');
    expect(inbox.single.isRead, isFalse);
  });
}

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../app/environment/app_environment.dart';
import '../../../../core/constants/api_endpoints.dart';
import '../../../../shared/networking/dio_provider.dart';
import '../../../auth/domain/entities/officer.dart';
import '../../../auth/presentation/providers/session_provider.dart';
import '../../../chl_trips/domain/entities/trip_status.dart';
import '../../../vehicle/domain/entities/e_tag_status.dart';
import '../../../verification/domain/entities/verification_method.dart';
import '../../../verification_history/domain/entities/verification_record.dart';
import '../../domain/entities/dashboard_summary.dart';
import '../../domain/repositories/dashboard_repository.dart';
import '../models/dashboard_summary_model.dart';

/// Sample figures in debug demo mode; otherwise the officer's own, from the
/// enforcement API (or none when no API is configured).
final dashboardRepositoryProvider = Provider<DashboardRepository>(
  (ref) => AppEnvironment.authDemoMode
      ? const DemoDashboardRepository()
      : AppEnvironment.hasApi
      ? RemoteDashboardRepository(
          ref.watch(dioProvider),
          officer: () => ref.read(sessionProvider)?.officer,
        )
      : const LocalDashboardRepository(),
);

/// Today's figures from the enforcement API. The server counts the day in
/// Lagos time, whatever the phone's time zone.
class RemoteDashboardRepository implements DashboardRepository {
  const RemoteDashboardRepository(this._dio, {required this.officer});

  final Dio _dio;

  /// The signed-in officer, who made the recent verifications.
  final Officer? Function() officer;

  /// Throws [DioException] when the figures can't be loaded and
  /// [FormatException] on an answer the app can't read.
  @override
  Future<DashboardSummary> getSummary(DateTime day) async {
    final response = await _dio.get<Map<String, dynamic>>(
      ApiEndpoints.dashboard,
    );
    return DashboardSummaryModel.fromJson(
      response.data ?? const {},
      officer: officer(),
    );
  }
}

/// Figures from the verifications recorded on this device.
class LocalDashboardRepository implements DashboardRepository {
  const LocalDashboardRepository();

  @override
  Future<DashboardSummary> getSummary(DateTime day) async {
    // TODO(verification_history): count today's records from the local
    // database once verifications are stored.
    return DashboardSummary.empty;
  }
}

/// Sample day for trying the app (debug demo mode only).
class DemoDashboardRepository implements DashboardRepository {
  const DemoDashboardRepository() : assert(!kReleaseMode);

  @override
  Future<DashboardSummary> getSummary(DateTime day) async {
    DateTime at(int hour, int minute) =>
        DateTime(day.year, day.month, day.day, hour, minute);

    return DashboardSummary(
      totalVerifications: 5,
      activeTrips: 3,
      noActiveTrips: 1,
      violationsIssued: 1,
      recentVerifications: [
        VerificationRecord(
          id: 'demo-1',
          plateNumber: 'ABC 123 AA',
          tripStatus: TripStatus.active,
          method: VerificationMethod.rfid,
          outcome: VerificationOutcome.verified,
          recordedAt: at(9, 34),
        ),
        VerificationRecord(
          id: 'demo-2',
          plateNumber: 'LND 482 XK',
          tripStatus: TripStatus.noActive,
          method: VerificationMethod.manualPlate,
          outcome: VerificationOutcome.checked,
          recordedAt: at(9, 21),
        ),
        VerificationRecord(
          id: 'demo-3',
          plateNumber: 'KJA 719 FG',
          tripStatus: TripStatus.active,
          method: VerificationMethod.qrCode,
          outcome: VerificationOutcome.verified,
          recordedAt: at(9, 8),
        ),
        VerificationRecord(
          id: 'demo-4',
          plateNumber: 'AKD 308 TY',
          tripStatus: TripStatus.active,
          method: VerificationMethod.manualPlate,
          outcome: VerificationOutcome.verified,
          recordedAt: at(8, 56),
        ),
        VerificationRecord(
          id: 'demo-5',
          plateNumber: 'GGE 651 PL',
          eTagStatus: ETagStatus.valid,
          method: VerificationMethod.qrCode,
          outcome: VerificationOutcome.validated,
          recordedAt: at(8, 42),
        ),
      ],
    );
  }
}

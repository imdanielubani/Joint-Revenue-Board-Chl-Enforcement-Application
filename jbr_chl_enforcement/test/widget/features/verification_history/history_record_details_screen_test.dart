import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:jbr_chl_enforcement/core/navigation/route_names.dart';
import 'package:jbr_chl_enforcement/core/theme/app_theme.dart';
import 'package:jbr_chl_enforcement/features/chl_trips/domain/entities/trip_status.dart';
import 'package:jbr_chl_enforcement/features/vehicle/domain/entities/e_tag_status.dart';
import 'package:jbr_chl_enforcement/features/verification/domain/entities/plate_number.dart';
import 'package:jbr_chl_enforcement/features/verification/domain/entities/verification_method.dart';
import 'package:jbr_chl_enforcement/features/verification_history/data/repositories/history_repository_impl.dart';
import 'package:jbr_chl_enforcement/features/verification_history/domain/entities/verification_record.dart';
import 'package:jbr_chl_enforcement/features/verification_history/domain/entities/verification_record_details.dart';
import 'package:jbr_chl_enforcement/features/verification_history/presentation/screens/history_record_details_screen.dart';
import 'package:jbr_chl_enforcement/shared/ui/widgets/app_spinner.dart';
import 'package:jbr_chl_enforcement/shared/ui/widgets/empty_state.dart';

import '../../../helpers/fakes.dart';

/// The two records in the designs.
final _active = VerificationRecord(
  id: 'VR-1051',
  plateNumber: 'ABC 123 AA',
  tripStatus: TripStatus.active,
  method: VerificationMethod.manualPlate,
  outcome: VerificationOutcome.verified,
  recordedAt: DateTime(2026, 10, 11, 9, 34),
  details: const VerificationRecordDetails(
    reference: 'VRE-222-001',
    vehicleType: 'Heavy goods vehicle',
    agentName: 'Demo Officer',
    agentId: 'JRB-AG-0142',
    actionTaken: 'Verified',
    tagStatus: ETagStatus.valid,
    location: RecordLocation(latitude: 8.97439, longitude: 7.4528),
  ),
);

final _noActive = VerificationRecord(
  id: 'VR-1050',
  plateNumber: 'LND 482 XK',
  tripStatus: TripStatus.noActive,
  method: VerificationMethod.manualPlate,
  outcome: VerificationOutcome.checked,
  recordedAt: DateTime(2026, 10, 11, 9, 34),
  details: const VerificationRecordDetails(
    reference: 'VRE-222-002',
    vehicleType: 'Heavy goods vehicle',
    agentName: 'Demo Officer',
    agentId: 'JRB-AG-0142',
    actionTaken: 'Unverified',
    tagStatus: ETagStatus.invalid,
    pendingAction: 'Complete required evidence and submit',
    location: RecordLocation(latitude: 8.97439, longitude: 7.4528),
  ),
);

/// A trip record the server sent without its details.
final _bare = VerificationRecord(
  id: 'VR-1049',
  plateNumber: 'KJA 719 FG',
  tripStatus: TripStatus.active,
  method: VerificationMethod.qrCode,
  outcome: VerificationOutcome.verified,
  recordedAt: DateTime(2026, 10, 11, 9, 8),
);

final _eTag = VerificationRecord(
  id: 'VR-1047',
  plateNumber: 'GGE 651 PL',
  eTagStatus: ETagStatus.valid,
  method: VerificationMethod.qrCode,
  outcome: VerificationOutcome.validated,
  recordedAt: DateTime(2026, 10, 11, 8, 42),
);

Widget _page(String label) => Scaffold(body: Center(child: Text(label)));

GoRouter _router(String id) => GoRouter(
  initialLocation: '/history/$id',
  routes: [
    GoRoute(
      path: RoutePaths.history,
      name: RouteNames.history,
      builder: (context, state) => _page('history page'),
    ),
    GoRoute(
      path: RoutePaths.historyRecord,
      name: RouteNames.historyRecord,
      builder: (context, state) =>
          HistoryRecordDetailsScreen(id: state.pathParameters['id']!),
    ),
    GoRoute(
      path: RoutePaths.verificationResult,
      name: RouteNames.verificationResult,
      builder: (context, state) =>
          _page('result ${(state.extra! as PlateNumber).value}'),
    ),
  ],
);

Future<FakeHistoryRepository> _pump(
  WidgetTester tester,
  String id, {
  FakeHistoryRepository? repository,
  Size size = const Size(390, 844),
  double textScale = 1,
  bool settle = true,
}) async {
  const padding = FakeViewPadding(top: 47 * 3, bottom: 34 * 3);
  tester.view
    ..physicalSize = size * 3
    ..devicePixelRatio = 3
    ..padding = padding
    ..viewPadding = padding;
  tester.platformDispatcher.textScaleFactorTestValue = textScale;
  addTearDown(tester.view.reset);
  addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);

  final fake =
      repository ?? FakeHistoryRepository([_active, _noActive, _bare, _eTag]);
  final router = _router(id);
  addTearDown(router.dispose);
  await tester.pumpWidget(
    ProviderScope(
      overrides: [historyRepositoryProvider.overrideWithValue(fake)],
      child: MaterialApp.router(theme: AppTheme.light, routerConfig: router),
    ),
  );
  if (settle) await tester.pumpAndSettle();
  return fake;
}

Finder _row(String label) => find.bySemanticsLabel(label);

Future<void> _reveal(WidgetTester tester, Finder finder) async {
  await tester.scrollUntilVisible(
    finder,
    200,
    scrollable: find.byType(Scrollable).first,
  );
  await tester.pumpAndSettle();
}

void main() {
  setUpAll(() async {
    final loader = FontLoader('Poppins');
    for (final weight in ['Regular', 'Medium', 'SemiBold', 'Bold']) {
      loader.addFont(
        rootBundle.load('assets/fonts/poppins/Poppins-$weight.ttf'),
      );
    }
    await loader.load();
  });

  testWidgets('an active trip', (tester) async {
    await _pump(tester, 'VR-1051');

    expect(find.text('Verification Record'), findsOneWidget);
    expect(find.text('Personal Verification'), findsOneWidget);
    expect(find.bySemanticsLabel('ABC 123 AA'), findsOneWidget);
    expect(find.text('Active Trip'), findsOneWidget);
    expect(find.text('Completed · Manual plate'), findsOneWidget);
    expect(find.text('Verification details'), findsOneWidget);
    for (final row in [
      'Verification reference: VRE-222-001',
      'Vehicle plate: ABC 123 AA',
      'Vehicle type: Heavy goods vehicle',
      'Verification method: Manual plate',
      'Date and time: 11 Oct 2026 · 09:34 AM',
      'Agent: Demo Officer',
      'Agent ID: JRB-AG-0142',
    ]) {
      expect(_row(row), findsOneWidget, reason: row);
    }

    await _reveal(tester, find.text('Back to history'));
    expect(find.text('Result and completion'), findsOneWidget);
    for (final row in [
      'Trip status: Active trip',
      'E-Tag status: Valid',
      'Completion status: Completed',
      'Action taken: Verified',
      'Pending action: None',
      'Violation issued: No',
      'GPS: 8.97439, 7.45280',
      'Payment request generated: No · payments are outside this scope',
    ]) {
      expect(_row(row), findsOneWidget, reason: row);
    }
    expect(find.text('View verification result'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('View verification result opens the result for the plate', (
    tester,
  ) async {
    await _pump(tester, 'VR-1051');
    await _reveal(tester, find.text('View verification result'));

    await tester.tap(find.text('View verification result'));
    await tester.pumpAndSettle();

    expect(find.text('result ABC123AA'), findsOneWidget);
  });

  testWidgets('no active trip: what is pending, and no result to view', (
    tester,
  ) async {
    await _pump(tester, 'VR-1050');

    expect(find.text('No Active Trip'), findsOneWidget);
    expect(find.text('Completed · Manual plate'), findsOneWidget);
    expect(_row('Verification reference: VRE-222-002'), findsOneWidget);

    await _reveal(tester, find.text('Back to history'));
    for (final row in [
      'Trip status: No active trip',
      'E-Tag status: Invalid',
      'Action taken: Unverified',
      'Pending action: Complete required evidence and submit',
      'Violation issued: No',
    ]) {
      expect(_row(row), findsOneWidget, reason: row);
    }
    expect(find.text('View verification result'), findsNothing);
  });

  testWidgets('Back to history and the back button return to the list', (
    tester,
  ) async {
    await _pump(tester, 'VR-1050');
    await _reveal(tester, find.text('Back to history'));

    await tester.tap(find.text('Back to history'));
    await tester.pumpAndSettle();
    expect(find.text('history page'), findsOneWidget);

    await tester.pumpWidget(const SizedBox());
    await _pump(tester, 'VR-1051');
    await tester.tap(find.bySemanticsLabel('Back'));
    await tester.pumpAndSettle();
    expect(find.text('history page'), findsOneWidget);
  });

  testWidgets('details the server did not send say so', (tester) async {
    await _pump(tester, 'VR-1049');

    expect(_row('Verification reference: VR-1049'), findsOneWidget);
    expect(_row('Vehicle type: Not recorded'), findsOneWidget);
    expect(_row('Verification method: Receipt QR'), findsOneWidget);
    expect(_row('Agent: Not recorded'), findsOneWidget);
    await _reveal(tester, find.text('Back to history'));
    expect(_row('E-Tag status: Not recorded'), findsOneWidget);
    expect(_row('GPS: Not recorded'), findsOneWidget);
    expect(_row('Pending action: Not recorded'), findsOneWidget);
  });

  testWidgets('an E-Tag record has no design yet', (tester) async {
    await _pump(tester, 'VR-1047');

    expect(find.byType(EmptyState), findsOneWidget);
    expect(find.text('GGE 651 PL'), findsOneWidget);
    expect(find.text('Verification details'), findsNothing);
  });

  testWidgets('loading, then a record not in the history', (tester) async {
    final repository = FakeHistoryRepository([_active])
      ..gate = Completer<void>();
    await _pump(tester, 'VR-0000', repository: repository, settle: false);
    await tester.pump();
    expect(find.byType(AppSpinner), findsOneWidget);

    repository.gate!.complete();
    await tester.pumpAndSettle();
    expect(find.text('Record unavailable'), findsOneWidget);
  });

  group('fits', () {
    for (final (name, size, scale) in [
      ('small phone', const Size(320, 568), 1.0),
      ('landscape', const Size(844, 390), 1.0),
      ('tablet', const Size(820, 1180), 1.0),
      ('200% text', const Size(390, 844), 2.0),
    ]) {
      testWidgets('both records on a $name', (tester) async {
        for (final id in ['VR-1051', 'VR-1050']) {
          await tester.pumpWidget(const SizedBox());
          await _pump(tester, id, size: size, textScale: scale);
          expect(tester.takeException(), isNull);
          await _reveal(tester, find.text('Back to history'));
          expect(tester.takeException(), isNull);
          expect(find.text('Back to history').hitTestable(), findsOneWidget);
        }
      });
    }
  });
}

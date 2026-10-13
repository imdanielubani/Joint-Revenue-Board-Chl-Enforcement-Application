import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:jbr_chl_enforcement/core/utils/date_formatter.dart';
import 'package:jbr_chl_enforcement/features/chl_trips/domain/entities/trip_status.dart';
import 'package:jbr_chl_enforcement/features/vehicle/domain/entities/e_tag_status.dart';
import 'package:jbr_chl_enforcement/features/verification/domain/entities/verification_method.dart';
import 'package:jbr_chl_enforcement/features/verification_history/data/repositories/history_repository_impl.dart';
import 'package:jbr_chl_enforcement/features/verification_history/domain/entities/history_filter.dart';
import 'package:jbr_chl_enforcement/features/verification_history/domain/entities/verification_record.dart';
import 'package:jbr_chl_enforcement/features/verification_history/presentation/providers/history_controller.dart';
import 'package:jbr_chl_enforcement/features/verification_history/presentation/screens/verification_history_screen.dart';
import 'package:jbr_chl_enforcement/features/verification_history/presentation/widgets/history_filter_sheet.dart';
import 'package:jbr_chl_enforcement/features/verification_history/presentation/widgets/history_list_item.dart';

import '../../../helpers/fakes.dart';

final _now = DateTime(2026, 10, 13, 10);

VerificationRecord _trip(
  DateTime at, {
  TripStatus status = TripStatus.active,
}) => VerificationRecord(
  id: 'trip-$at',
  plateNumber: 'ABC 123 AA',
  tripStatus: status,
  method: VerificationMethod.qrCode,
  outcome: VerificationOutcome.verified,
  recordedAt: at,
);

final _eTag = VerificationRecord(
  id: 'etag',
  plateNumber: 'GGE 651 PL',
  eTagStatus: ETagStatus.valid,
  method: VerificationMethod.qrCode,
  outcome: VerificationOutcome.validated,
  recordedAt: DateTime(2026, 10, 13, 8),
);

final _unfinished = VerificationRecord(
  id: 'unfinished',
  plateNumber: 'BDG 204 XY',
  method: VerificationMethod.qrCode,
  outcome: VerificationOutcome.notCompleted,
  recordedAt: DateTime(2026, 9, 26, 10),
);

void main() {
  group('dates', () {
    test('Today, Yesterday, then "26 Sept 2026"', () {
      expect(DateFormatter.day(DateTime(2026, 10, 13), _now), 'Today');
      expect(DateFormatter.day(DateTime(2026, 10, 12, 23), _now), 'Yesterday');
      expect(DateFormatter.day(DateTime(2026, 9, 26), _now), '26 Sept 2026');
      expect(DateFormatter.date(DateTime(2026, 10, 10)), '10 Oct 2026');
      expect(DateFormatter.date(DateTime(2026, 6, 1)), '1 Jun 2026');
    });
  });

  group('period', () {
    test('the last 30 days include today and the 29 days before', () {
      expect(
        inPeriod(_trip(DateTime(2026, 9, 14)), HistoryPeriod.last30Days, _now),
        isTrue,
      );
      expect(
        inPeriod(
          _trip(DateTime(2026, 9, 13, 23, 59)),
          HistoryPeriod.last30Days,
          _now,
        ),
        isFalse,
      );
      expect(inPeriod(_trip(DateTime(2020)), HistoryPeriod.all, _now), isTrue);
    });

    test('summary', () {
      expect(
        VerificationHistoryScreen.summary(6, HistoryPeriod.last30Days),
        '6 personal records · Last 30 days',
      );
      expect(
        VerificationHistoryScreen.summary(1, HistoryPeriod.all),
        '1 personal record · All available dates',
      );
    });
  });

  group('filter', () {
    final trip = _trip(DateTime(2026, 10, 13, 9));
    final receipt = _trip(DateTime(2026, 10, 13, 9, 30));

    test('none: last 30 days, nothing filtered', () {
      expect(HistoryFilter.none.period, HistoryPeriod.last30Days);
      expect(HistoryFilter.none.isActive, isFalse);
      expect(HistoryFilter.none.count, 0);
      for (final record in [trip, _eTag, _unfinished]) {
        expect(HistoryFilter.none.matches(record, _now), isTrue);
      }
      expect(
        HistoryFilter.none.matches(_trip(DateTime(2026, 9, 1)), _now),
        isFalse,
      );
      expect(
        HistoryFilter.none
            .withPeriod(HistoryPeriod.all)
            .matches(_trip(DateTime(2026, 9, 1)), _now),
        isTrue,
      );
    });

    test('a QR code is a receipt for a trip and a tag for an E-Tag', () {
      expect(HistoryMethod.receiptQr.matches(receipt), isTrue);
      expect(HistoryMethod.receiptQr.matches(_eTag), isFalse);
      expect(HistoryMethod.tagQr.matches(_eTag), isTrue);
      expect(HistoryMethod.tagQr.matches(receipt), isFalse);
      expect(HistoryMethod.manualPlate.matches(receipt), isFalse);
    });

    test('result is what was found; unfinished checks found nothing', () {
      expect(HistoryResult.activeTrip.matches(trip), isTrue);
      expect(HistoryResult.noActiveTrip.matches(trip), isFalse);
      expect(HistoryResult.eTagValid.matches(_eTag), isTrue);
      for (final result in HistoryResult.values) {
        expect(result.matches(_unfinished), isFalse);
      }
      // The same words as on the record.
      expect(HistoryResult.activeTrip.label, trip.finding);
      expect(HistoryResult.eTagValid.label, _eTag.finding);
    });

    test('completion', () {
      expect(HistoryCompletion.completed.matches(trip), isTrue);
      expect(HistoryCompletion.completed.matches(_unfinished), isFalse);
      expect(HistoryCompletion.notCompleted.matches(_unfinished), isTrue);
    });

    test('count, cleared and equality leave the date range alone', () {
      const filter = HistoryFilter(
        period: HistoryPeriod.all,
        method: HistoryMethod.tagQr,
        completion: HistoryCompletion.notCompleted,
      );
      expect(filter.count, 2);
      expect(filter.isActive, isTrue);
      expect(filter.withMethod(null).count, 1);
      expect(filter.cleared(), const HistoryFilter(period: HistoryPeriod.all));
      expect(
        HistoryFilter.none.withPeriod(HistoryPeriod.all).isActive,
        isFalse,
      );
      expect(
        filter.withResult(HistoryResult.noActiveTrip).matches(trip, _now),
        isFalse,
      );
    });

    test('matching wording', () {
      expect(HistoryFilterSheet.matching(1), '1 matching record');
      expect(HistoryFilterSheet.matching(0), '0 matching records');
      expect(
        VerificationHistoryScreen.summary(
          1,
          HistoryPeriod.last30Days,
          filtered: true,
        ),
        '1 matching record · Last 30 days',
      );
    });
  });

  group('record wording', () {
    test('what was found and how', () {
      expect(_trip(_now).finding, 'Active trip');
      expect(_trip(_now).historyMethod, 'Receipt QR');
      expect(
        _trip(_now, status: TripStatus.noActive).finding,
        'No active trip',
      );
      expect(_eTag.finding, 'E-Tag valid');
      expect(_eTag.historyMethod, 'Tag QR');
      expect(_unfinished.finding, 'Verification unavailable');
      expect(_unfinished.isCompleted, isFalse);
      // The dashboard keeps its own wording.
      expect(_trip(_now).detail, 'Active trip · QR code');
    });
  });

  group('controller', () {
    test('sorts newest first and does not retry by itself', () async {
      final repository = FakeHistoryRepository([
        _unfinished,
        _eTag,
        _trip(DateTime(2026, 10, 13, 9)),
      ]);
      final container = ProviderContainer(
        overrides: [historyRepositoryProvider.overrideWithValue(repository)],
      );
      addTearDown(container.dispose);
      container.listen(historyProvider, (_, _) {});

      final records = await container.read(historyProvider.future);
      expect(records.map((r) => r.id), [
        'trip-${DateTime(2026, 10, 13, 9)}',
        'etag',
        'unfinished',
      ]);

      repository.fetchError = StateError('down');
      await container.read(historyProvider.notifier).retry();
      // A failed refresh keeps the last records.
      expect(container.read(historyProvider).value, hasLength(3));
      final attempts = repository.fetchCount;
      await Future<void>.delayed(const Duration(milliseconds: 300));
      expect(repository.fetchCount, attempts);
    });
  });

  group('demo history', () {
    test('seven samples, six in the last 30 days', () async {
      final records = await DemoHistoryRepository(
        now: () => _now,
        delay: Duration.zero,
      ).fetchHistory();

      expect(records, hasLength(7));
      expect(
        records.where((r) => inPeriod(r, HistoryPeriod.last30Days, _now)),
        hasLength(6),
      );
      expect(
        records
            .singleWhere(
              (r) => r.id == DemoHistoryRepository.unfinishedRecordId,
            )
            .isCompleted,
        isFalse,
      );
    });

    test('without the API the history is empty', () async {
      expect(await const RemoteHistoryRepository().fetchHistory(), isEmpty);
    });
  });
}

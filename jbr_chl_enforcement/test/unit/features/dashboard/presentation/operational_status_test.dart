import 'package:flutter_test/flutter_test.dart';
import 'package:jbr_chl_enforcement/features/dashboard/presentation/widgets/operational_status_row.dart';

void main() {
  List<(String, StatusLevel, String)> tiles({
    bool online = true,
    bool gps = true,
    bool rfid = true,
    int pending = 0,
    bool syncAvailable = true,
  }) =>
      OperationalStatusRow(
            internetOnline: online,
            gpsReady: gps,
            rfidConnected: rfid,
            pendingSync: pending,
            syncAvailable: syncAvailable,
          ).statuses
          .map((status) => (status.label, status.level, status.value))
          .toList();

  test('all healthy', () {
    expect(tiles(), [
      ('Internet', StatusLevel.ok, 'Online'),
      ('GPS', StatusLevel.ok, 'Online'),
      ('RFID reader', StatusLevel.ok, 'Connected'),
      ('Sync', StatusLevel.pending, 'Synced'),
    ]);
  });

  test('queued actions while online', () {
    expect(tiles(pending: 2).last, ('Sync', StatusLevel.pending, '2 queued'));
  });

  test('sync service unreachable', () {
    expect(tiles(syncAvailable: false).last, (
      'Sync',
      StatusLevel.down,
      'Offline',
    ));
    expect(tiles(syncAvailable: false, pending: 3).last.$3, 'Offline');
  });

  test('offline', () {
    expect(tiles(online: false, gps: false, rfid: false, pending: 2), [
      ('Internet', StatusLevel.down, 'Offline'),
      ('GPS', StatusLevel.down, 'Offline'),
      ('RFID reader', StatusLevel.down, 'Offline'),
      ('Offline sync', StatusLevel.pending, '2 queued'),
    ]);
  });

  test('offline with nothing queued', () {
    expect(tiles(online: false).last, (
      'Offline sync',
      StatusLevel.pending,
      'Synced',
    ));
  });
}

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/constants/asset_paths.dart';
import '../../../../core/navigation/route_names.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../shared/device/connectivity/connectivity_adapter.dart';
import '../../../../shared/ui/sheets/app_bottom_sheet.dart';
import '../../../../shared/ui/sheets/status_modal.dart';
import '../../domain/entities/sync_status.dart';
import '../providers/sync_controller.dart';

/// Opens the offline sync card. "View queue" closes it and opens the sync
/// queue.
Future<void> showOfflineSyncSheet(BuildContext context) async {
  ProviderScope.containerOf(
    context,
    listen: false,
  ).read(syncControllerProvider.notifier).clearAcknowledged();
  final viewQueue = await showAppSheet<bool>(
    context: context,
    useRootNavigator: true,
    builder: (context) => const OfflineSyncSheet(),
  );
  if (viewQueue == true && context.mounted) {
    context.pushNamed(RouteNames.syncQueue);
  }
}

/// What the card shows.
enum OfflineSyncView { overview, offline, syncing, acknowledged, interrupted }

/// The offline sync card: the queue and connection, then progress, the
/// acknowledgement or the interruption. Without a connection it says so,
/// and turns back to the overview when the connection returns.
class OfflineSyncSheet extends ConsumerWidget {
  const OfflineSyncSheet({super.key});

  static OfflineSyncView viewFor(SyncPhase phase, {required bool? online}) =>
      switch (phase) {
        SyncPhase.syncing => OfflineSyncView.syncing,
        SyncPhase.acknowledged => OfflineSyncView.acknowledged,
        SyncPhase.interrupted => OfflineSyncView.interrupted,
        SyncPhase.idle when online == false => OfflineSyncView.offline,
        SyncPhase.idle => OfflineSyncView.overview,
      };

  /// "2 verification records", for the Saved work row.
  static String savedWork(int pending) => switch (pending) {
    0 => 'No records awaiting sync',
    1 => '1 verification record',
    _ => '$pending verification records',
  };

  /// The overview's message.
  static String waiting(int pending) => switch (pending) {
    0 =>
      'No local verification records are waiting. Records saved offline '
          'appear here until they are synchronized.',
    1 =>
      '1 local verification record is waiting. Sync now opens progress; '
          'records remain queued until acknowledgement.',
    _ =>
      '$pending local verification records are waiting. Sync now opens '
          'progress; records remain queued until acknowledgement.',
  };

  static const String eyebrow = 'Saved work';

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final phase = ref.watch(syncControllerProvider);
    final controller = ref.read(syncControllerProvider.notifier);
    final online = ref.watch(internetStatusProvider).value;
    final pending = ref.watch(pendingSyncCountProvider);

    void close({bool viewQueue = false}) =>
        Navigator.of(context).pop(viewQueue);

    final connection = switch (online) {
      true => 'Online',
      false => 'Offline',
      null => 'Checking…',
    };
    List<Widget> details(StatusTone tone) => [
      StatusDetailList(
        tone: tone,
        rows: [('Connection', connection), ('Saved work', savedWork(pending))],
      ),
    ];
    final viewQueue = StatusModalButton.outlined(
      label: 'View queue',
      onPressed: () => close(viewQueue: true),
    );

    return switch (viewFor(phase, online: online)) {
      OfflineSyncView.overview => StatusModal(
        iconAsset: AssetPaths.iconSyncModal,
        eyebrow: eyebrow,
        title: 'Offline synchronization',
        message: waiting(pending),
        details: details(StatusTone.positive),
        onClose: close,
        closeLabel: 'Close synchronization',
        actions: [
          StatusModalButton.filled(
            label: 'Sync now',
            // Nothing to send, or the connection is still being checked.
            onPressed: pending > 0 && online == true ? controller.start : null,
          ),
          viewQueue,
        ],
      ),
      OfflineSyncView.offline => StatusModal(
        iconAsset: AssetPaths.iconSyncOffline,
        eyebrow: eyebrow,
        title: 'No internet connection',
        message:
            'Synchronization cannot start while offline. Saved records stay '
            'in the queue until connectivity returns.',
        details: details(StatusTone.muted),
        onClose: close,
        closeLabel: 'Close synchronization',
        actions: [
          StatusModalButton.filled(
            label: 'Return to settings',
            bold: true,
            onPressed: close,
          ),
        ],
      ),
      OfflineSyncView.syncing => StatusModal(
        iconAsset: AssetPaths.iconSyncModal,
        spinning: true,
        eyebrow: eyebrow,
        title: 'Synchronizing records',
        message:
            'Waiting for acknowledgement. Records stay queued until CHL '
            'accepts them. Continue lets you keep working while this '
            'finishes.',
        details: [
          ...details(StatusTone.positive),
          const StatusNote(text: 'Pending · awaiting acknowledgement'),
        ],
        // Closing leaves the sync running.
        onClose: close,
        closeLabel: 'Close and keep synchronizing',
        actions: [
          StatusModalButton.filled(label: 'Continue', onPressed: close),
          StatusModalButton.outlined(
            label: 'Stop waiting',
            onPressed: controller.stopWaiting,
          ),
        ],
      ),
      OfflineSyncView.acknowledged => StatusModal(
        iconAsset: AssetPaths.iconSyncAcknowledged,
        eyebrow: eyebrow,
        title: 'Records acknowledged',
        message:
            'CHL acknowledged the synchronized records. They are no longer '
            'queued on this phone.',
        details: details(StatusTone.positive),
        onClose: close,
        closeLabel: 'Close synchronization',
        actions: [
          StatusModalButton.filled(
            label: 'View queue',
            onPressed: () => close(viewQueue: true),
          ),
          StatusModalButton.outlined(
            label: 'Return to settings',
            onPressed: close,
          ),
        ],
      ),
      OfflineSyncView.interrupted => StatusModal(
        iconAsset: AssetPaths.iconSyncInterrupted,
        haloColor: AppColors.destructiveTint,
        eyebrow: eyebrow,
        title: 'Synchronization interrupted',
        message:
            'No acknowledgement was received. Saved records remain queued. '
            'Retry safely without creating another copy.',
        details: details(StatusTone.danger),
        onClose: close,
        closeLabel: 'Close synchronization',
        actions: [
          StatusModalButton.filled(
            label: 'Retry sync',
            color: AppColors.destructive,
            onPressed: controller.start,
          ),
          viewQueue,
        ],
      ),
    };
  }
}

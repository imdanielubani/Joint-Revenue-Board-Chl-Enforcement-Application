import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../../../../core/constants/asset_paths.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_typography.dart';

/// Health of a device capability shown on a status tile.
enum StatusLevel { ok, pending, down }

/// One status tile's content.
@immutable
class OperationalStatus {
  const OperationalStatus({
    required this.label,
    required this.iconAsset,
    required this.level,
    required this.value,
  });

  final String label;
  final String iconAsset;
  final StatusLevel level;
  final String value;
}

/// Internet, GPS, RFID reader and sync tiles.
class OperationalStatusRow extends StatelessWidget {
  const OperationalStatusRow({
    super.key,
    required this.internetOnline,
    required this.gpsReady,
    required this.rfidConnected,
    required this.pendingSync,
  });

  final bool internetOnline;
  final bool gpsReady;
  final bool rfidConnected;
  final int pendingSync;

  List<OperationalStatus> get statuses => [
    OperationalStatus(
      label: 'Internet',
      iconAsset: AssetPaths.iconInternet,
      level: internetOnline ? StatusLevel.ok : StatusLevel.down,
      value: internetOnline ? 'Online' : 'Offline',
    ),
    OperationalStatus(
      label: 'GPS',
      iconAsset: AssetPaths.iconGps,
      level: gpsReady ? StatusLevel.ok : StatusLevel.down,
      value: gpsReady ? 'Online' : 'Offline',
    ),
    OperationalStatus(
      label: 'RFID reader',
      iconAsset: AssetPaths.iconRfid,
      level: rfidConnected ? StatusLevel.ok : StatusLevel.down,
      value: rfidConnected ? 'Connected' : 'Offline',
    ),
    OperationalStatus(
      label: internetOnline ? 'Sync' : 'Offline sync',
      iconAsset: AssetPaths.iconSync,
      level: pendingSync > 0 ? StatusLevel.pending : StatusLevel.ok,
      value: pendingSync > 0 ? '$pendingSync queued' : 'Up to date',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final tiles = statuses;
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          for (var i = 0; i < tiles.length; i++) ...[
            if (i > 0) const SizedBox(width: 5),
            Expanded(child: _StatusTile(status: tiles[i])),
          ],
        ],
      ),
    );
  }
}

class _StatusTile extends StatelessWidget {
  const _StatusTile({required this.status});

  final OperationalStatus status;

  @override
  Widget build(BuildContext context) {
    final (dot, text) = switch (status.level) {
      StatusLevel.ok => (AppColors.statusOk, AppColors.green),
      StatusLevel.pending => (AppColors.statusPending, AppColors.warningText),
      StatusLevel.down => (AppColors.statusDown, AppColors.statusDownText),
    };

    return Semantics(
      container: true,
      label: '${status.label}: ${status.value}',
      excludeSemantics: true,
      child: Container(
        constraints: const BoxConstraints(minHeight: 86),
        padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 10),
        decoration: BoxDecoration(
          color: Colors.white,
          border: Border.all(color: AppColors.cardBorder, width: 1.5),
          borderRadius: const BorderRadius.all(Radius.circular(14)),
        ),
        child: FittedBox(
          // Narrow screens shrink the tile content instead of clipping it.
          fit: BoxFit.scaleDown,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              SvgPicture.asset(
                status.iconAsset,
                width: 18,
                height: 18,
                excludeFromSemantics: true,
              ),
              const SizedBox(height: 5),
              Text(
                status.label,
                style: const TextStyle(
                  fontFamily: AppTypography.fontFamily,
                  fontSize: 10,
                  fontWeight: AppTypography.semiBold,
                  height: 15.4 / 11,
                  color: AppColors.forest,
                ),
              ),
              const SizedBox(height: 5),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 8,
                    height: 8,
                    decoration: BoxDecoration(
                      color: dot,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 5),
                  Text(
                    status.value,
                    style: TextStyle(
                      fontFamily: AppTypography.fontFamily,
                      fontSize: 9,
                      fontWeight: AppTypography.regular,
                      height: 16.5 / 10,
                      color: text,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

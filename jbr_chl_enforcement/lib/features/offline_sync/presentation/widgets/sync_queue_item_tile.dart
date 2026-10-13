import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../../../../core/constants/asset_paths.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../verification/domain/entities/plate_number.dart';
import '../../../verification/domain/entities/verification_method.dart';
import '../../domain/entities/sync_queue_item.dart';

extension SyncQueueMethodLabel on VerificationMethod {
  /// How the queued record was taken, e.g. "Receipt QR".
  String get queueLabel => switch (this) {
    VerificationMethod.rfid => 'RFID tag',
    VerificationMethod.qrCode => 'Receipt QR',
    VerificationMethod.manualPlate => 'Manual plate',
    VerificationMethod.ocr => 'Plate OCR',
  };
}

const TextStyle _secondary = TextStyle(
  fontFamily: AppTypography.fontFamily,
  fontWeight: AppTypography.regular,
  letterSpacing: 0,
  color: AppColors.sage,
);

/// A queued record: plate, how it was taken, and its queue reference.
class SyncQueueItemTile extends StatelessWidget {
  const SyncQueueItemTile({super.key, required this.item});

  final SyncQueueItem item;

  static const String recordKind = 'Verification record';
  static const String status = 'Queued';

  @override
  Widget build(BuildContext context) {
    final plate = PlateNumber.group(item.plateNumber);
    final method = '${item.method.queueLabel} · $recordKind';
    final reference = '${item.id} · $status';

    return Semantics(
      container: true,
      label: '$plate. $method. $reference',
      excludeSemantics: true,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 18),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: const BoxDecoration(
                color: AppColors.iconWell,
                shape: BoxShape.circle,
              ),
              alignment: Alignment.center,
              child: SvgPicture.asset(
                AssetPaths.iconQueueRecord,
                width: 18.9844,
                height: 18.9844,
                excludeFromSemantics: true,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    plate,
                    style: const TextStyle(
                      fontFamily: AppTypography.fontFamily,
                      fontSize: 16,
                      fontWeight: AppTypography.bold,
                      letterSpacing: 0,
                      height: 1.5,
                      color: AppColors.forest,
                    ),
                  ),
                  Padding(
                    // 32 px line, as designed.
                    padding: const EdgeInsets.only(top: 6, bottom: 6.5),
                    child: Text(
                      method,
                      style: _secondary.copyWith(fontSize: 13, height: 1.5),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.only(top: 4.5, bottom: 1.5),
                    child: Text(
                      reference,
                      style: _secondary.copyWith(fontSize: 12, height: 1.5),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

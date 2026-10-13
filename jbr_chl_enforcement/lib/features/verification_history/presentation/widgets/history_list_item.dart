import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:intl/intl.dart';

import '../../../../core/constants/asset_paths.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../chl_trips/domain/entities/trip_status.dart';
import '../../../vehicle/domain/entities/e_tag_status.dart';
import '../../../verification/domain/entities/verification_method.dart';
import '../../domain/entities/verification_record.dart';

/// One verification: status icon, plate, what was found · how the vehicle
/// was identified ("Active trip · RFID", "E-Tag valid · Tag QR"), time and
/// outcome.
class VerificationRecordTile extends StatelessWidget {
  const VerificationRecordTile({super.key, required this.record, this.onTap});

  final VerificationRecord record;
  final VoidCallback? onTap;

  static final DateFormat _time = DateFormat('hh:mm a');

  static const TextStyle _plateStyle = TextStyle(
    fontFamily: AppTypography.fontFamily,
    fontSize: 15,
    fontWeight: AppTypography.bold,
    height: 1.5,
    color: AppColors.forest,
  );

  static const TextStyle _detailStyle = TextStyle(
    fontFamily: AppTypography.fontFamily,
    fontSize: 12,
    fontWeight: AppTypography.regular,
    height: 1.4,
    color: AppColors.moss,
  );

  /// Time and outcome, on the right.
  static const TextStyle _resultStyle = TextStyle(
    fontFamily: AppTypography.fontFamily,
    fontSize: 12,
    fontWeight: AppTypography.regular,
    height: 1.4,
    color: AppColors.ink,
  );

  @override
  Widget build(BuildContext context) {
    final (iconAsset, iconBackground) = _icon(record);
    final detail = record.detail;
    final time = _time.format(record.recordedAt);

    return Semantics(
      container: true,
      button: onTap != null,
      label: '${record.plateNumber}, $detail, ${record.outcome.label} at $time',
      excludeSemantics: true,
      child: InkWell(
        onTap: onTap,
        borderRadius: const BorderRadius.all(Radius.circular(12)),
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 76),
          child: Padding(
            padding: const EdgeInsets.only(top: 20, bottom: 12),
            child: Row(
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: iconBackground,
                    borderRadius: const BorderRadius.all(Radius.circular(18)),
                  ),
                  alignment: Alignment.center,
                  child: SvgPicture.asset(
                    iconAsset,
                    width: 20,
                    height: 20,
                    excludeFromSemantics: true,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        record.plateNumber,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: _plateStyle,
                      ),
                      Padding(
                        padding: const EdgeInsets.only(top: 5),
                        child: Text(
                          detail,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: _detailStyle,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 10),
                // Capped so very large text wraps instead of overflowing.
                ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 120),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(time, textAlign: TextAlign.end, style: _resultStyle),
                      Padding(
                        padding: const EdgeInsets.only(top: 6),
                        child: Text(
                          record.outcome.label,
                          textAlign: TextAlign.end,
                          style: _resultStyle.copyWith(height: 1.3),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  static (String, Color) _icon(VerificationRecord record) {
    if (record.outcome == VerificationOutcome.escalated) {
      return (AssetPaths.iconRecentEscalated, AppColors.recentEscalated);
    }
    final good = record.isETagCheck
        ? record.eTagStatus == ETagStatus.valid
        : record.tripStatus == TripStatus.active;
    if (!good) {
      return (AssetPaths.iconRecentNoActive, AppColors.recentNoActive);
    }
    return record.isETagCheck
        ? (AssetPaths.iconRecentETag, AppColors.recentActive)
        : (AssetPaths.iconRecentActive, AppColors.recentActive);
  }
}

extension VerificationRecordDetail on VerificationRecord {
  /// What was found · how the vehicle was identified.
  String get detail {
    final eTag = eTagStatus;
    if (eTag != null) return '${eTag.label} · ${method.eTagLabel}';
    return '${tripStatus!.label} · ${method.label}';
  }
}

extension ETagStatusLabel on ETagStatus {
  String get label => switch (this) {
    ETagStatus.valid => 'E-Tag valid',
    ETagStatus.invalid => 'E-Tag invalid',
    ETagStatus.expired => 'E-Tag expired',
  };
}

extension TripStatusLabel on TripStatus {
  String get label => switch (this) {
    TripStatus.active => 'Active trip',
    TripStatus.noActive => 'No active trip',
    TripStatus.previous => 'Previous trip',
  };
}

extension VerificationMethodLabel on VerificationMethod {
  String get label => switch (this) {
    VerificationMethod.rfid => 'RFID',
    VerificationMethod.qrCode => 'QR code',
    VerificationMethod.manualPlate => 'Manual plate',
    VerificationMethod.ocr => 'OCR',
  };

  /// How an E-Tag was read ("Tag RFID", "Tag QR").
  String get eTagLabel => switch (this) {
    VerificationMethod.rfid => 'Tag RFID',
    VerificationMethod.qrCode => 'Tag QR',
    VerificationMethod.manualPlate => 'Manual plate',
    VerificationMethod.ocr => 'OCR',
  };
}

extension VerificationOutcomeLabel on VerificationOutcome {
  String get label => switch (this) {
    VerificationOutcome.verified => 'Verified',
    VerificationOutcome.checked => 'Checked',
    VerificationOutcome.validated => 'Validated',
    VerificationOutcome.caseCreated => 'Case created',
    VerificationOutcome.escalated => 'Escalated',
  };
}

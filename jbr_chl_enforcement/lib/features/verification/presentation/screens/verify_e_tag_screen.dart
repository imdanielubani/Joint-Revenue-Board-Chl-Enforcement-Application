import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/constants/asset_paths.dart';
import '../../../../core/navigation/route_names.dart';
import '../widgets/verification_method_tile.dart';

/// Verify E-Tag: read the physical JRB E-Tag by RFID or its QR code.
class VerifyETagScreen extends StatelessWidget {
  const VerifyETagScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return VerificationMethodPage(
      heading: 'Verify e-tag',
      description:
          'Read the physical JRB E-Tag using RFID or QR,\n'
          'then review the vehicle and CHL trip result.',
      options: [
        VerificationOption(
          iconAsset: AssetPaths.iconMethodRfid,
          title: 'Read RFID tag',
          description: 'Connect a reader and scan the haulage tag.',
          onSelected: () => context.pushNamed(RouteNames.rfidScan),
        ),
        VerificationOption(
          iconAsset: AssetPaths.iconMethodQr,
          title: 'Scan E-Tag QR code',
          description: 'Read the physical JRB E-Tag.',
          onSelected: () => context.pushNamed(RouteNames.qrScan),
        ),
      ],
    );
  }
}

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/constants/asset_paths.dart';
import '../../../../core/navigation/route_names.dart';
import '../widgets/verification_method_tile.dart';

/// Verify CHL Trip: pick how to identify the vehicle.
class VerificationHubScreen extends StatelessWidget {
  const VerificationHubScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return VerificationMethodPage(
      heading: 'Choose verification method',
      description: 'Use the method that works best in the field',
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
          description: 'Read the code on the physical JRB E-Tag.',
          onSelected: () => context.pushNamed(RouteNames.qrScan),
        ),
        VerificationOption(
          iconAsset: AssetPaths.iconMethodKeyboard,
          title: 'Enter plate manually',
          description: 'Type the vehicle registration number.',
          onSelected: () => context.pushNamed(RouteNames.manualPlate),
        ),
        VerificationOption(
          iconAsset: AssetPaths.iconMethodCamera,
          title: 'Scan plate with OCR',
          description: 'Capture, review, and confirm the plate.',
          onSelected: () => context.pushNamed(RouteNames.ocrCapture),
        ),
      ],
    );
  }
}

import 'package:flutter/material.dart';

import '../../../../core/constants/asset_paths.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../shared/ui/widgets/brand_accent_bar.dart';

/// Full JRB CHL logo, slogan and pillars shown in the centre of the launch
/// screen.
class LaunchBrandBlock extends StatelessWidget {
  const LaunchBrandBlock({super.key});

  static const double width = 289;
  static const double _logoWidth = 276;
  static const double _logoHeight = 144.939;

  // The logo artwork is square with padding above and below the wordmark;
  // the design shows a centred band of it, offset 44.15% of the box height.
  static const Alignment _logoAlignment = Alignment(0, -0.0235);

  static const TextStyle _sloganStyle = TextStyle(
    fontFamily: AppTypography.fontFamily,
    fontSize: 20,
    fontWeight: AppTypography.semiBold,
    height: 25 / 20,
    color: Colors.black,
  );

  static const TextStyle _pillarsStyle = TextStyle(
    fontFamily: AppTypography.fontFamily,
    fontSize: 9,
    fontWeight: AppTypography.semiBold,
    height: 25 / 9,
    letterSpacing: 3,
    color: Colors.black,
  );

  @override
  Widget build(BuildContext context) {
    final dpr = MediaQuery.devicePixelRatioOf(context);

    return SizedBox(
      width: width,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        spacing: 16,
        children: [
          SizedBox(
            width: _logoWidth,
            height: _logoHeight,
            child: ClipRect(
              child: Image.asset(
                AssetPaths.logoFull,
                fit: BoxFit.cover,
                alignment: _logoAlignment,
                cacheWidth: (_logoWidth * dpr).round(),
                semanticLabel: 'JRB CHL Enforcement, Joint Revenue Board',
              ),
            ),
          ),
          const Column(
            mainAxisSize: MainAxisSize.min,
            spacing: 5,
            children: [
              Text(
                'Compliant Roads\nProsperous Nigeria',
                textAlign: TextAlign.center,
                style: _sloganStyle,
              ),
              BrandAccentBar(width: 46),
              Text(
                'VERIFY  |  ENFORCE  |  COMPLY  |  BUILD',
                textAlign: TextAlign.center,
                maxLines: 1,
                softWrap: false,
                style: _pillarsStyle,
              ),
            ],
          ),
        ],
      ),
    );
  }
}

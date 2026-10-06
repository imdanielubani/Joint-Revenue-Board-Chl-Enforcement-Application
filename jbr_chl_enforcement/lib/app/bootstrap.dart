import 'package:device_preview/device_preview.dart';
import 'package:device_preview/presets.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app.dart';

Future<void> bootstrap() async {
  DevicePreview.enable(enabled: kDebugMode);
  // Start in a phone frame when previewing in a browser; real devices run
  // full screen. Switch device from the device_preview tab in DevTools.
  if (kIsWeb) {
    await DevicePreview.maybeController?.applyPreset(DevicePresets.iPhone17Pro);
  }

  LicenseRegistry.addLicense(() async* {
    final license = await rootBundle.loadString('assets/fonts/poppins/OFL.txt');
    yield LicenseEntryWithLineBreaks(['Poppins'], license);
  });

  runApp(const ProviderScope(child: ChlEnforcementApp()));
}

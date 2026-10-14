import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../shared/device/location/location_adapter.dart';
import '../../../../shared/ui/widgets/app_toast.dart';
import '../../../verification_history/domain/entities/verification_record_details.dart';

/// Reads where the officer is, for a verification: every verification
/// records its GPS location, so none starts without it. When it cannot be
/// read, a toast says what to do and null is returned.
Future<DeviceLocation?> readVerificationLocation(
  BuildContext context,
  WidgetRef ref,
) async {
  try {
    return await ref.read(locationReaderProvider).current();
  } on LocationUnavailable catch (error) {
    if (context.mounted) {
      showAppToast(context, verificationLocationMessage(error.problem));
    }
    return null;
  }
}

/// What to do when the location for a verification cannot be read.
String verificationLocationMessage(LocationProblem problem) =>
    switch (problem) {
      LocationProblem.serviceOff =>
        'Turn on location (GPS) to verify. Every verification records its '
            'location.',
      LocationProblem.permissionDenied =>
        'Allow location access to verify. Every verification records its '
            'location.',
      LocationProblem.unavailable =>
        'Your location could not be read. Move to open sky and try again.',
    };

/// The position, as a verification record keeps it.
RecordLocation recordLocation(DeviceLocation location) =>
    RecordLocation(latitude: location.latitude, longitude: location.longitude);

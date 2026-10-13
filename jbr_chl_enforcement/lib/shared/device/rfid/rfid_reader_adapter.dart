import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/environment/app_environment.dart';

/// Finds the RFID reader (for haulage tags) connected to this device.
abstract class RfidReaderDetector {
  /// Whether a reader is connected now. Never throws: a reader that cannot
  /// be reached is not connected.
  Future<bool> detect();
}

/// The detector: a sample reader in demo mode, otherwise the device's.
final rfidReaderDetectorProvider = Provider<RfidReaderDetector>(
  (ref) => AppEnvironment.authDemoMode
      ? DemoRfidReaderDetector()
      : const DeviceRfidReaderDetector(),
);

/// The reader connected to this device.
// TODO(rfid): find the approved reader (cable or Bluetooth) once its SDK
// is chosen. Until then no reader is ever found.
class DeviceRfidReaderDetector implements RfidReaderDetector {
  const DeviceRfidReaderDetector();

  @override
  Future<bool> detect() async => false;
}

/// A sample reader that takes a moment to answer, as a real one would. The
/// first detection finds nothing (as if the cable were loose) and every
/// later one finds the reader, so both outcomes can be tried.
class DemoRfidReaderDetector implements RfidReaderDetector {
  DemoRfidReaderDetector({this.delay = const Duration(seconds: 2)});

  /// How long each detection takes.
  final Duration delay;

  int _attempts = 0;

  @override
  Future<bool> detect() async {
    await Future<void>.delayed(delay);
    return _attempts++ > 0;
  }
}

/// Whether the RFID reader was found connected the last time it was
/// detected. Starts false: nothing has been detected yet.
final rfidReaderStatusProvider = NotifierProvider<RfidReaderStatus, bool>(
  RfidReaderStatus.new,
);

class RfidReaderStatus extends Notifier<bool> {
  @override
  bool build() => false;

  /// Records what the last detection found.
  void report({required bool connected}) => state = connected;
}

/// Whether an RFID reader is connected, as last detected (e.g. for the
/// dashboard's status row).
final rfidReaderConnectedProvider = Provider<bool>(
  (ref) => ref.watch(rfidReaderStatusProvider),
);

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/environment/app_environment.dart';

/// The RFID reader (for haulage tags) connected to this device.
abstract class RfidReader {
  /// Whether a reader is connected now. Never throws: a reader that cannot
  /// be reached is not connected.
  Future<bool> detect();

  /// Waits for a tag to come into range and returns what was read from it.
  /// Throws [RfidReaderLost] when the reader stops answering.
  Future<String> readTag();
}

/// The reader stopped answering while reading.
class RfidReaderLost implements Exception {
  const RfidReaderLost();

  @override
  String toString() => 'RfidReaderLost';
}

/// The reader: a sample one in demo mode, otherwise the device's.
final rfidReaderProvider = Provider<RfidReader>(
  (ref) =>
      AppEnvironment.authDemoMode ? DemoRfidReader() : const DeviceRfidReader(),
);

/// The reader connected to this device.
// TODO(rfid): find the approved reader (cable or Bluetooth) and read tags
// with its SDK once it is chosen. Until then no reader is ever found.
class DeviceRfidReader implements RfidReader {
  const DeviceRfidReader();

  @override
  Future<bool> detect() async => false;

  @override
  Future<String> readTag() async => throw const RfidReaderLost();
}

/// A sample reader that takes a moment to answer, as a real one would. The
/// first detection finds nothing (as if the cable were loose) and every
/// later one finds the reader, so both outcomes can be tried. Every read
/// finds ABC 123 AA's tag.
class DemoRfidReader implements RfidReader {
  DemoRfidReader({this.delay = const Duration(seconds: 2)});

  /// How long each detection and read takes.
  final Duration delay;

  /// What a read returns.
  static const String tag = 'E2000017221101441890ABC1';

  int _detections = 0;

  @override
  Future<bool> detect() async {
    await Future<void>.delayed(delay);
    return _detections++ > 0;
  }

  @override
  Future<String> readTag() async {
    await Future<void>.delayed(delay);
    return tag;
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

  /// Records whether the reader is connected.
  void report({required bool connected}) => state = connected;
}

/// Whether an RFID reader is connected, as last detected (e.g. for the
/// dashboard's status row).
final rfidReaderConnectedProvider = Provider<bool>(
  (ref) => ref.watch(rfidReaderStatusProvider),
);

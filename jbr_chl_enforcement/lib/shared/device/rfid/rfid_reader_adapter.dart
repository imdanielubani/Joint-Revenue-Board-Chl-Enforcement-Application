import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/environment/app_environment.dart';

/// The RFID reader (for haulage tags) connected to this device.
abstract class RfidReader {
  /// Whether a reader is connected now. Never throws: a reader that cannot
  /// be reached is not connected.
  Future<bool> detect();

  /// Waits for tags to come into range and returns every one read (at
  /// least one). Throws [RfidReaderLost] when the reader stops answering.
  Future<List<RfidTagRead>> readTags();
}

/// A tag the reader read: its reference and, when the tag carries one, the
/// vehicle plate stored on it.
class RfidTagRead {
  const RfidTagRead(this.reference, {this.plate});

  final String reference;

  /// The plate as stored on the tag, unchecked.
  final String? plate;
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
  Future<List<RfidTagRead>> readTags() async => throw const RfidReaderLost();
}

/// A sample reader that takes a moment to answer, as a real one would, and
/// shows every outcome in turn: the first detection finds nothing (as if
/// the cable were loose) and every later one finds the reader; the first
/// read finds a tag that is not JRB's, the second loses the reader, the
/// third finds two vehicles' tags (ABC 123 AA and LND 482 XK), and every
/// later one finds ABC 123 AA's tag.
class DemoRfidReader implements RfidReader {
  DemoRfidReader({this.delay = const Duration(seconds: 2)});

  /// How long each detection and read takes.
  final Duration delay;

  /// ABC 123 AA's JRB tag.
  static const String tag = 'E2000017221101441890ABC1';

  /// LND 482 XK's JRB tag.
  static const String otherTag = 'E2000017221101441890D482';

  /// A tag that is not JRB's (a retail EPC).
  static const String foreignTag = '3034257BF7194E4000000001';

  int _detections = 0;
  int _reads = 0;

  @override
  Future<bool> detect() async {
    await Future<void>.delayed(delay);
    return _detections++ > 0;
  }

  @override
  Future<List<RfidTagRead>> readTags() async {
    await Future<void>.delayed(delay);
    const abc = RfidTagRead(tag, plate: 'ABC123AA');
    return switch (_reads++) {
      0 => const [RfidTagRead(foreignTag)],
      1 => throw const RfidReaderLost(),
      2 => const [abc, RfidTagRead(otherTag, plate: 'LND482XK')],
      _ => const [abc],
    };
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

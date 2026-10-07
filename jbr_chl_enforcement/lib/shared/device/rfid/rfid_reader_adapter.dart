import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Whether an RFID reader is paired and connected.
// TODO(rfid): report the real reader state once the reader integration
// (Bluetooth / NFC) is built.
final rfidReaderConnectedProvider = Provider<bool>((ref) => false);

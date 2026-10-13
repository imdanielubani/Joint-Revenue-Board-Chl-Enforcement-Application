import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

/// Where the camera is.
enum QrCameraStatus {
  /// Starting, or asking for permission.
  starting,

  /// Showing the live picture and looking for QR codes.
  running,

  /// The officer refused camera access.
  permissionDenied,

  /// No usable camera (none on the device, or it failed to start).
  unavailable,
}

/// A QR code the camera saw.
@immutable
class QrReading {
  const QrReading(this.value);

  /// The decoded text; null when a code was seen but could not be decoded.
  final String? value;

  /// Whether the code decoded to some text.
  bool get isReadable => value?.trim().isNotEmpty ?? false;
}

/// A live QR camera. The screen shows [buildPreview] and listens to
/// [status] and [readings]; it never touches the camera plugin itself.
abstract class QrScanner {
  ValueListenable<QrCameraStatus> get status;

  /// Every QR code seen, as it is seen.
  Stream<QrReading> get readings;

  /// The live camera picture, filling its box.
  Widget buildPreview(BuildContext context);

  /// Starts the camera again, e.g. after camera access was restored.
  Future<void> start();

  Future<void> dispose();
}

/// Makes a [QrScanner] for each scanner page.
final qrScannerFactoryProvider = Provider<QrScanner Function()>(
  (ref) => MobileQrScanner.new,
);

/// [QrScanner] backed by `mobile_scanner`. The preview starts the camera
/// when it is first shown, and pauses it while the app is in the background.
class MobileQrScanner implements QrScanner {
  MobileQrScanner() {
    _controller.addListener(_onCameraChanged);
    _captures = _controller.barcodes.listen(_onCapture);
  }

  final MobileScannerController _controller = MobileScannerController(
    formats: const [BarcodeFormat.qrCode],
  );
  final ValueNotifier<QrCameraStatus> _status = ValueNotifier(
    QrCameraStatus.starting,
  );
  final StreamController<QrReading> _readings =
      StreamController<QrReading>.broadcast();
  late final StreamSubscription<BarcodeCapture> _captures;

  @override
  ValueListenable<QrCameraStatus> get status => _status;

  @override
  Stream<QrReading> get readings => _readings.stream;

  void _onCameraChanged() {
    final camera = _controller.value;
    _status.value = switch (camera.error?.errorCode) {
      MobileScannerErrorCode.permissionDenied =>
        QrCameraStatus.permissionDenied,
      MobileScannerErrorCode.genericError ||
      MobileScannerErrorCode.unsupported => QrCameraStatus.unavailable,
      // Other codes are about the controller's own lifecycle (e.g. a start
      // while starting); the camera itself is fine.
      _ => camera.isRunning ? QrCameraStatus.running : QrCameraStatus.starting,
    };
  }

  void _onCapture(BarcodeCapture capture) {
    for (final barcode in capture.barcodes) {
      _readings.add(QrReading(barcode.rawValue));
    }
  }

  @override
  Widget buildPreview(BuildContext context) => MobileScanner(
    controller: _controller,
    // The page draws its own states.
    errorBuilder: (context, error) => const SizedBox.shrink(),
    placeholderBuilder: (context) => const SizedBox.shrink(),
  );

  @override
  Future<void> start() async {
    try {
      await _controller.start();
    } on MobileScannerException catch (error) {
      // Also reported through the controller's state.
      debugPrint('QR camera did not start: ${error.errorCode}');
    }
  }

  @override
  Future<void> dispose() async {
    _controller.removeListener(_onCameraChanged);
    await _captures.cancel();
    await _readings.close();
    _status.dispose();
    await _controller.dispose();
  }
}

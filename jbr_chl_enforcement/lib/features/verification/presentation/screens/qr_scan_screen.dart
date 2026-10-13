import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/constants/asset_paths.dart';
import '../../../../core/extensions/context_extensions.dart';
import '../../../../core/navigation/route_names.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../core/utils/clock.dart';
import '../../../../shared/device/permissions/permission_adapter.dart';
import '../../../../shared/device/scanner/qr_scanner_adapter.dart';
import '../../domain/entities/scanned_qr.dart';
import '../../domain/entities/verification_request.dart';
import '../widgets/qr_scanner_overlay.dart';

/// Why a scan did not go through.
enum _ScanProblem { notDetected, unreadable }

/// The scanner's words, as designed.
class QrScanCopy {
  const QrScanCopy._({
    required this.context,
    required this.title,
    required this.instruction,
    required this.hint,
    required this.scanLabel,
    required this.scanSemantics,
    required this.closeSemantics,
    required this.notDetected,
    required this.unreadable,
  });

  static const QrScanCopy scanner = QrScanCopy._(
    context: 'CHL receipt verification',
    title: 'Scan CHL receipt QR',
    instruction: 'Point your camera at the QR code on the CHL receipt.',
    hint: 'Keep the receipt steady and fit the entire QR inside the guide.',
    scanLabel: 'Scan receipt',
    scanSemantics: 'Scan receipt QR and continue to verification',
    closeSemantics: 'Close receipt QR scanner',
    notDetected:
        'No QR code detected. Keep the complete receipt QR inside the frame.',
    unreadable:
        'Unable to read this receipt QR. Improve lighting and try again.',
  );

  /// Small line in the header.
  final String context;
  final String title;
  final String instruction;

  /// Under the frame while scanning.
  final String hint;

  /// Under the shutter button, and what a screen reader says for it.
  final String scanLabel;
  final String scanSemantics;

  final String closeSemantics;

  /// Shown when Scan finds no code, or a code it cannot read.
  final String notDetected;
  final String unreadable;
}

/// Full-screen QR scanner, opened by Scan E-Tag QR code on Verify CHL
/// Trip. It reads both a CHL QR code and a JRB E-Tag: the live camera in a
/// framed guide, and a shutter button that takes the code in view on
/// to verification ([ScannedQr.read] tells the two apart): a QR code ends
/// in the verification result, an E-Tag in its receipt. Scan with no code in view says "No QR
/// code detected"; a code that cannot be decoded says it is unreadable;
/// both offer Retry Scanning. Without camera access it explains how to
/// restore it. Enter plate instead is always offered.
class QrScanScreen extends ConsumerStatefulWidget {
  const QrScanScreen({super.key});

  /// How long a code stays "in view" after the camera last saw it.
  static const Duration recentReading = Duration(milliseconds: 1500);

  @override
  ConsumerState<QrScanScreen> createState() => _QrScanScreenState();
}

class _QrScanScreenState extends ConsumerState<QrScanScreen> {
  late final QrScanner _scanner = ref.read(qrScannerFactoryProvider)();
  late final StreamSubscription<QrReading> _readings;
  late final AppLifecycleListener _lifecycle;

  QrReading? _latest;
  DateTime? _latestAt;
  _ScanProblem? _problem;

  /// Set once the page hands the code on, so it is handed on only once.
  bool _done = false;

  QrScanCopy get _copy => QrScanCopy.scanner;

  @override
  void initState() {
    super.initState();
    _readings = _scanner.readings.listen((reading) {
      _latest = reading;
      _latestAt = ref.read(clockProvider)();
    });
    // Coming back from the device settings with camera access restored.
    _lifecycle = AppLifecycleListener(onResume: _restartIfAllowed);
  }

  @override
  void dispose() {
    _lifecycle.dispose();
    unawaited(_readings.cancel());
    unawaited(_scanner.dispose());
    super.dispose();
  }

  Future<void> _restartIfAllowed() async {
    if (_scanner.status.value != QrCameraStatus.permissionDenied) return;
    final status = await ref
        .read(permissionAdapterProvider)
        .status(AppPermission.camera);
    if (status == AppPermissionStatus.granted && mounted) {
      await _scanner.start();
    }
  }

  void _scan() {
    if (_done) return;
    final latest = _latest;
    final at = _latestAt;
    final now = ref.read(clockProvider)();
    final inView =
        latest != null &&
        at != null &&
        now.difference(at) <= QrScanScreen.recentReading;

    if (inView && latest.isReadable) {
      _done = true;
      // Both are looked up with CHL: a QR code ends in the verification
      // result, an E-Tag in its receipt; either can be Vehicle Not Found
      // or Verification Unavailable.
      context.pushReplacementNamed(
        RouteNames.verificationProcessing,
        extra: QrVerification(ScannedQr.read(latest.value!)),
      );
      return;
    }
    setState(
      () => _problem = inView
          ? _ScanProblem.unreadable
          : _ScanProblem.notDetected,
    );
  }

  void _retryScanning() => setState(() {
    _problem = null;
    _latest = null;
    _latestAt = null;
  });

  Future<void> _retryCameraAccess() async {
    final permissions = ref.read(permissionAdapterProvider);
    final status = await permissions.request(AppPermission.camera);
    if (!mounted) return;
    switch (status) {
      case AppPermissionStatus.granted:
        await _scanner.start();
      case AppPermissionStatus.permanentlyDenied:
        // Only the settings page can change it now; the page restarts the
        // camera when the officer comes back.
        await permissions.openAppSettings();
      case AppPermissionStatus.denied || AppPermissionStatus.unavailable:
        break;
    }
  }

  void _enterPlate() {
    if (_done) return;
    _done = true;
    context.pushReplacementNamed(RouteNames.manualPlate);
  }

  @override
  Widget build(BuildContext context) {
    final copy = _copy;
    final bottom = MediaQuery.viewPaddingOf(context).bottom;

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light,
      child: Scaffold(
        backgroundColor: AppColors.scannerBase,
        body: DecoratedBox(
          decoration: const BoxDecoration(gradient: _background),
          child: ValueListenableBuilder<QrCameraStatus>(
            valueListenable: _scanner.status,
            builder: (context, status, _) {
              final blocked =
                  status == QrCameraStatus.permissionDenied ||
                  status == QrCameraStatus.unavailable;
              return SafeArea(
                bottom: false,
                child: CustomScrollView(
                  slivers: [
                    SliverFillRemaining(
                      hasScrollBody: false,
                      child: Center(
                        child: ConstrainedBox(
                          constraints: const BoxConstraints(maxWidth: 560),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              _Header(
                                label: copy.context,
                                closeSemantics: copy.closeSemantics,
                              ),
                              Padding(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 16,
                                ),
                                child: _Heading(copy: copy),
                              ),
                              const SizedBox(height: 40),
                              Expanded(
                                child: Padding(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 16,
                                  ),
                                  child: _scanArea(status, blocked),
                                ),
                              ),
                              _Actions(
                                bottomInset: bottom,
                                children: blocked
                                    ? [
                                        _FilledAction(
                                          label: 'Retry Camera Access',
                                          onPressed:
                                              status ==
                                                  QrCameraStatus
                                                      .permissionDenied
                                              ? _retryCameraAccess
                                              : _scanner.start,
                                        ),
                                        _OutlinedAction(
                                          label: 'Enter Plate Instead',
                                          onPressed: _enterPlate,
                                        ),
                                      ]
                                    : _problem != null
                                    ? [
                                        _FilledAction(
                                          label: 'Retry Scanning',
                                          onPressed: _retryScanning,
                                        ),
                                        _OutlinedAction(
                                          label: 'Enter Plate Instead',
                                          onPressed: _enterPlate,
                                        ),
                                      ]
                                    : [
                                        _Shutter(
                                          label: copy.scanLabel,
                                          semanticLabel: copy.scanSemantics,
                                          onPressed: _scan,
                                        ),
                                        _OutlinedAction(
                                          label: 'Enter plate instead',
                                          weight: AppTypography.bold,
                                          onPressed: _enterPlate,
                                        ),
                                      ],
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
        ),
      ),
    );
  }

  /// The frame, and the line under it.
  Widget _scanArea(QrCameraStatus status, bool blocked) {
    final Widget below;
    if (blocked) {
      below = const Padding(
        padding: EdgeInsets.only(top: 16),
        child: Text(
          'You can still verify by plate number.',
          textAlign: TextAlign.center,
          style: _smallText,
        ),
      );
    } else if (_problem case final problem?) {
      below = Padding(
        padding: const EdgeInsets.only(top: 12),
        child: _Alert(
          text: problem == _ScanProblem.notDetected
              ? _copy.notDetected
              : _copy.unreadable,
        ),
      );
    } else {
      below = Padding(
        padding: const EdgeInsets.only(top: 16),
        child: Text(_copy.hint, textAlign: TextAlign.center, style: _smallText),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Flexible(
          child: ConstrainedBox(
            constraints: const BoxConstraints(minHeight: 230, maxHeight: 440),
            // Measured as its smallest size, so a short screen scrolls
            // instead of squeezing the page; it grows into the space left.
            child: _MeasuredAs(
              height: 230,
              child: SizedBox(
                height: double.infinity,
                child: QrScanFrame(
                  child: switch (status) {
                    QrCameraStatus.permissionDenied => const _BlockedPanel(
                      title: 'Camera permission denied',
                      message:
                          'Restore camera access in device settings, or enter '
                          'the vehicle plate.',
                    ),
                    QrCameraStatus.unavailable => const _BlockedPanel(
                      title: 'Camera unavailable',
                      message:
                          'The camera could not start. Try again, or enter the '
                          'vehicle plate.',
                    ),
                    _ => ExcludeSemantics(
                      child: _scanner.buildPreview(context),
                    ),
                  },
                ),
              ),
            ),
          ),
        ),
        below,
      ],
    );
  }

  static const TextStyle _smallText = TextStyle(
    fontFamily: AppTypography.fontFamily,
    fontSize: 12,
    fontWeight: AppTypography.regular,
    letterSpacing: 0,
    height: 1.6,
    color: AppColors.scannerText,
  );
}

/// Dark green, lighter towards the upper right.
const RadialGradient _background = RadialGradient(
  center: Alignment(0.51, -0.19),
  radius: 0.98,
  colors: [
    AppColors.scannerGlow,
    AppColors.scannerMid,
    AppColors.scannerDeep,
    AppColors.scannerBase,
  ],
  stops: [0, 0.275, 0.55, 1],
  // The glow is an ellipse a little over twice as tall as it is wide.
  transform: _StretchVertically(821 / 382),
);

class _StretchVertically extends GradientTransform {
  const _StretchVertically(this.factor);

  final double factor;

  @override
  Matrix4 transform(Rect bounds, {TextDirection? textDirection}) {
    final centre = _background.center.resolve(textDirection).withinRect(bounds);
    return Matrix4.translationValues(centre.dx, centre.dy, 0)
      ..multiply(Matrix4.diagonal3Values(1, factor, 1))
      ..multiply(Matrix4.translationValues(-centre.dx, -centre.dy, 0));
  }
}

/// "CHL receipt verification" and the close button.
class _Header extends StatelessWidget {
  const _Header({required this.label, required this.closeSemantics});

  final String label;
  final String closeSemantics;

  @override
  Widget build(BuildContext context) {
    return ConstrainedBox(
      constraints: const BoxConstraints(minHeight: 52),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        child: Row(
          children: [
            Expanded(
              child: Text(
                label,
                style: const TextStyle(
                  fontFamily: AppTypography.fontFamily,
                  fontSize: 12,
                  fontWeight: AppTypography.regular,
                  letterSpacing: 0,
                  color: AppColors.scannerLabel,
                ),
              ),
            ),
            const SizedBox(width: 12),
            Semantics(
              button: true,
              label: closeSemantics,
              // Excluding the children drops their tap, so it is declared here.
              onTap: context.popOrGoHome,
              excludeSemantics: true,
              child: Material(
                color: AppColors.scannerControl,
                shape: const CircleBorder(),
                clipBehavior: Clip.antiAlias,
                child: InkWell(
                  onTap: context.popOrGoHome,
                  child: SizedBox.square(
                    dimension: 48,
                    child: Center(
                      child: SvgPicture.asset(
                        AssetPaths.iconScannerClose,
                        width: 24,
                        height: 24,
                        excludeFromSemantics: true,
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// "Scan CHL receipt QR" and the instruction under it.
class _Heading extends StatelessWidget {
  const _Heading({required this.copy});

  final QrScanCopy copy;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Semantics(
          header: true,
          child: Text(
            copy.title,
            style: const TextStyle(
              fontFamily: AppTypography.fontFamily,
              fontSize: 26,
              fontWeight: AppTypography.bold,
              letterSpacing: -0.91,
              height: 32.5 / 26,
              color: Colors.white,
            ),
          ),
        ),
        const SizedBox(height: 8),
        Text(
          copy.instruction,
          style: const TextStyle(
            fontFamily: AppTypography.fontFamily,
            fontSize: 14,
            fontWeight: AppTypography.regular,
            letterSpacing: 0,
            height: 22.4 / 14,
            color: AppColors.scannerText,
          ),
        ),
      ],
    );
  }
}

/// In place of the picture when the camera cannot be used.
class _BlockedPanel extends StatelessWidget {
  const _BlockedPanel({required this.title, required this.message});

  final String title;
  final String message;

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: AppColors.scannerDeep,
      child: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              SvgPicture.asset(
                AssetPaths.iconScannerLocked,
                width: 38,
                height: 38,
                excludeFromSemantics: true,
              ),
              const SizedBox(height: 14),
              Semantics(
                header: true,
                liveRegion: true,
                child: Text(
                  title,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontFamily: AppTypography.fontFamily,
                    fontSize: 20,
                    fontWeight: AppTypography.bold,
                    letterSpacing: -0.3,
                    height: 26 / 20,
                    color: Colors.white,
                  ),
                ),
              ),
              const SizedBox(height: 14),
              Text(
                message,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontFamily: AppTypography.fontFamily,
                  fontSize: 14,
                  fontWeight: AppTypography.regular,
                  letterSpacing: 0,
                  height: 23.1 / 14,
                  color: AppColors.scannerLabel,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Amber note under the frame when a scan did not go through.
class _Alert extends StatelessWidget {
  const _Alert({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      liveRegion: true,
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: AppColors.scannerAlertFill,
          border: Border.all(color: AppColors.scannerAlertBorder, width: 1.5),
          borderRadius: const BorderRadius.all(Radius.circular(14)),
        ),
        child: Text(
          text,
          textAlign: TextAlign.center,
          style: const TextStyle(
            fontFamily: AppTypography.fontFamily,
            fontSize: 12,
            fontWeight: AppTypography.regular,
            letterSpacing: 0,
            height: 1.6,
            color: AppColors.scannerAlertText,
          ),
        ),
      ),
    );
  }
}

/// The buttons at the bottom, over a fade to the background colour.
class _Actions extends StatelessWidget {
  const _Actions({required this.children, required this.bottomInset});

  final List<Widget> children;
  final double bottomInset;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0x000C120F), Color(0xEB0C120F)],
          stops: [0, 0.35],
        ),
      ),
      child: Padding(
        // Clear of the home indicator or navigation bar.
        padding: EdgeInsets.fromLTRB(
          20,
          12,
          20,
          bottomInset > 18 ? bottomInset : 18,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            for (var i = 0; i < children.length; i++) ...[
              if (i > 0) const SizedBox(height: 10),
              children[i],
            ],
          ],
        ),
      ),
    );
  }
}

/// White round shutter button with "Scan receipt" under it.
class _Shutter extends StatelessWidget {
  const _Shutter({
    required this.label,
    required this.semanticLabel,
    required this.onPressed,
  });

  final String label;
  final String semanticLabel;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: semanticLabel,
      // Excluding the children drops their tap, so it is declared here.
      onTap: onPressed,
      excludeSemantics: true,
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 4),
            child: Material(
              color: Colors.white,
              shape: const CircleBorder(
                side: BorderSide(color: AppColors.scannerDeep, width: 6),
              ),
              clipBehavior: Clip.antiAlias,
              child: InkWell(
                onTap: onPressed,
                child: SizedBox.square(
                  dimension: 74,
                  child: Center(
                    child: SvgPicture.asset(
                      AssetPaths.iconScannerShutter,
                      width: 28,
                      height: 28,
                      excludeFromSemantics: true,
                    ),
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(height: 12),
          Text(
            label,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontFamily: AppTypography.fontFamily,
              fontSize: 12,
              fontWeight: AppTypography.regular,
              letterSpacing: 0,
              color: Colors.white,
            ),
          ),
        ],
      ),
    );
  }
}

/// White 52 px pill: Retry Scanning, Retry Camera Access.
class _FilledAction extends StatelessWidget {
  const _FilledAction({required this.label, required this.onPressed});

  final String label;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return FilledButton(
      onPressed: onPressed,
      style: FilledButton.styleFrom(
        minimumSize: const Size(double.infinity, 52),
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 13),
        backgroundColor: Colors.white,
        foregroundColor: AppColors.forest,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(28)),
        ),
        textStyle: const TextStyle(
          fontFamily: AppTypography.fontFamily,
          fontSize: 14,
          fontWeight: AppTypography.semiBold,
          letterSpacing: 0,
          height: 18.9 / 14,
        ),
      ),
      child: Text(label, textAlign: TextAlign.center),
    );
  }
}

/// Outlined 48 px pill: Enter plate instead.
class _OutlinedAction extends StatelessWidget {
  const _OutlinedAction({
    required this.label,
    required this.onPressed,
    this.weight = AppTypography.semiBold,
  });

  final String label;
  final VoidCallback onPressed;
  final FontWeight weight;

  @override
  Widget build(BuildContext context) {
    return OutlinedButton(
      onPressed: onPressed,
      style: OutlinedButton.styleFrom(
        minimumSize: const Size(double.infinity, 48),
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 13),
        backgroundColor: AppColors.scannerOutlineFill,
        foregroundColor: Colors.white,
        side: const BorderSide(color: AppColors.scannerOutline, width: 1.5),
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(28)),
        ),
        textStyle: TextStyle(
          fontFamily: AppTypography.fontFamily,
          fontSize: 14,
          fontWeight: weight,
          letterSpacing: 0,
          height: 18.9 / 14,
        ),
      ),
      child: Text(label, textAlign: TextAlign.center),
    );
  }
}

/// Reports [height] as its intrinsic height (and no intrinsic width)
/// without asking [child], which may be a camera view that cannot be
/// measured that way.
class _MeasuredAs extends SingleChildRenderObjectWidget {
  const _MeasuredAs({required this.height, super.child});

  final double height;

  @override
  RenderObject createRenderObject(BuildContext context) =>
      _RenderMeasuredAs(height);

  @override
  void updateRenderObject(
    BuildContext context,
    _RenderMeasuredAs renderObject,
  ) {
    renderObject.height = height;
  }
}

class _RenderMeasuredAs extends RenderProxyBox {
  _RenderMeasuredAs(this._height);

  double _height;
  set height(double value) {
    if (value == _height) return;
    _height = value;
    markNeedsLayout();
  }

  @override
  double computeMinIntrinsicHeight(double width) => _height;

  @override
  double computeMaxIntrinsicHeight(double width) => _height;

  @override
  double computeMinIntrinsicWidth(double height) => 0;

  @override
  double computeMaxIntrinsicWidth(double height) => 0;
}

import 'dart:async';

import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';

/// The toast showing now, so a new one replaces it.
OverlayEntry? _current;

/// Shows a short confirmation ("Sign out successful") near the top of the
/// screen, clear of the buttons at the bottom. It replaces any toast already
/// showing, goes away after [duration] or when tapped, never blocks the rest
/// of the screen, and is read out by screen readers.
void showAppToast(
  BuildContext context,
  String message, {
  Duration duration = const Duration(seconds: 3),
}) {
  final previous = _current;
  if (previous != null && previous.mounted) previous.remove();
  late final OverlayEntry entry;
  entry = OverlayEntry(
    builder: (context) => _Toast(
      message: message,
      duration: duration,
      onDone: () {
        if (_current == entry) _current = null;
        if (entry.mounted) entry.remove();
      },
    ),
  );
  _current = entry;
  Overlay.of(context, rootOverlay: true).insert(entry);
}

class _Toast extends StatefulWidget {
  const _Toast({
    required this.message,
    required this.duration,
    required this.onDone,
  });

  final String message;
  final Duration duration;
  final VoidCallback onDone;

  /// Widest the toast grows on tablets.
  static const double maxWidth = 420;

  @override
  State<_Toast> createState() => _ToastState();
}

class _ToastState extends State<_Toast> with SingleTickerProviderStateMixin {
  late final AnimationController _animation = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 220),
    reverseDuration: const Duration(milliseconds: 160),
  );
  Timer? _timer;
  bool _closing = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_animation.status != AnimationStatus.dismissed) return;
    // Shown at once when the system asks for reduced motion.
    if (MediaQuery.disableAnimationsOf(context)) {
      _animation.value = 1;
    } else {
      _animation.forward();
    }
    _timer = Timer(widget.duration, _close);
  }

  Future<void> _close() async {
    if (_closing) return;
    _closing = true;
    _timer?.cancel();
    if (!MediaQuery.disableAnimationsOf(context)) {
      await _animation.reverse();
    }
    widget.onDone();
  }

  @override
  void dispose() {
    _timer?.cancel();
    _animation.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final curved = CurvedAnimation(
      parent: _animation,
      curve: Curves.easeOutCubic,
      reverseCurve: Curves.easeInCubic,
    );

    return Positioned(
      top: MediaQuery.viewPaddingOf(context).top + 12,
      left: 16,
      right: 16,
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: _Toast.maxWidth),
          child: FadeTransition(
            opacity: curved,
            child: SlideTransition(
              position: Tween(
                begin: const Offset(0, -0.4),
                end: Offset.zero,
              ).animate(curved),
              child: Semantics(
                container: true,
                liveRegion: true,
                label: widget.message,
                // Excluding the children drops their tap, so it is declared here.
                onTap: _close,
                excludeSemantics: true,
                child: GestureDetector(
                  onTap: _close,
                  child: Material(
                    color: AppColors.surface,
                    elevation: 6,
                    shadowColor: const Color(0x40000000),
                    borderRadius: const BorderRadius.all(Radius.circular(16)),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 14,
                      ),
                      child: Row(
                        children: [
                          const Icon(
                            Icons.check_circle_rounded,
                            color: AppColors.green,
                            size: 22,
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              widget.message,
                              style: const TextStyle(
                                fontFamily: AppTypography.fontFamily,
                                fontSize: 14,
                                fontWeight: AppTypography.medium,
                                letterSpacing: 0,
                                height: 1.4,
                                color: AppColors.forest,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

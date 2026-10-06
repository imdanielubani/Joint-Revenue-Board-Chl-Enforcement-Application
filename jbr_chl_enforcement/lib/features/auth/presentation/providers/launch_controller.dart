import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../domain/entities/launch_stage.dart';

final launchControllerProvider =
    NotifierProvider.autoDispose<LaunchController, LaunchStage>(
      LaunchController.new,
    );

/// Drives the launch screen through its start-up stages.
class LaunchController extends Notifier<LaunchStage> {
  /// Minimum time each stage stays on screen so its message can be read.
  static const Duration minimumStageDuration = Duration(milliseconds: 900);

  @override
  LaunchStage build() {
    Future.microtask(_run);
    return LaunchStage.checkingSession;
  }

  Future<void> _run() async {
    // TODO(auth): restore the saved session here once the session service
    // exists, alongside the minimum stage duration.
    await Future<void>.delayed(minimumStageDuration);
    if (!ref.mounted) return;
    state = LaunchStage.loadingOfflineCache;

    // TODO(offline_sync): warm the offline vehicle cache here once the cache
    // service exists, alongside the minimum stage duration.
    await Future<void>.delayed(minimumStageDuration);
    if (!ref.mounted) return;
    state = LaunchStage.ready;
  }
}

/// Start-up stages shown on the launch screen, in order.
///
/// [progress] values match the progress bar fill in the Figma launch frames
/// (55 / 253, 146 / 253 and full).
enum LaunchStage {
  checkingSession(progress: 55 / 253),
  loadingOfflineCache(progress: 146 / 253),
  ready(progress: 1);

  const LaunchStage({required this.progress});

  final double progress;
}

/// What a notification is about. Decides its category, icon and colours.
enum NotificationType {
  /// A verification did not complete (e.g. "Review an incomplete
  /// verification"). Links to the verification record.
  incompleteVerification,

  /// Location was unavailable for a request.
  locationAttention,

  /// The internet connection came back.
  connectionRestored,

  /// The RFID reader was disconnected.
  rfidDisconnected,

  /// The RFID reader connected.
  rfidConnected,

  /// The centrally managed session is about to expire.
  sessionExpiry,

  /// A new version of the app is available.
  appUpdate,
}

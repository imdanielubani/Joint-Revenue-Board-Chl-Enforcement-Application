/// A vehicle's CHL trip situation at the moment it was verified.
enum TripStatus {
  /// On a declared trip that is currently valid.
  active,

  /// No trip declared.
  noActive,

  /// Only an earlier trip was found (e.g. an expired one).
  previous,
}

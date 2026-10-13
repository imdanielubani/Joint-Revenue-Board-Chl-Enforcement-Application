/// A vehicle's JRB E-Tag as found at verification.
enum ETagStatus {
  /// Registered and valid.
  valid,

  /// Registered but not valid.
  invalid,

  /// The vehicle has no E-Tag.
  missing,
}

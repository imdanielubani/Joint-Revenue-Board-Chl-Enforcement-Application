import 'package:flutter/foundation.dart';

/// A vehicle registration number.
///
/// Stored in canonical form: uppercase letters and digits only, so
/// "abc-123 aa", "ABC123AA" and "ABC 123 AA" are the same plate. Shown
/// grouped into its letter and digit runs ("ABC 123 AA").
@immutable
class PlateNumber {
  const PlateNumber._(this.value);

  /// Shortest and longest plates accepted, in canonical characters.
  static const int minLength = 3;
  static const int maxLength = 10;

  /// Canonical form, e.g. `ABC123AA`. Send this to the server.
  final String value;

  /// The plate in [input], or null when it is too short or too long once
  /// spaces, hyphens and other separators are removed.
  static PlateNumber? tryParse(String input) {
    final canonical = compact(input);
    if (canonical.length < minLength || canonical.length > maxLength) {
      return null;
    }
    return PlateNumber._(canonical);
  }

  /// [input] uppercased with everything but A–Z and 0–9 removed.
  static String compact(String input) =>
      input.toUpperCase().replaceAll(_separators, '');

  /// [canonical] with a space between each run of letters and run of
  /// digits: `ABC123AA` → `ABC 123 AA`, `LA123ABC` → `LA 123 ABC`.
  static String group(String canonical) =>
      _runs.allMatches(canonical).map((match) => match[0]).join(' ');

  static final RegExp _separators = RegExp('[^A-Z0-9]');
  static final RegExp _runs = RegExp('[A-Z]+|[0-9]+');

  /// The standard Nigerian plate (three letters, three digits, two
  /// letters: `ABC 123 AA`), one dash per character.
  static const String standardMask = '--- --- --';

  /// Whether [canonical] is the start of (or all of) a standard plate.
  static bool isStandardSoFar(String canonical) =>
      _standardSoFar.hasMatch(canonical);

  static final RegExp _standardSoFar = RegExp(
    '^([A-Z]{0,3}|[A-Z]{3}[0-9]{1,3}|[A-Z]{3}[0-9]{3}[A-Z]{1,2})\$',
  );

  /// The part of [standardMask] still to be typed after [canonical], e.g.
  /// `AB` → `- --- --`, `ABC12` → `- --`. Empty when [canonical] is complete
  /// or does not follow the standard pattern (older and special plates).
  static String remainingMask(String canonical) {
    if (!isStandardSoFar(canonical)) return '';
    return standardMask.substring(group(canonical).length);
  }

  /// For display, e.g. `ABC 123 AA`.
  String get display => group(value);

  @override
  bool operator ==(Object other) =>
      other is PlateNumber && other.value == value;

  @override
  int get hashCode => value.hashCode;

  @override
  String toString() => display;
}

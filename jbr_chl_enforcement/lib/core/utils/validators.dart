/// Input checks shared across forms.
abstract final class Validators {
  static final RegExp _email = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$');

  /// Whether [value] looks like an email address. Expects trimmed input.
  static bool isEmail(String value) => _email.hasMatch(value);
}

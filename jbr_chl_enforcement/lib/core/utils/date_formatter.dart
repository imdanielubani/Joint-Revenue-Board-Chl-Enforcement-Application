/// Dates as the designs write them.
abstract final class DateFormatter {
  /// British abbreviations, with "Sept" as written in the designs.
  static const List<String> _months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sept',
    'Oct',
    'Nov',
    'Dec',
  ];

  static bool _sameDay(DateTime a, DateTime b) =>
      a.year == b.year && a.month == b.month && a.day == b.day;

  /// "26 Sept 2026".
  static String date(DateTime when) =>
      '${when.day} ${_months[when.month - 1]} ${when.year}';

  /// "Today", "Yesterday" or "26 Sept 2026", counting from [now].
  static String day(DateTime when, DateTime now) {
    if (_sameDay(when, now)) return 'Today';
    if (_sameDay(when, DateTime(now.year, now.month, now.day - 1))) {
      return 'Yesterday';
    }
    return date(when);
  }
}

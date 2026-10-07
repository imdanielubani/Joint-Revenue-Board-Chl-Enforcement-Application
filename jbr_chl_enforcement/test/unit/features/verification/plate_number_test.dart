import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:jbr_chl_enforcement/features/verification/domain/entities/plate_number.dart';
import 'package:jbr_chl_enforcement/features/verification/presentation/widgets/plate_input_field.dart';

void main() {
  group('PlateNumber', () {
    test('removes separators and uppercases', () {
      expect(PlateNumber.compact('abc-123 aa'), 'ABC123AA');
      expect(PlateNumber.compact(' l.n.d/482_xk '), 'LND482XK');
    });

    test('groups letter and digit runs', () {
      expect(PlateNumber.group('ABC123AA'), 'ABC 123 AA');
      expect(PlateNumber.group('LA123ABC'), 'LA 123 ABC');
      expect(PlateNumber.group('ABC'), 'ABC');
      expect(PlateNumber.group(''), '');
    });

    test('the same plate however it is typed', () {
      final plate = PlateNumber.tryParse('abc-123-aa');
      expect(plate, PlateNumber.tryParse('ABC 123 AA'));
      expect(plate!.value, 'ABC123AA');
      expect(plate.display, 'ABC 123 AA');
      expect(plate.hashCode, PlateNumber.tryParse('ABC123AA').hashCode);
    });

    test('rejects plates that are too short or too long', () {
      expect(PlateNumber.tryParse(''), isNull);
      expect(PlateNumber.tryParse('A-1'), isNull);
      expect(PlateNumber.tryParse('AB1'), isNotNull);
      expect(PlateNumber.tryParse('ABCDE12345'), isNotNull);
      expect(PlateNumber.tryParse('ABCDE123456'), isNull);
    });

    test('recognises the start of a standard plate (ABC 123 AA)', () {
      for (final standard in ['', 'A', 'ABC', 'ABC1', 'ABC123', 'ABC123A']) {
        expect(PlateNumber.isStandardSoFar(standard), isTrue, reason: standard);
      }
      expect(PlateNumber.isStandardSoFar('ABC123AA'), isTrue);
      for (final other in [
        '1',
        'AB1',
        'ABCD',
        'ABC1A',
        'ABC123AAA',
        'LA123ABC',
      ]) {
        expect(PlateNumber.isStandardSoFar(other), isFalse, reason: other);
      }
    });

    test('a standard plate is spaced 3-3-2 as each group completes', () {
      expect(PlateNumber.formatForInput(''), '');
      expect(PlateNumber.formatForInput('AB'), 'AB');
      expect(PlateNumber.formatForInput('ABC'), 'ABC ');
      expect(PlateNumber.formatForInput('ABC12'), 'ABC 12');
      expect(PlateNumber.formatForInput('ABC123'), 'ABC 123 ');
      expect(PlateNumber.formatForInput('ABC123AA'), 'ABC 123 AA');
      // Other plates keep their letter and digit groups.
      expect(PlateNumber.formatForInput('LA123ABC'), 'LA 123 ABC');
      expect(PlateNumber.formatForInput('ABCD'), 'ABCD');
    });

    test('remaining dashes follow what is typed', () {
      expect(PlateNumber.remainingMask(''), '--- --- --');
      expect(PlateNumber.remainingMask('AB'), '- --- --');
      expect(PlateNumber.remainingMask('ABC'), '--- --');
      expect(PlateNumber.remainingMask('ABC12'), '- --');
      expect(PlateNumber.remainingMask('ABC123'), '--');
      expect(PlateNumber.remainingMask('ABC123A'), '-');
      expect(PlateNumber.remainingMask('ABC123AA'), '');
      // Older and special plates get no guide.
      expect(PlateNumber.remainingMask('LA123'), '');
    });
  });

  group('PlateNumberFormatter', () {
    const formatter = PlateNumberFormatter();

    TextEditingValue value(String text, int cursor) => TextEditingValue(
      text: text,
      selection: TextSelection.collapsed(offset: cursor),
    );

    void expectEdit(
      (String, int) before,
      (String, int) typed,
      (String, int) result,
    ) {
      final out = formatter.formatEditUpdate(
        value(before.$1, before.$2),
        value(typed.$1, typed.$2),
      );
      expect((out.text, out.selection.baseOffset), result);
    }

    test('uppercases as it is typed', () {
      expectEdit(('', 0), ('a', 1), ('A', 1));
    });

    test('spaces a new run of digits', () {
      expectEdit(('ABC', 3), ('ABC1', 4), ('ABC 1', 5));
    });

    test('a space is added as soon as a group of 3 is complete', () {
      expectEdit(('AB', 2), ('ABC', 3), ('ABC ', 4));
      expectEdit(('ABC 12', 6), ('ABC 123', 7), ('ABC 123 ', 8));
      expectEdit(('ABC 123 A', 9), ('ABC 123 AA', 10), ('ABC 123 AA', 10));
    });

    test('typed spaces and hyphens are not doubled', () {
      expectEdit(('ABC ', 4), ('ABC  ', 5), ('ABC ', 4));
      expectEdit(('ABC ', 4), ('ABC -', 5), ('ABC ', 4));
      expectEdit(('AB', 2), ('AB-', 3), ('AB', 2));
    });

    test('backspace over the added space deletes the character before it', () {
      expectEdit(('ABC ', 4), ('ABC', 3), ('AB', 2));
      expectEdit(('ABC 123 ', 8), ('ABC 123', 7), ('ABC 12', 6));
    });

    test('pasted text is normalised', () {
      expectEdit(('', 0), ('lnd-482-xk', 10), ('LND 482 XK', 10));
    });

    test('backspace over a space deletes the character before it', () {
      expectEdit(('ABC 123', 4), ('ABC123', 3), ('AB 123', 2));
    });

    test('typing in the middle keeps the cursor after the new character', () {
      expectEdit(('AB 123', 2), ('ABC 123', 3), ('ABC 123 ', 3));
      expectEdit(('ABC', 1), ('A9BC', 2), ('A 9 BC', 3));
    });

    test('stops at the maximum length', () {
      expectEdit(('ABCDE 12345', 11), ('ABCDE 12345X', 12), (
        'ABCDE 12345',
        11,
      ));
    });
  });
}

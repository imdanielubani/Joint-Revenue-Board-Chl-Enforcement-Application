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

    test('typed spaces and hyphens are dropped', () {
      expectEdit(('ABC', 3), ('ABC ', 4), ('ABC', 3));
      expectEdit(('ABC', 3), ('ABC-', 4), ('ABC', 3));
    });

    test('pasted text is normalised', () {
      expectEdit(('', 0), ('lnd-482-xk', 10), ('LND 482 XK', 10));
    });

    test('backspace over a space deletes the character before it', () {
      expectEdit(('ABC 123', 4), ('ABC123', 3), ('AB 123', 2));
    });

    test('typing in the middle keeps the cursor after the new character', () {
      expectEdit(('AB 123', 2), ('ABC 123', 3), ('ABC 123', 3));
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

import 'package:flutter_test/flutter_test.dart';
import 'package:jbr_chl_enforcement/features/auth/data/models/officer_model.dart';
import 'package:jbr_chl_enforcement/features/auth/domain/entities/officer.dart';

void main() {
  Officer named(String name) => Officer(id: '1', name: name, email: 'a@b.c');

  group('initials', () {
    test('first and last name', () {
      expect(named('Daniel John').initials, 'DJ');
      expect(named('ada  grace   lovelace').initials, 'AL');
    });

    test('single name', () {
      expect(named('Daniel').initials, 'D');
    });

    test('blank name', () {
      expect(named('   ').initials, '?');
    });
  });

  test('region and role survive a JSON round trip', () {
    const officer = Officer(
      id: '7',
      name: 'Daniel John',
      email: 'daniel@jrb.gov.ng',
      region: 'Lagos State',
      role: 'Enforcement Agent',
    );

    final restored = OfficerModel.fromJson(OfficerModel.toJson(officer));

    expect(restored, officer);
  });
}

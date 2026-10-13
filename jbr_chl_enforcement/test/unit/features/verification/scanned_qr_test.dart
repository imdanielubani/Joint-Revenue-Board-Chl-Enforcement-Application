import 'package:flutter_test/flutter_test.dart';
import 'package:jbr_chl_enforcement/features/verification/domain/entities/scanned_qr.dart';

void main() {
  group('ScannedQr.read', () {
    test('an E-Tag code is an E-Tag', () {
      for (final code in [
        'ETAG-7781-0042',
        'E-TAG-7781',
        'etag:7781',
        'JRB-ETAG-7781',
        'JRB-E-TAG-7781',
        'jrb etag 7781',
      ]) {
        expect(ScannedQr.read(code).kind, ScannedQrKind.eTag, reason: code);
      }
    });

    test('any other code is a CHL receipt', () {
      for (final code in [
        'JRB-CHL-RCPT-000123',
        'RCPT-000123',
        'https://jrb.example/receipt/000123',
        // "ETAG" only counts at the start.
        'RCPT-ETAG-000123',
      ]) {
        expect(ScannedQr.read(code).kind, ScannedQrKind.receipt, reason: code);
      }
    });

    test('the code is trimmed', () {
      expect(
        ScannedQr.read('  ETAG-1 \n'),
        const ScannedQr(kind: ScannedQrKind.eTag, value: 'ETAG-1'),
      );
    });
  });
}

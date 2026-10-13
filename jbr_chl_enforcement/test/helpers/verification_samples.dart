import 'package:jbr_chl_enforcement/features/chl_trips/domain/entities/chl_trip.dart';
import 'package:jbr_chl_enforcement/features/chl_trips/domain/entities/trip_status.dart';
import 'package:jbr_chl_enforcement/features/vehicle/domain/entities/e_tag_status.dart';
import 'package:jbr_chl_enforcement/features/vehicle/domain/entities/verification_result.dart';
import 'package:jbr_chl_enforcement/features/verification/domain/entities/plate_number.dart';

/// The active trip in the designs, checked at [now]: ABC 123 AA from
/// Abeokuta South, Ogun, to Ikeja, Lagos, valid for 4 h 21 min 2 s more.
VerificationResult sampleActiveResult(
  DateTime now, {
  ETagStatus eTag = ETagStatus.missing,
}) => VerificationResult(
  plate: PlateNumber.tryParse('ABC123AA')!,
  vehicleType: '12/14 tyres and its equivalent',
  eTagStatus: eTag,
  tripStatus: TripStatus.active,
  checkedAt: now,
  trip: ChlTrip(
    transactionReference: '564031956608',
    startedAt: DateTime(2026, 10, 5, 16, 28),
    paidAt: DateTime(2026, 10, 5, 16, 22),
    transactionType: 'Complete Leg',
    transactionStatus: 'Successful',
    originState: 'Ogun',
    originLga: 'Abeokuta South',
    destinationState: 'Lagos',
    destinationLga: 'Ikeja',
    validUntil: now.add(const Duration(hours: 4, minutes: 21, seconds: 2)),
    cargo: 'General haulage',
    paymentReference: 'PAY-2026-08142',
    terminalId: '2070MJHU',
    contactNumber: '8139751699',
    channel: 'Fortis',
    channelType: 'POS',
  ),
  destinationCheck: const DestinationCheck(
    enforcementPoint: 'Ikeja enforcement point',
    completionDecision: 'Awaiting central validation',
    centralDelay: Duration(seconds: 900),
  ),
);

/// LND 482 XK, with no active trip; [withLastTrip] adds its completed last
/// trip ([sampleLastTrip]).
VerificationResult sampleNoTripResult(
  DateTime now, {
  bool withLastTrip = false,
  ETagStatus eTag = ETagStatus.invalid,
}) => VerificationResult(
  plate: PlateNumber.tryParse('LND482XK')!,
  vehicleType: 'Heavy goods vehicle',
  eTagStatus: eTag,
  tripStatus: TripStatus.noActive,
  checkedAt: now,
  lastTrip: withLastTrip ? sampleLastTrip() : null,
);

/// A completed trip from Abeokuta South, Ogun, to Ikeja, Lagos, on
/// 5 Oct 2026.
ChlTrip sampleLastTrip({
  ChlTripState state = ChlTripState.completed,
  bool completed = true,
}) => ChlTrip(
  transactionReference: '564031950271',
  startedAt: DateTime(2026, 10, 5, 16, 28),
  paidAt: DateTime(2026, 10, 5, 16, 22),
  transactionType: 'Complete Leg',
  transactionStatus: 'Successful',
  originState: 'Ogun',
  originLga: 'Abeokuta South',
  destinationState: 'Lagos',
  destinationLga: 'Ikeja',
  validUntil: DateTime(2026, 10, 6, 4, 28),
  cargo: 'General haulage',
  paymentReference: 'PAY-2026-07960',
  state: state,
  completedAt: completed ? DateTime(2026, 10, 5, 21, 45) : null,
);

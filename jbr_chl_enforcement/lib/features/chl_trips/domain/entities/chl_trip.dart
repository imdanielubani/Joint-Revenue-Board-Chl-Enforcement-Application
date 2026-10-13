import 'package:flutter/foundation.dart';

/// A paid CHL haulage trip, as CHL returns it with a verification.
@immutable
class ChlTrip {
  const ChlTrip({
    required this.transactionReference,
    required this.startedAt,
    required this.paidAt,
    required this.transactionType,
    required this.transactionStatus,
    required this.originState,
    required this.originLga,
    required this.destinationState,
    required this.destinationLga,
    required this.validUntil,
    this.cargo,
    this.paymentReference,
    this.terminalId,
    this.contactNumber,
    this.channel,
    this.channelType,
    this.state = ChlTripState.active,
    this.completedAt,
  });

  /// e.g. "564031956608".
  final String transactionReference;

  final DateTime startedAt;

  /// When the CHL levy was paid: the transaction date.
  final DateTime paidAt;

  /// The trip type, e.g. "Complete Leg".
  final String transactionType;

  /// Whether the payment went through, e.g. "Successful".
  final String transactionStatus;

  final String originState;
  final String originLga;
  final String destinationState;
  final String destinationLga;

  /// When the trip stops being valid: "Trip will close on".
  final DateTime validUntil;

  /// e.g. "General haulage"; null when not declared.
  final String? cargo;

  /// e.g. "PAY-2026-08142".
  final String? paymentReference;

  /// The payment terminal, e.g. "2070MJHU".
  final String? terminalId;

  /// The contact number on the payment, e.g. "8139751699".
  final String? contactNumber;

  /// Who took the payment, e.g. "Fortis".
  final String? channel;

  /// How it was taken, e.g. "POS".
  final String? channelType;

  /// The trip's status as CHL reported it. For an earlier trip it is kept
  /// as reported; elapsed time does not change it.
  final ChlTripState state;

  /// When CHL recorded the trip as completed, if it has.
  final DateTime? completedAt;

  /// Time left until [validUntil], never negative.
  Duration remainingAt(DateTime now) {
    final left = validUntil.difference(now);
    return left.isNegative ? Duration.zero : left;
  }
}

/// Where a CHL trip stands, as CHL reports it.
enum ChlTripState {
  active('Active'),
  completed('Completed'),
  expired('Expired');

  const ChlTripState(this.label);

  final String label;
}

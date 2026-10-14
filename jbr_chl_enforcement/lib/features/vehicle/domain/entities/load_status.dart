/// Whether a vehicle with no active CHL trip is carrying haulage goods, as
/// the officer confirms by looking. CHL enforcement applies only to a
/// loaded vehicle.
enum LoadStatus {
  loaded('Loaded'),
  empty('Empty');

  const LoadStatus(this.label);

  final String label;
}

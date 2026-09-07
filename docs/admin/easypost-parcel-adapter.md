# EasyPost parcel adapter boundary

The payload builder accepts exactly one parcel. Weight units are `oz`, `lb`, `g`, or `kg`; dimension units are `in`, `cm`, or `mm`. Missing/null distance unit retains the existing inches default. Dimensions may all be absent/null; otherwise length, width and height must all be positive finite numbers.

Conversion uses 28.349523125 grams per ounce and 2.54 centimeters per inch. Provider values are rounded to the nearest tenth (positive half-tenths round upward); measurements that round to zero, overflow, or exceed exact safe-integer tenths are rejected. These are numerical bounds, not carrier package-size limits. Unknown units are rejected even when dimensions are absent.

The payload contains ounces/inches without `mass_unit` or `distance_unit`; the order reference is on `shipment.reference`. This follows the [EasyPost parcel contract](https://docs.easypost.com/docs/parcels) and [shipment contract](https://docs.easypost.com/docs/shipments), checked September 7, 2026 UTC.

Rates and label transport remain unavailable. Tests use an unused synthetic credential to exercise pure payload construction, not a provider request. This correction does not establish carrier acceptance, quote persistence, currency handling, label purchase safety, international support or operational readiness.

export interface ShippingProviderParcel {
  length?: number | null;
  width?: number | null;
  height?: number | null;
  distanceUnit?: string | null;
  weight: number;
  weightUnit: string;
}

// Conversion factors use the international inch and avoirdupois ounce.
const WEIGHT_TO_OUNCES: Readonly<Record<string, number>> = {
  oz: 1,
  lb: 16,
  g: 1 / 28.349523125,
  kg: 1000 / 28.349523125,
};
const DISTANCE_TO_INCHES: Readonly<Record<string, number>> = {
  in: 1,
  cm: 1 / 2.54,
  mm: 1 / 25.4,
};

function normalizeParcelMeasurement(value: number, factor: number): number {
  if (!Number.isFinite(value) || value <= 0)
    throw new Error("Parcel measurements must be finite positive numbers");
  const tenths = value * factor * 10;
  // Keep the rounded integer exact before returning provider precision.
  if (!Number.isFinite(tenths) || !Number.isSafeInteger(Math.round(tenths)))
    throw new Error("Parcel measurement exceeds supported precision");
  const normalized = Math.round(tenths) / 10;
  if (normalized <= 0) throw new Error("Parcel measurement rounds to zero");
  return normalized;
}

export function normalizeEasyPostParcel(parcel: ShippingProviderParcel | undefined) {
  if (!parcel) throw new Error("Exactly one parcel is required for EasyPost shipping rates");
  if (!Object.hasOwn(WEIGHT_TO_OUNCES, parcel.weightUnit))
    throw new Error("Unsupported parcel weight unit");
  const distanceUnit = parcel.distanceUnit ?? "in";
  if (!Object.hasOwn(DISTANCE_TO_INCHES, distanceUnit))
    throw new Error("Unsupported parcel distance unit");
  const dimensions = [parcel.length, parcel.width, parcel.height];
  const supplied = dimensions.filter((value) => value != null).length;
  if (supplied !== 0 && supplied !== 3)
    throw new Error("Parcel dimensions must include length, width and height");
  return {
    ...(supplied === 3
      ? {
          length: normalizeParcelMeasurement(parcel.length!, DISTANCE_TO_INCHES[distanceUnit]),
          width: normalizeParcelMeasurement(parcel.width!, DISTANCE_TO_INCHES[distanceUnit]),
          height: normalizeParcelMeasurement(parcel.height!, DISTANCE_TO_INCHES[distanceUnit]),
        }
      : {}),
    weight: normalizeParcelMeasurement(parcel.weight, WEIGHT_TO_OUNCES[parcel.weightUnit]),
  };
}

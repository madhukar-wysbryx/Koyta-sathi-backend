export type VehicleType = "truck" | "tractor" | "bullock_cart" | "chakda";
export type KoytaType = "full" | "half";
export type DayType =
  | "working_day"
  | "in_transit"
  | "phad_reached"
  | "at_phad_no_work"
  | "journey_started";

export interface ToliComposition {
  fullKoytaMen: number;
  fullKoytaWomen: number;
  halfKoytaMen: number;
  halfKoytaWomen: number;
  boysHelping: number;
  girlsHelping: number;
  weightedKoytaCount: number;
}

export interface VehicleDetails {
  type: VehicleType;
  count: number;
  tonsPerVehicle: number;
}

export interface TrackerOnboarding {
  startDate: string;
  targetFactory: { name: string; village: string; taluka: string; district: string };
  mukadam: { name: string; phoneE164: string };
  migrationDistanceDays: number;
  koytaType: KoytaType;
  advanceTakenThisYearPaise: number;
  outstandingLastYearPaise: number;
  totalAdvancePaise: number;
  toli: ToliComposition;
  vehicle: VehicleDetails;
  ratesVersionId: string;
  updatedAt: string;
}

export interface DailyRecord {
  occurredOn: string;
  dayType: DayType;
  factoryName: string;
  village: string;
  district: string;
  startTime?: string;
  endTime?: string;
  vehiclesFilled?: number;
  perDayToliOverride?: Partial<ToliComposition>;
  ratesVersionId: string;
  wagesEarnedToliPaise: number;
  wagesEarnedKoytaPaise: number;
  loggedAt: string;
}

// SOPPECOM 2024 rates in paise per ton
export const RATE_PER_TON_PAISE: Record<VehicleType, number> = {
  bullock_cart: 31_820,
  tractor: 36_601,
  chakda: 36_601,
  truck: 40_841,
};

export const DEFAULT_TONS_PER_VEHICLE: Record<VehicleType, number> = {
  truck: 10,
  tractor: 3,
  bullock_cart: 1,
  chakda: 2,
};

export const RATES_VERSION_ID = "soppecom-2024-v1";

export function computeWeightedKoytaCount(toli: Omit<ToliComposition, "weightedKoytaCount">): number {
  return (
    toli.fullKoytaMen +
    toli.fullKoytaWomen +
    0.5 * (toli.halfKoytaMen + toli.halfKoytaWomen)
  );
}

export function computeWages(
  vehiclesFilled: number,
  tonsPerVehicle: number,
  vehicleType: VehicleType,
  toli: ToliComposition
): { toliPaise: number; koytaPaise: number } {
  const tonsFilled = vehiclesFilled * tonsPerVehicle;
  const toliPaise = Math.round(tonsFilled * RATE_PER_TON_PAISE[vehicleType]);
  const koytaUnits = Math.max(toli.weightedKoytaCount, 1);
  const koytaPaise = Math.round(toliPaise / koytaUnits);
  return { toliPaise, koytaPaise };
}

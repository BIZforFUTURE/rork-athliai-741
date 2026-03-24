export const lbsToKg = (lbs: number): number => Math.round(lbs * 0.453592 * 10) / 10;
export const kgToLbs = (kg: number): number => Math.round(kg / 0.453592 * 10) / 10;

export const inchesToCm = (inches: number): number => Math.round(inches * 2.54 * 10) / 10;
export const cmToInches = (cm: number): number => Math.round(cm / 2.54 * 10) / 10;

export const milesToKm = (miles: number): number => Math.round(miles * 1.60934 * 100) / 100;
export const kmToMiles = (miles: number): number => Math.round(miles / 1.60934 * 100) / 100;

export const formatHeightMetric = (totalInches: number): string => {
  const cm = inchesToCm(totalInches);
  if (cm >= 100) {
    const m = Math.floor(cm / 100);
    const remainingCm = Math.round(cm % 100);
    return `${m}.${remainingCm.toString().padStart(2, '0')}m`;
  }
  return `${cm}cm`;
};

export const formatHeightImperial = (totalInches: number): string => {
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;
  return `${feet}'${inches}"`;
};

export const formatWeightMetric = (lbs: number): string => {
  return `${lbsToKg(lbs)} kg`;
};

export const formatWeightImperial = (lbs: number): string => {
  return `${lbs} lbs`;
};

export const formatDistanceMetric = (miles: number): string => {
  return milesToKm(miles).toFixed(1);
};

export const formatDistanceImperial = (miles: number): string => {
  return miles.toFixed(1);
};

export const paceMinPerMiToMinPerKm = (minPerMi: number): number => {
  return minPerMi / 1.60934;
};

export function calculateSavings({ baseline, events }) {
  const automatedUnits = events.reduce((sum, event) => sum + Number(event.automatedUnits || 0), 0);
  const eligibleUnits = events.reduce((sum, event) => sum + Number(event.eligibleUnits || 0), 0);
  const exceptionMinutes = events.reduce((sum, event) => sum + Number(event.exceptionMinutes || 0), 0);
  const oversightMinutes = events.reduce((sum, event) => sum + Number(event.oversightMinutes || 0), 0);
  const variableCost = events.reduce((sum, event) => sum + Number(event.variableCost || 0), 0);
  const grossMinutesSaved = automatedUnits * Number(baseline.manualMinutesPerUnit);
  const netMinutesReleased = Math.max(0, grossMinutesSaved - exceptionMinutes - oversightMinutes);
  const hoursReleased = netMinutesReleased / 60;
  const estimatedCapacityValue = hoursReleased * Number(baseline.loadedHourlyCost);
  const netOperatingValue = estimatedCapacityValue - variableCost;

  return {
    eligibleUnits,
    automatedUnits,
    exceptionMinutes,
    oversightMinutes,
    variableCost,
    grossMinutesSaved,
    netMinutesReleased,
    hoursReleased,
    estimatedCapacityValue,
    netOperatingValue,
    currency: baseline.currency ?? "PEN",
    confidence: baseline.confidence,
  };
}

#!/usr/bin/env node
/**
 * Client Unit Economics — deterministic, dependency-free quote preflight.
 * Uses capacity value (not cash savings), with zero fixed-cost pre-revenue policy.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const nonnegative = (v, key) => {
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0) {
    throw new Error(`${key} must be a finite non-negative number`);
  }
  return v;
};
const positive = (v, key) => {
  const n = nonnegative(v, key);
  if (n === 0) throw new Error(`${key} must be greater than zero`);
  return n;
};
const round2 = n => Math.round((n + Number.EPSILON) * 100) / 100;

export function evaluate(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("input object required");
  const monthlyUnits = nonnegative(input.monthlyUnits, "monthlyUnits");
  const manualMinutesPerUnit = positive(input.manualMinutesPerUnit, "manualMinutesPerUnit");
  const exceptionMinutes = nonnegative(input.exceptionMinutes, "exceptionMinutes");
  const oversightMinutes = nonnegative(input.oversightMinutes, "oversightMinutes");
  const hourlyCostPen = positive(input.hourlyCostPen, "hourlyCostPen");
  const variableCostPerUnitPen = nonnegative(input.variableCostPerUnitPen, "variableCostPerUnitPen");
  const allocatedFixedCostPen = nonnegative(input.allocatedFixedCostPen, "allocatedFixedCostPen");
  const monthlyFeePen = nonnegative(input.monthlyFeePen, "monthlyFeePen");
  const supportMinutesMonthly = nonnegative(input.supportMinutesMonthly, "supportMinutesMonthly");
  const operatorHourlyCostPen = nonnegative(input.operatorHourlyCostPen, "operatorHourlyCostPen");
  const expectedOtherCostPen = nonnegative(input.expectedOtherCostPen ?? 0, "expectedOtherCostPen");
  const targetMarginFraction = input.targetMarginFraction ?? 0.5;
  if (typeof targetMarginFraction !== "number" || !Number.isFinite(targetMarginFraction) ||
      targetMarginFraction < 0 || targetMarginFraction >= 1) {
    throw new Error("targetMarginFraction must be in [0, 1)");
  }
  const grossMinutes = monthlyUnits * manualMinutesPerUnit;
  const releasedMinutes = Math.max(0, grossMinutes - exceptionMinutes - oversightMinutes);
  const hoursReleased = releasedMinutes / 60;
  const capacityValuePen = hoursReleased * hourlyCostPen;
  const variableCostPen = monthlyUnits * variableCostPerUnitPen;
  const supportCostPen = supportMinutesMonthly / 60 * operatorHourlyCostPen;
  const providerCostPen = variableCostPen + allocatedFixedCostPen + supportCostPen + expectedOtherCostPen;
  const providerMarginPen = monthlyFeePen - providerCostPen;
  const marginFraction = monthlyFeePen > 0 ? providerMarginPen / monthlyFeePen : null;
  const minimumFeeForTargetPen = providerCostPen / (1 - targetMarginFraction);
  const clientNetCapacityValuePen = capacityValuePen - monthlyFeePen;
  const reasons = [];
  if (monthlyUnits === 0) reasons.push("NO_VOLUME_EVIDENCE");
  if (releasedMinutes === 0) reasons.push("NO_CAPACITY_RELEASE");
  if (providerMarginPen < 0) reasons.push("PROVIDER_LOSS");
  if (marginFraction === null || marginFraction < targetMarginFraction) reasons.push("BELOW_TARGET_MARGIN");
  if (clientNetCapacityValuePen <= 0) reasons.push("NO_POSITIVE_CLIENT_CAPACITY_VALUE");
  if (input.preRevenue === true && allocatedFixedCostPen > 0) reasons.push("PRE_REVENUE_FIXED_COST");
  return {
    schemaVersion: 1,
    disclaimer: "Planning scenario, not measured savings, cash savings, or production certification.",
    currency: "PEN",
    monthlyUnits,
    hoursReleased: round2(hoursReleased),
    clientEstimatedCapacityValuePen: round2(capacityValuePen),
    clientNetEstimatedCapacityValuePen: round2(clientNetCapacityValuePen),
    providerMonthlyCostPen: round2(providerCostPen),
    providerMonthlyMarginPen: round2(providerMarginPen),
    providerMarginPercent: marginFraction === null ? null : round2(marginFraction * 100),
    minimumFeeForTargetPen: round2(minimumFeeForTargetPen),
    targetMarginPercent: round2(targetMarginFraction * 100),
    verdict: reasons.length ? "REVIEW" : "VIABLE_SCENARIO",
    reasons
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    const path = process.argv[2];
    if (!path) throw new Error("Usage: node tools/economics/client-unit-economics.mjs <scenario.json>");
    const result = evaluate(JSON.parse(readFileSync(path, "utf8")));
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
    if (result.verdict !== "VIABLE_SCENARIO") process.exitCode = 2;
  } catch (err) {
    process.stderr.write(`ERROR: ${err.message}\n`);
    process.exitCode = 1;
  }
}

import test from "node:test";
import assert from "node:assert/strict";
import { evaluate } from "../client-unit-economics.mjs";
const base = {
  monthlyUnits: 300, manualMinutesPerUnit: 5, exceptionMinutes: 60,
  oversightMinutes: 30, hourlyCostPen: 20, variableCostPerUnitPen: 0.10,
  allocatedFixedCostPen: 0, monthlyFeePen: 250, supportMinutesMonthly: 60,
  operatorHourlyCostPen: 30, targetMarginFraction: 0.5, preRevenue: true
};
test("viable monthly scenario separates capacity value from provider margin", () => {
  const r = evaluate(base);
  assert.equal(r.hoursReleased, 23.5);
  assert.equal(r.clientEstimatedCapacityValuePen, 470);
  assert.equal(r.providerMonthlyCostPen, 60);
  assert.equal(r.providerMonthlyMarginPen, 190);
  assert.equal(r.verdict, "VIABLE_SCENARIO");
});
test("pre-revenue fixed monthly infrastructure is flagged", () => {
  const r = evaluate({ ...base, allocatedFixedCostPen: 50 });
  assert.equal(r.verdict, "REVIEW");
  assert.ok(r.reasons.includes("PRE_REVENUE_FIXED_COST"));
});
test("zero volume never passes", () => {
  const r = evaluate({ ...base, monthlyUnits: 0 });
  assert.equal(r.verdict, "REVIEW");
  assert.ok(r.reasons.includes("NO_VOLUME_EVIDENCE"));
});
test("cannot claim negative released time", () => {
  const r = evaluate({ ...base, exceptionMinutes: 2000 });
  assert.equal(r.hoursReleased, 0);
  assert.ok(r.reasons.includes("NO_CAPACITY_RELEASE"));
});
test("invalid inputs fail closed", () => {
  assert.throws(() => evaluate({ ...base, monthlyFeePen: -1 }), /monthlyFeePen/);
  assert.throws(() => evaluate({ ...base, targetMarginFraction: 1 }), /targetMarginFraction/);
  assert.throws(() => evaluate({ ...base, supportMinutesMonthly: "60" }), /supportMinutesMonthly/);
});

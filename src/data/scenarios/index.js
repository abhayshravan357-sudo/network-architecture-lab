/**
 * Scenario Index
 *
 * Central registry for all simulator scenarios.
 * Import from here — never import individual scenario files directly in app code.
 */

import { smallOffice } from './smallOffice.js';
import { collegeCampus } from './collegeCampus.js';
import { hospital } from './hospital.js';
import { hotel } from './hotel.js';
import { multiBranch } from './multiBranch.js';

/** Ordered list of all scenarios (ascending difficulty). */
export const scenarios = [smallOffice, collegeCampus, hospital, hotel, multiBranch];

/** Fast O(1) lookup by scenario id string. */
export const scenarioMap = Object.fromEntries(scenarios.map(s => [s.id, s]));

/** Returns the scenario with the given id, or null if not found. */
export function getScenario(id) {
  return scenarioMap[id] ?? null;
}

/** Returns a uniformly random scenario from the full list. */
export function getRandomScenario() {
  return scenarios[Math.floor(Math.random() * scenarios.length)];
}

// Named re-exports for direct destructuring imports.
export { smallOffice, collegeCampus, hospital, hotel, multiBranch };

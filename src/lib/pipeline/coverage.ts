import { Requirement, Question } from '@/types/kit';

/**
 * Coverage Checker — DETERMINISTIC (not LLM)
 * 
 * Compares generated questions against extracted requirements
 * to find any must-have requirement that has no question covering it.
 * This is arithmetic/set logic and belongs in code, not in a prompt.
 */

export interface CoverageResult {
  coveredRequirementIds: string[];
  uncoveredRequirementIds: string[];
  coveragePercentage: number;
  mustHavesCovered: number;
  mustHavesTotal: number;
  allCovered: boolean;
}

/**
 * Check which requirements are covered by at least one question.
 * A requirement is "covered" if at least one question references its ID.
 */
export function checkCoverage(
  requirements: Requirement[],
  questions: Question[]
): CoverageResult {
  // Build a set of all requirement IDs that are referenced by at least one question
  const coveredIds = new Set<string>();
  for (const question of questions) {
    for (const reqId of question.requirement_ids) {
      coveredIds.add(reqId);
    }
  }

  // Separate must-have from nice-to-have
  const mustHaveRequirements = requirements.filter(r => r.priority === 'must');

  // Find uncovered must-have requirements
  const uncoveredMustHaves = mustHaveRequirements.filter(r => !coveredIds.has(r.id));
  const coveredRequirements = requirements.filter(r => coveredIds.has(r.id));

  return {
    coveredRequirementIds: coveredRequirements.map(r => r.id),
    uncoveredRequirementIds: uncoveredMustHaves.map(r => r.id),
    coveragePercentage: mustHaveRequirements.length > 0
      ? Math.round((mustHaveRequirements.filter(r => coveredIds.has(r.id)).length / mustHaveRequirements.length) * 100)
      : 100,
    mustHavesCovered: mustHaveRequirements.filter(r => coveredIds.has(r.id)).length,
    mustHavesTotal: mustHaveRequirements.length,
    allCovered: uncoveredMustHaves.length === 0,
  };
}

/**
 * Get the uncovered requirements (full objects) for a second-pass generation.
 */
export function getUncoveredRequirements(
  requirements: Requirement[],
  questions: Question[]
): Requirement[] {
  const coveredIds = new Set<string>();
  for (const question of questions) {
    for (const reqId of question.requirement_ids) {
      coveredIds.add(reqId);
    }
  }

  return requirements.filter(r => r.priority === 'must' && !coveredIds.has(r.id));
}

/**
 * Comprehensive Automated Test Suite
 * Tests core pipeline components:
 * 1. Schedule Allocator (Section 4)
 * 2. Coverage Checker (Section 3)
 * 3. Kit Validation (Appendix A)
 * 4. URL Validation & SSRF Protection (Section 11)
 */

import { buildSchedule } from '../src/lib/pipeline/scheduler';
import { checkCoverage, getUncoveredRequirements } from '../src/lib/pipeline/coverage';
import { validateKit } from '../src/lib/pipeline';
import { isSafePublicUrl, isValidUrl } from '../src/lib/pipeline/scraper';
import { Kit, Question, Requirement } from '../src/types/kit';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

console.log('\n======================================================');
console.log('🧪 Running Test Suite: AI Interview Prep Kit');
console.log('======================================================\n');

// -----------------------------------------------------------------------------
// 1. SCHEDULE ALLOCATOR TESTS
// -----------------------------------------------------------------------------
console.log('Testing Schedule Allocator...');

const mockRequirements: Requirement[] = [
  { id: 'r1', text: '5+ years Java / Distributed Systems', kind: 'technical', priority: 'must' },
  { id: 'r2', text: 'PostgreSQL database indexing', kind: 'technical', priority: 'must' },
  { id: 'r3', text: 'Cross-functional leadership', kind: 'behavioural', priority: 'nice' },
];

const mockQuestions: Question[] = [
  { id: 'q1', requirement_ids: ['r1'], category: 'system-design', prompt: 'Design Kafka', answer_outline: 'Partitions...', difficulty: 3 },
  { id: 'q2', requirement_ids: ['r1'], category: 'technical', prompt: 'JVM GC tuning', answer_outline: 'G1GC...', difficulty: 2 },
  { id: 'q3', requirement_ids: ['r2'], category: 'technical', prompt: 'B-Tree vs Hash index', answer_outline: 'Range queries...', difficulty: 2 },
  { id: 'q4', requirement_ids: ['r3'], category: 'behavioural', prompt: 'Conflict with PM', answer_outline: 'STAR method...', difficulty: 1 },
];

// Test: 5-day schedule
const schedule5 = buildSchedule(mockQuestions, mockRequirements, 5);
assert(schedule5.length === 5, 'Produces exactly 5 days for 5 daysAvailable');
assert(schedule5.every((d) => Number.isInteger(d.minutes)), 'All day minutes are strictly integers');
assert(schedule5.every((d) => d.minutes >= 15), 'Every day has at least 15 minutes of study time');

// Test: Higher difficulty and must-haves land first
const day1 = schedule5[0];
assert(day1.question_ids.includes('q1'), 'Hardest question (difficulty 3 + must-have) scheduled on Day 1');

// Test: Extreme bounds (1 day and 60 days)
const schedule1 = buildSchedule(mockQuestions, mockRequirements, 1);
assert(schedule1.length === 1, 'Handles 1-day crash course schedule');
assert(schedule1[0].question_ids.length === 4, '1-day schedule includes all questions');

const schedule60 = buildSchedule(mockQuestions, mockRequirements, 60);
assert(schedule60.length === 60, 'Handles 60-day extensive roadmap');

// -----------------------------------------------------------------------------
// 2. COVERAGE CHECKER TESTS
// -----------------------------------------------------------------------------
console.log('\nTesting Coverage Checker...');

const fullCoverage = checkCoverage(mockRequirements, mockQuestions);
assert(fullCoverage.allCovered === true, 'Correctly flags 100% coverage when all must-haves are covered');
assert(fullCoverage.mustHavesCovered === 2 && fullCoverage.mustHavesTotal === 2, 'Counts must-have requirements correctly');
assert(fullCoverage.uncoveredRequirementIds.length === 0, 'No uncovered must-haves in full set');

// Test: Missing must-have requirement
const partialQuestions: Question[] = [
  { id: 'q1', requirement_ids: ['r1'], category: 'technical', prompt: 'Java question', answer_outline: 'Outline', difficulty: 2 },
  { id: 'q4', requirement_ids: ['r3'], category: 'behavioural', prompt: 'Behavioural question', answer_outline: 'Outline', difficulty: 1 },
];

const gapCoverage = checkCoverage(mockRequirements, partialQuestions);
assert(gapCoverage.allCovered === false, 'Detects uncovered must-have requirement');
assert(gapCoverage.uncoveredRequirementIds.includes('r2'), 'Identifies r2 (PostgreSQL) as missing');
assert(gapCoverage.coveragePercentage === 50, 'Calculates 50% must-have coverage');

const uncoveredReqs = getUncoveredRequirements(mockRequirements, partialQuestions);
assert(uncoveredReqs.length === 1 && uncoveredReqs[0].id === 'r2', 'getUncoveredRequirements returns actual missing requirement object');

// -----------------------------------------------------------------------------
// 3. SSRF & URL VALIDATION TESTS
// -----------------------------------------------------------------------------
console.log('\nTesting URL Validation & SSRF Protection...');

// Valid public URLs
assert(isSafePublicUrl('https://stripe.com'), 'Accepts valid HTTPS URL');
assert(isSafePublicUrl('https://careers.google.com/jobs'), 'Accepts valid subdomain & path');
assert(isSafePublicUrl('http://example.com'), 'Accepts valid HTTP URL');

// Malicious / internal / loopback URLs (SSRF Protection)
assert(!isSafePublicUrl('http://localhost:3000'), 'Rejects localhost');
assert(!isSafePublicUrl('http://127.0.0.1:8080'), 'Rejects 127.0.0.1 loopback');
assert(!isSafePublicUrl('http://10.0.0.1/admin'), 'Rejects 10.x.x.x private network');
assert(!isSafePublicUrl('http://192.168.1.1/secret'), 'Rejects 192.168.x.x private network');
assert(!isSafePublicUrl('http://169.254.169.254/latest/meta-data'), 'Rejects AWS metadata endpoint');
assert(!isSafePublicUrl('ftp://ftp.example.com'), 'Rejects non-HTTP(S) protocols');
assert(!isSafePublicUrl('not-a-valid-url'), 'Rejects malformed string');

// -----------------------------------------------------------------------------
// 4. KIT VALIDATION SCHEMA TESTS
// -----------------------------------------------------------------------------
console.log('\nTesting Kit Validation Schema...');

const validKit: Kit = {
  source: {
    company: 'Stripe',
    company_url: 'https://stripe.com',
    role: 'Backend Engineer',
    location: 'Remote',
    jd_chars: 520,
    researched_at: new Date().toISOString(),
    pages_used: ['https://stripe.com/about'],
  },
  company_brief: {
    summary: 'Financial infrastructure company.',
    what_they_do: 'Payments processing and APIs.',
    sources: ['https://stripe.com'],
  },
  role: {
    title: 'Backend Engineer',
    seniority: 'Senior',
    responsibilities: ['Build APIs', 'Optimize database'],
    requirements: mockRequirements,
  },
  questions: mockQuestions,
  flashcards: [
    { id: 'f1', front: 'Idempotency', back: 'Same result on multiple identical calls', requirement_ids: ['r1'] },
  ],
  schedule: {
    days_available: 5,
    days: schedule5,
  },
  coverage: {
    uncovered_requirement_ids: [],
    passes: 1,
  },
};

const validResult = validateKit(validKit);
assert(validResult.length === 0, 'Valid kit passes schema validation with 0 errors');

// Test: Invalid kit (duplicate question ID, missing fields)
const invalidKit: any = {
  ...validKit,
  questions: [
    ...mockQuestions,
    { id: 'q1', prompt: 'Duplicate question ID' }, // duplicate id + invalid fields
  ],
  schedule: {
    days_available: 3, // mismatch with schedule5 (5 days)
    days: schedule5,
  },
};

const invalidErrors = validateKit(invalidKit);
assert(invalidErrors.length > 0, 'Detects schema violations on invalid kit');
assert(invalidErrors.some((e) => e.includes('Duplicate question id')), 'Detects duplicate question ID');
assert(invalidErrors.some((e) => e.includes('days_available')), 'Detects schedule days mismatch');

// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------
console.log('\n======================================================');
console.log(`Results: ${passed} passed, ${failed} failed.`);
console.log('======================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL TESTS PASSED SUCCESSFULLY!\n');
}

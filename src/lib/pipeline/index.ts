import { Kit, Question, QuestionCategory } from '@/types/kit';
import { crawlCompanySite, searchPublicDiscussion } from './scraper';
import {
  extractRequirements,
  generateCompanyBrief,
  generateQuestions,
  generateFlashcards,
} from './llm';
import { checkCoverage, getUncoveredRequirements } from './coverage';
import { buildSchedule } from './scheduler';

const MAX_COVERAGE_PASSES = 3;

export interface PipelineProgress {
  step: string;
  percentage: number;
  message: string;
}

type ProgressCallback = (progress: PipelineProgress) => void;

/**
 * The main kit generation pipeline.
 * Shared between the web UI and the batch CLI.
 * 
 * Steps:
 * 1. Extract requirements from JD (LLM)
 * 2. Crawl company site (scraper)
 * 3. Search public discussion (scraper)
 * 4. Generate company brief (LLM)
 * 5. Generate questions by category (LLM — separate calls per category)
 * 6. Coverage check (deterministic code)
 * 7. Fill gaps — second pass (LLM + deterministic)
 * 8. Generate flashcards (LLM)
 * 9. Build schedule (deterministic code)
 */
export async function generateKit(
  jobDescription: string,
  companyUrl: string,
  daysAvailable: number,
  onProgress?: ProgressCallback,
): Promise<Kit> {
  const progress = (step: string, percentage: number, message: string) => {
    if (onProgress) onProgress({ step, percentage, message });
  };

  // Step 1: Extract requirements from JD
  progress('requirements', 10, 'Extracting requirements from job description...');
  const roleData = await extractRequirements(jobDescription);

  if (roleData.requirements.length === 0) {
    // Minimal JD — create a thin but honest kit
    roleData.requirements = [{
      id: 'r1',
      text: 'General qualifications (job description provided minimal detail)',
      kind: 'technical',
      priority: 'must',
    }];
  }

  // Step 2: Crawl company site
  progress('crawling', 20, `Crawling company site: ${companyUrl}...`);
  let crawlResult;
  try {
    crawlResult = await crawlCompanySite(companyUrl);
  } catch (error) {
    console.error('Crawl error:', error);
    crawlResult = {
      companyInfo: 'Could not retrieve company information.',
      hiringInfo: 'Could not find hiring information.',
      pagesUsed: [],
      errors: [`Failed to crawl ${companyUrl}: ${(error as Error).message}`],
    };
  }

  // Step 3: Search public discussion
  progress('research', 30, 'Searching for public interview discussion...');
  let publicDiscussion;
  try {
    const companyName = roleData.title ? roleData.title.split(' ').pop() || '' : '';
    publicDiscussion = await searchPublicDiscussion(companyName);
  } catch {
    publicDiscussion = {
      content: 'No public discussion found.',
      sources: [],
    };
  }

  // Step 4: Generate company brief
  progress('brief', 40, 'Generating company brief...');
  const companyBrief = await generateCompanyBrief(
    crawlResult.companyInfo,
    crawlResult.hiringInfo,
    companyUrl,
  );

  // Step 5: Generate questions by category (SEPARATE calls)
  progress('questions', 50, 'Generating interview questions...');

  // Categorize requirements for appropriate question types
  const technicalReqs = roleData.requirements.filter(r => r.kind === 'technical');
  const behaviouralReqs = roleData.requirements.filter(r => r.kind === 'behavioural');
  const domainReqs = roleData.requirements.filter(r => r.kind === 'domain');

  let allQuestions: Question[] = [];
  let questionCounter = 0;

  // Technical questions
  if (technicalReqs.length > 0) {
    progress('questions', 55, 'Generating technical questions...');
    const techQuestions = await generateQuestions(
      technicalReqs, 'technical', companyBrief.summary, crawlResult.hiringInfo, questionCounter,
    );
    allQuestions.push(...techQuestions);
    questionCounter += techQuestions.length;
  }

  // Behavioural questions
  if (behaviouralReqs.length > 0) {
    progress('questions', 60, 'Generating behavioural questions...');
    const behavQuestions = await generateQuestions(
      behaviouralReqs, 'behavioural', companyBrief.summary, crawlResult.hiringInfo, questionCounter,
    );
    allQuestions.push(...behavQuestions);
    questionCounter += behavQuestions.length;
  }

  // System design questions (from technical requirements)
  if (technicalReqs.length > 0) {
    progress('questions', 65, 'Generating system design questions...');
    const sysDesignQuestions = await generateQuestions(
      technicalReqs.slice(0, 3), 'system-design', companyBrief.summary, crawlResult.hiringInfo, questionCounter,
    );
    allQuestions.push(...sysDesignQuestions);
    questionCounter += sysDesignQuestions.length;
  }

  // Company-fit questions (from domain requirements + general)
  const companyFitReqs = domainReqs.length > 0 ? domainReqs : roleData.requirements.slice(0, 2);
  progress('questions', 70, 'Generating company-fit questions...');
  const companyFitQuestions = await generateQuestions(
    companyFitReqs, 'company-fit', companyBrief.summary, crawlResult.hiringInfo, questionCounter,
  );
  allQuestions.push(...companyFitQuestions);
  questionCounter += companyFitQuestions.length;

  // Step 6 & 7: Coverage check + fill gaps (up to MAX_COVERAGE_PASSES)
  progress('coverage', 75, 'Checking requirement coverage...');
  let coverageResult = checkCoverage(roleData.requirements, allQuestions);
  let passes = 1;

  while (!coverageResult.allCovered && passes < MAX_COVERAGE_PASSES) {
    progress('coverage', 75 + (passes * 5), `Coverage pass ${passes + 1}: filling ${coverageResult.uncoveredRequirementIds.length} gaps...`);

    const uncovered = getUncoveredRequirements(roleData.requirements, allQuestions);

    // Generate questions specifically for uncovered requirements
    // Choose category based on requirement kind
    for (const req of uncovered) {
      const category: QuestionCategory = req.kind === 'behavioural' ? 'behavioural' : 'technical';
      const gapQuestions = await generateQuestions(
        [req], category, companyBrief.summary, crawlResult.hiringInfo, questionCounter,
      );
      allQuestions.push(...gapQuestions);
      questionCounter += gapQuestions.length;
    }

    coverageResult = checkCoverage(roleData.requirements, allQuestions);
    passes++;
  }

  // Step 8: Generate flashcards
  progress('flashcards', 85, 'Generating flashcards...');
  const flashcards = await generateFlashcards(roleData.requirements, allQuestions);

  // Step 9: Build schedule (DETERMINISTIC)
  progress('schedule', 90, 'Building study schedule...');
  const scheduleDays = buildSchedule(allQuestions, roleData.requirements, daysAvailable);

  // Assemble the kit
  progress('finalizing', 95, 'Finalizing kit...');

  const kit: Kit = {
    source: {
      company: companyBrief.summary.split('.')[0] || 'Unknown Company',
      company_url: companyUrl,
      role: roleData.title,
      location: roleData.location,
      jd_chars: jobDescription.length,
      researched_at: new Date().toISOString(),
      pages_used: crawlResult.pagesUsed,
    },
    company_brief: companyBrief,
    role: {
      title: roleData.title,
      seniority: roleData.seniority,
      responsibilities: roleData.responsibilities,
      requirements: roleData.requirements,
    },
    questions: allQuestions,
    flashcards: flashcards,
    schedule: {
      days_available: daysAvailable,
      days: scheduleDays,
    },
    coverage: {
      uncovered_requirement_ids: coverageResult.uncoveredRequirementIds,
      passes: passes,
    },
  };

  progress('done', 100, 'Kit generated successfully!');
  return kit;
}

/**
 * Validate a kit against the expected structure.
 * Returns an array of validation errors (empty = valid).
 */
export function validateKit(kit: Kit): string[] {
  const errors: string[] = [];

  // Source validation
  if (!kit.source) errors.push('Missing source');
  if (!kit.source?.company_url) errors.push('Missing company_url');
  if (typeof kit.source?.jd_chars !== 'number') errors.push('jd_chars must be a number');

  // Company brief validation
  if (!kit.company_brief) errors.push('Missing company_brief');
  if (!kit.company_brief?.summary) errors.push('Missing company brief summary');

  // Role validation
  if (!kit.role) errors.push('Missing role');
  if (!kit.role?.title) errors.push('Missing role title');
  if (!Array.isArray(kit.role?.requirements)) errors.push('requirements must be an array');

  // Requirements validation
  for (const req of kit.role?.requirements || []) {
    if (!req.id) errors.push(`Requirement missing id`);
    if (!req.text) errors.push(`Requirement ${req.id} missing text`);
    if (!['technical', 'behavioural', 'domain'].includes(req.kind)) {
      errors.push(`Requirement ${req.id} has invalid kind: ${req.kind}`);
    }
    if (!['must', 'nice'].includes(req.priority)) {
      errors.push(`Requirement ${req.id} has invalid priority: ${req.priority}`);
    }
  }

  // Questions validation
  if (!Array.isArray(kit.questions)) errors.push('questions must be an array');
  const questionIds = new Set<string>();
  for (const q of kit.questions || []) {
    if (!q.id) errors.push('Question missing id');
    if (questionIds.has(q.id)) errors.push(`Duplicate question id: ${q.id}`);
    questionIds.add(q.id);
    if (!q.prompt) errors.push(`Question ${q.id} missing prompt`);
    if (![1, 2, 3].includes(q.difficulty)) {
      errors.push(`Question ${q.id} has invalid difficulty: ${q.difficulty}`);
    }
    if (!['technical', 'behavioural', 'system-design', 'company-fit'].includes(q.category)) {
      errors.push(`Question ${q.id} has invalid category: ${q.category}`);
    }
  }

  // Flashcards validation
  if (!Array.isArray(kit.flashcards)) errors.push('flashcards must be an array');

  // Schedule validation
  if (!kit.schedule) errors.push('Missing schedule');
  if (typeof kit.schedule?.days_available !== 'number') errors.push('days_available must be a number');
  if (!Array.isArray(kit.schedule?.days)) errors.push('schedule days must be an array');

  // Verify schedule days count matches days_available
  if (kit.schedule?.days?.length !== kit.schedule?.days_available) {
    errors.push(`Schedule has ${kit.schedule?.days?.length} days but days_available is ${kit.schedule?.days_available}`);
  }

  // Verify all question_ids in schedule reference existing questions
  for (const day of kit.schedule?.days || []) {
    if (typeof day.minutes !== 'number' || !Number.isInteger(day.minutes)) {
      errors.push(`Day ${day.day} minutes must be an integer`);
    }
    for (const qid of day.question_ids || []) {
      if (!questionIds.has(qid)) {
        errors.push(`Schedule day ${day.day} references non-existent question: ${qid}`);
      }
    }
  }

  // Coverage validation
  if (!kit.coverage) errors.push('Missing coverage');
  if (typeof kit.coverage?.passes !== 'number') errors.push('coverage passes must be a number');

  return errors;
}

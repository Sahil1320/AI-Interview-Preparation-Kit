import { Question, Requirement, ScheduleDay } from '@/types/kit';

/**
 * Schedule Allocator — DETERMINISTIC (not LLM)
 * 
 * Distributes questions across exactly N days.
 * Harder and higher-priority material lands earlier.
 * Duration is integer minutes. This is arithmetic.
 */

// Estimated time per question based on difficulty
const MINUTES_PER_QUESTION: Record<number, number> = {
  1: 15,  // easy
  2: 25,  // medium
  3: 40,  // hard
};

// Category focus labels
const CATEGORY_FOCUS: Record<string, string> = {
  'technical': 'Technical Deep Dive',
  'behavioural': 'Behavioural & Soft Skills',
  'system-design': 'System Design',
  'company-fit': 'Company & Culture Fit',
  'mixed': 'Mixed Review',
};

interface ScoredQuestion {
  question: Question;
  score: number; // Higher = more important = should be studied earlier
}

/**
 * Build the study schedule.
 * @param questions All questions in the kit
 * @param requirements All requirements (used to determine priority of questions)
 * @param daysAvailable Number of days the user has (1-60)
 */
export function buildSchedule(
  questions: Question[],
  requirements: Requirement[],
  daysAvailable: number,
): ScheduleDay[] {
  // Clamp days to reasonable range
  const days = Math.max(1, Math.min(60, Math.round(daysAvailable)));

  if (questions.length === 0) {
    // Return empty schedule with correct number of days
    return Array.from({ length: days }, (_, i) => ({
      day: i + 1,
      focus: 'Review (no questions generated)',
      question_ids: [],
      minutes: 30,
    }));
  }

  // Build a priority map for requirements
  const reqPriorityMap = new Map<string, string>();
  for (const req of requirements) {
    reqPriorityMap.set(req.id, req.priority);
  }

  // Score questions: higher score = more important = study first
  const scoredQuestions: ScoredQuestion[] = questions.map(q => {
    let score = 0;

    // Difficulty contributes: harder questions are studied earlier
    score += (q.difficulty || 2) * 3;

    // Must-have requirements are prioritized
    const hasMustHave = q.requirement_ids.some(id => reqPriorityMap.get(id) === 'must');
    if (hasMustHave) score += 10;

    // Technical and system-design are typically harder, study earlier
    if (q.category === 'system-design') score += 3;
    if (q.category === 'technical') score += 2;

    return { question: q, score };
  });

  // Sort by score descending (most important first)
  scoredQuestions.sort((a, b) => b.score - a.score);

  // Distribute questions across days
  const questionsPerDay = Math.max(1, Math.ceil(scoredQuestions.length / days));
  const scheduleDays: ScheduleDay[] = [];

  for (let d = 0; d < days; d++) {
    const startIdx = d * questionsPerDay;
    const endIdx = Math.min(startIdx + questionsPerDay, scoredQuestions.length);
    const dayQuestions = scoredQuestions.slice(startIdx, endIdx);

    // Calculate total minutes for this day
    const minutes = dayQuestions.reduce((sum, sq) => {
      return sum + (MINUTES_PER_QUESTION[sq.question.difficulty] || 25);
    }, 0);

    // Determine focus based on dominant category
    const categoryCounts: Record<string, number> = {};
    for (const sq of dayQuestions) {
      categoryCounts[sq.question.category] = (categoryCounts[sq.question.category] || 0) + 1;
    }
    const dominantCategory = Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'mixed';

    scheduleDays.push({
      day: d + 1,
      focus: dayQuestions.length > 0
        ? CATEGORY_FOCUS[dominantCategory] || 'Mixed Review'
        : 'Rest & Light Review',
      question_ids: dayQuestions.map(sq => sq.question.id),
      minutes: Math.max(minutes, 15), // Minimum 15 minutes per day
    });
  }

  // If we have more days than questions, fill remaining days with review
  if (scheduleDays.length < days) {
    for (let d = scheduleDays.length; d < days; d++) {
      // Distribute review across remaining days
      const reviewIdx = d % scheduleDays.length;
      const reviewQuestions = scheduleDays[reviewIdx]?.question_ids || [];

      scheduleDays.push({
        day: d + 1,
        focus: 'Review & Practice',
        question_ids: reviewQuestions.slice(0, Math.ceil(reviewQuestions.length / 2)),
        minutes: 30,
      });
    }
  }

  return scheduleDays;
}

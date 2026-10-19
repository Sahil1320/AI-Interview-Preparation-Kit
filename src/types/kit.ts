// Kit structure types matching Appendix A exactly
// These types are shared between frontend, backend, and batch CLI

export interface KitSource {
  company: string;
  company_url: string;
  role: string;
  location: string;
  jd_chars: number;
  researched_at: string;
  pages_used: string[];
}

export interface CompanyBrief {
  summary: string;
  what_they_do: string;
  sources: string[];
}

export type RequirementKind = 'technical' | 'behavioural' | 'domain';
export type RequirementPriority = 'must' | 'nice';

export interface Requirement {
  id: string;
  text: string;
  kind: RequirementKind;
  priority: RequirementPriority;
}

export interface RoleBreakdown {
  title: string;
  seniority: string;
  responsibilities: string[];
  requirements: Requirement[];
}

export type QuestionCategory = 'technical' | 'behavioural' | 'system-design' | 'company-fit';

export interface Question {
  id: string;
  requirement_ids: string[];
  category: QuestionCategory;
  prompt: string;
  answer_outline: string;
  difficulty: 1 | 2 | 3;
  // Extension: track user edits
  _pinned?: boolean;
  _edited?: boolean;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  requirement_ids: string[];
  // Extension: track user edits
  _pinned?: boolean;
  _edited?: boolean;
}

export interface ScheduleDay {
  day: number;
  focus: string;
  question_ids: string[];
  minutes: number;
}

export interface Schedule {
  days_available: number;
  days: ScheduleDay[];
}

export interface Coverage {
  uncovered_requirement_ids: string[];
  passes: number;
}

// The complete kit structure (Appendix A)
export interface Kit {
  source: KitSource;
  company_brief: CompanyBrief;
  role: RoleBreakdown;
  questions: Question[];
  flashcards: Flashcard[];
  schedule: Schedule;
  coverage: Coverage;
}

// Database model extensions
export interface KitDocument {
  _id?: string;
  userId: string;
  kit: Kit;
  status: 'generating' | 'ready' | 'failed';
  progress?: GenerationProgress;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GenerationProgress {
  step: string;
  percentage: number;
  message: string;
}

// Batch CLI types (Appendix B)
export interface BatchInputCase {
  id: string;
  jd: string;
  company_url: string;
  days: number;
}

export interface BatchOutputKit {
  id: string;
  status: 'ok' | 'failed';
  kit: Kit | null;
  error: { code: string; message: string } | null;
}

export interface BatchOutput {
  version: string;
  generated_at: string;
  kits: BatchOutputKit[];
}

// Practice mode types
export interface FlashcardProgress {
  flashcardId: string;
  confidence: 1 | 2 | 3 | 4 | 5;
  lastPracticed: Date;
  timesReviewed: number;
}

export interface PracticeSession {
  kitId: string;
  userId: string;
  progress: FlashcardProgress[];
  lastSessionAt: Date;
}

// Mock interview types (Creative Feature)
export interface ResumeData {
  rawText: string;
  skills: string[];
  experience: string[];
  education: string[];
}

export interface InterviewQuestion {
  id: string;
  question: string;
  category: QuestionCategory;
  relatedRequirements: string[];
  timeLimit: number; // seconds
}

export interface InterviewAnswer {
  questionId: string;
  answer: string;
  timeTaken: number; // seconds
  feedback?: string;
  score?: number; // 1-10
}

export interface MockInterview {
  kitId: string;
  userId: string;
  resumeData: ResumeData;
  questions: InterviewQuestion[];
  answers: InterviewAnswer[];
  overallFeedback?: string;
  overallScore?: number;
  completedAt?: Date;
}

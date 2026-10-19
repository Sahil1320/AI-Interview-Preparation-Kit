import mongoose, { Schema, Document } from 'mongoose';

// Requirement subdocument
const RequirementSchema = new Schema({
  id: { type: String, required: true },
  text: { type: String, required: true },
  kind: { type: String, enum: ['technical', 'behavioural', 'domain'], required: true },
  priority: { type: String, enum: ['must', 'nice'], required: true },
}, { _id: false });

// Question subdocument
const QuestionSchema = new Schema({
  id: { type: String, required: true },
  requirement_ids: [{ type: String }],
  category: { type: String, enum: ['technical', 'behavioural', 'system-design', 'company-fit'], required: true },
  prompt: { type: String, required: true },
  answer_outline: { type: String, required: true },
  difficulty: { type: Number, min: 1, max: 3, required: true },
  _pinned: { type: Boolean, default: false },
  _edited: { type: Boolean, default: false },
}, { _id: false });

// Flashcard subdocument
const FlashcardSchema = new Schema({
  id: { type: String, required: true },
  front: { type: String, required: true },
  back: { type: String, required: true },
  requirement_ids: [{ type: String }],
  _pinned: { type: Boolean, default: false },
  _edited: { type: Boolean, default: false },
}, { _id: false });

// Schedule day subdocument
const ScheduleDaySchema = new Schema({
  day: { type: Number, required: true },
  focus: { type: String, required: true },
  question_ids: [{ type: String }],
  minutes: { type: Number, required: true },
}, { _id: false });

// Kit subdocument
const KitDataSchema = new Schema({
  source: {
    company: String,
    company_url: String,
    role: String,
    location: String,
    jd_chars: Number,
    researched_at: String,
    pages_used: [String],
  },
  company_brief: {
    summary: String,
    what_they_do: String,
    sources: [String],
  },
  role: {
    title: String,
    seniority: String,
    responsibilities: [String],
    requirements: [RequirementSchema],
  },
  questions: [QuestionSchema],
  flashcards: [FlashcardSchema],
  schedule: {
    days_available: Number,
    days: [ScheduleDaySchema],
  },
  coverage: {
    uncovered_requirement_ids: [String],
    passes: Number,
  },
}, { _id: false });

// Progress subdocument
const ProgressSchema = new Schema({
  step: String,
  percentage: Number,
  message: String,
}, { _id: false });

export interface IKitDocument extends Document {
  userId: string;
  kit: typeof KitDataSchema;
  status: 'generating' | 'ready' | 'failed';
  progress?: typeof ProgressSchema;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

const KitDocumentSchema = new Schema({
  userId: { type: String, required: true, index: true },
  kit: { type: KitDataSchema, default: {} },
  status: {
    type: String,
    enum: ['generating', 'ready', 'failed'],
    default: 'generating',
  },
  progress: { type: ProgressSchema },
  error: { type: String },
}, {
  timestamps: true,
});

// Index for querying user's kits
KitDocumentSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.models.KitDocument || mongoose.model<IKitDocument>('KitDocument', KitDocumentSchema);

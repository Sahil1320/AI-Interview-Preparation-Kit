import mongoose, { Schema, Document } from 'mongoose';

const FlashcardProgressSchema = new Schema({
  flashcardId: { type: String, required: true },
  confidence: { type: Number, min: 1, max: 5, default: 1 },
  lastPracticed: { type: Date, default: Date.now },
  timesReviewed: { type: Number, default: 0 },
}, { _id: false });

export interface IPracticeSession extends Document {
  kitId: string;
  userId: string;
  progress: Array<{
    flashcardId: string;
    confidence: number;
    lastPracticed: Date;
    timesReviewed: number;
  }>;
  lastSessionAt: Date;
}

const PracticeSessionSchema = new Schema({
  kitId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  progress: [FlashcardProgressSchema],
  lastSessionAt: { type: Date, default: Date.now },
}, {
  timestamps: true,
});

PracticeSessionSchema.index({ kitId: 1, userId: 1 }, { unique: true });

export default mongoose.models.PracticeSession || mongoose.model<IPracticeSession>('PracticeSession', PracticeSessionSchema);

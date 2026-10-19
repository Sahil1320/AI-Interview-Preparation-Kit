import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import PracticeSession from '@/models/PracticeSession';

// GET /api/practice/[kitId] — Get practice progress for a kit
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ kitId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { kitId } = await params;
    const userId = (session.user as { id: string }).id;
    await connectDB();

    let practiceSession = await PracticeSession.findOne({ kitId, userId }).lean();
    if (!practiceSession) {
      practiceSession = { kitId, userId, progress: [], lastSessionAt: new Date() };
    }

    return NextResponse.json({ session: practiceSession });
  } catch (error) {
    console.error('Error fetching practice session:', error);
    return NextResponse.json({ error: 'Failed to fetch practice session' }, { status: 500 });
  }
}

// POST /api/practice/[kitId] — Update practice progress
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ kitId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { kitId } = await params;
    const userId = (session.user as { id: string }).id;
    const { flashcardId, confidence } = await request.json();

    if (!flashcardId || !confidence || confidence < 1 || confidence > 5) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    await connectDB();

    let practiceSession = await PracticeSession.findOne({ kitId, userId });
    if (!practiceSession) {
      practiceSession = new PracticeSession({
        kitId,
        userId,
        progress: [],
        lastSessionAt: new Date(),
      });
    }

    // Update or add flashcard progress
    const existingIdx = practiceSession.progress.findIndex(
      (p: any) => p.flashcardId === flashcardId
    );

    if (existingIdx >= 0) {
      practiceSession.progress[existingIdx].confidence = confidence;
      practiceSession.progress[existingIdx].lastPracticed = new Date();
      practiceSession.progress[existingIdx].timesReviewed += 1;
    } else {
      practiceSession.progress.push({
        flashcardId,
        confidence,
        lastPracticed: new Date(),
        timesReviewed: 1,
      });
    }

    practiceSession.lastSessionAt = new Date();
    practiceSession.markModified('progress');
    await practiceSession.save();

    return NextResponse.json({ session: practiceSession });
  } catch (error) {
    console.error('Error updating practice session:', error);
    return NextResponse.json({ error: 'Failed to update practice session' }, { status: 500 });
  }
}

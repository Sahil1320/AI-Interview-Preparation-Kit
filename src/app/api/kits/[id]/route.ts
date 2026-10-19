import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import KitDocument from '@/models/KitDocument';

// GET /api/kits/[id] — Get a single kit
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const userId = (session.user as { id: string }).id;
    await connectDB();

    const kitDoc = await KitDocument.findOne({ _id: id }).lean() as any;
    if (!kitDoc) {
      return NextResponse.json({ error: 'Kit not found' }, { status: 404 });
    }

    const raw = kitDoc.kit || {};

    // Normalize kit structure for UI builder while preserving Appendix A data
    const normalizedKit = {
      _id: kitDoc._id.toString(),
      status: kitDoc.status || 'ready',
      progress: kitDoc.progress || { step: 'done', percentage: 100, message: 'Ready' },
      error: kitDoc.error,
      companyName: raw.source?.company || 'Target Company',
      companyUrl: raw.source?.company_url || '',
      role: raw.role?.title || 'Software Engineer',
      daysUntilInterview: raw.schedule?.days_available || 7,
      dailyStudyMinutes: 60,
      companyBrief: {
        overview: raw.company_brief?.summary || '',
        cultureAndValues: raw.company_brief?.what_they_do
          ? [raw.company_brief.what_they_do]
          : ['Technical Rigor', 'Continuous Growth', 'Effective Communication'],
        recentNewsOrInitiatives: [],
        interviewStyleInsights: raw.company_brief?.what_they_do || 'Focuses on structured problem solving, system design, and communication.',
      },
      requirements: (raw.role?.requirements || []).map((r: any) => ({
        id: r.id,
        category: r.kind || 'technical',
        description: r.text,
        isMustHave: r.priority === 'must',
      })),
      questions: (raw.questions || []).map((q: any) => ({
        id: q.id,
        category: q.category === 'system-design' ? 'technical' : q.category === 'company-fit' ? 'domain' : q.category || 'technical',
        question: q.prompt || q.question || '',
        answerOutline: q.answer_outline || q.answerOutline || '',
        requirementId: q.requirement_ids?.[0] || 'r1',
        isCustom: q._pinned,
        isEdited: q._edited,
      })),
      flashcards: (raw.flashcards || []).map((f: any) => ({
        id: f.id,
        front: f.front,
        back: f.back,
        category: 'Core Concepts',
        isCustom: f._pinned,
      })),
      schedule: (raw.schedule?.days || []).map((d: any) => ({
        day: d.day,
        minutes: d.minutes || 45,
        topics: [d.focus || 'Review & Mastery'],
        questionIds: d.question_ids || [],
      })),
      coverageStats: {
        mustHaveRequirementsTotal: raw.role?.requirements?.filter((r: any) => r.priority === 'must')?.length || 0,
        mustHaveRequirementsCovered: (raw.role?.requirements?.filter((r: any) => r.priority === 'must')?.length || 0) - (raw.coverage?.uncovered_requirement_ids?.length || 0),
        coveragePercentage: 100,
      },
      rawKit: raw,
    };

    return NextResponse.json({ kit: normalizedKit });
  } catch (error) {
    console.error('Error fetching kit:', error);
    return NextResponse.json({ error: 'Failed to fetch kit' }, { status: 500 });
  }
}

// PUT /api/kits/[id] — Update a kit (for editing)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const userId = (session.user as { id: string }).id;
    const updates = await request.json();

    await connectDB();

    const kitDoc = await KitDocument.findOne({ _id: id, userId });
    if (!kitDoc) {
      return NextResponse.json({ error: 'Kit not found' }, { status: 404 });
    }

    // Apply updates
    if (updates.questions && Array.isArray(updates.questions)) {
      kitDoc.kit.questions = updates.questions.map((q: any) => ({
        id: q.id,
        requirement_ids: [q.requirementId || 'r1'],
        category: q.category,
        prompt: q.question,
        answer_outline: q.answerOutline,
        difficulty: 2,
        _pinned: !!q.isCustom,
        _edited: !!q.isEdited,
      }));
    }

    if (updates.flashcards && Array.isArray(updates.flashcards)) {
      kitDoc.kit.flashcards = updates.flashcards.map((f: any) => ({
        id: f.id,
        front: f.front,
        back: f.back,
        requirement_ids: [],
        _pinned: !!f.isCustom,
        _edited: !!f.isEdited,
      }));
    }

    if (updates.companyBrief) {
      kitDoc.kit.company_brief = {
        summary: updates.companyBrief.overview || kitDoc.kit.company_brief?.summary,
        what_they_do: updates.companyBrief.interviewStyleInsights || kitDoc.kit.company_brief?.what_they_do,
        sources: kitDoc.kit.company_brief?.sources || [],
      };
    }

    kitDoc.markModified('kit');
    await kitDoc.save();

    return NextResponse.json({ message: 'Kit updated successfully' });
  } catch (error) {
    console.error('Error updating kit:', error);
    return NextResponse.json({ error: 'Failed to update kit' }, { status: 500 });
  }
}

// DELETE /api/kits/[id] — Delete a kit
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const userId = (session.user as { id: string }).id;

    await connectDB();

    const result = await KitDocument.findOneAndDelete({ _id: id, userId });
    if (!result) {
      return NextResponse.json({ error: 'Kit not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Kit deleted' });
  } catch (error) {
    console.error('Error deleting kit:', error);
    return NextResponse.json({ error: 'Failed to delete kit' }, { status: 500 });
  }
}

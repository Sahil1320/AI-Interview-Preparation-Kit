import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import KitDocument from '@/models/KitDocument';
import { generateCompanyBrief, generateQuestions } from '@/lib/pipeline/llm';
import { buildSchedule } from '@/lib/pipeline/scheduler';
import { QuestionCategory, Question } from '@/types/kit';

// POST /api/kits/[id]/regenerate — Regenerate a single section
export async function POST(
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
    const { section, category } = await request.json();

    await connectDB();

    const kitDoc = await KitDocument.findOne({ _id: id, userId });
    if (!kitDoc) {
      return NextResponse.json({ error: 'Kit not found' }, { status: 404 });
    }

    const kit = kitDoc.kit as any;

    switch (section) {
      case 'company_brief': {
        // Regenerate company brief
        const newBrief = await generateCompanyBrief(
          kit.company_brief?.summary || '',
          '',
          kit.source?.company_url || '',
        );
        kit.company_brief = newBrief;
        break;
      }

      case 'questions': {
        // Regenerate questions for a specific category, preserving pinned/edited ones
        const targetCategory = category as QuestionCategory;
        if (!targetCategory) {
          return NextResponse.json({ error: 'Category is required for question regeneration' }, { status: 400 });
        }

        // Preserve pinned/edited questions
        const pinnedQuestions = (kit.questions || []).filter(
          (q: Question) => (q.category === targetCategory) && (q._pinned || q._edited)
        );
        const otherQuestions = (kit.questions || []).filter(
          (q: Question) => q.category !== targetCategory
        );

        // Get requirements for this category
        const requirements = kit.role?.requirements || [];
        const relevantReqs = requirements.filter((r: any) =>
          targetCategory === 'technical' ? r.kind === 'technical' :
          targetCategory === 'behavioural' ? r.kind === 'behavioural' :
          true
        );

        const existingCount = otherQuestions.length + pinnedQuestions.length;
        const newQuestions = await generateQuestions(
          relevantReqs, targetCategory, kit.company_brief?.summary || '', '', existingCount,
        );

        kit.questions = [...otherQuestions, ...pinnedQuestions, ...newQuestions];
        break;
      }

      case 'schedule': {
        // Regenerate schedule
        const scheduleDays = buildSchedule(
          kit.questions || [],
          kit.role?.requirements || [],
          kit.schedule?.days_available || 5,
        );
        kit.schedule.days = scheduleDays;
        break;
      }

      default:
        return NextResponse.json({ error: 'Invalid section' }, { status: 400 });
    }

    kitDoc.kit = kit;
    kitDoc.markModified('kit');
    await kitDoc.save();

    return NextResponse.json({ kit: kitDoc });
  } catch (error) {
    console.error('Error regenerating section:', error);
    return NextResponse.json({ error: 'Failed to regenerate section' }, { status: 500 });
  }
}

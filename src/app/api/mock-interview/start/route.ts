import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import KitDocument from '@/models/KitDocument';
import {
  extractResumeSkills,
  generateInterviewQuestions,
  evaluateAnswer,
} from '@/lib/pipeline/llm';

// POST /api/mock-interview/start — Start a mock interview
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;
    const { kitId, resumeText } = await request.json();

    if (!kitId || !resumeText) {
      return NextResponse.json(
        { error: 'Kit ID and resume text are required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Fetch the kit
    const kitDoc = await KitDocument.findOne({ _id: kitId, userId }).lean();
    if (!kitDoc) {
      return NextResponse.json({ error: 'Kit not found' }, { status: 404 });
    }

    const kit = kitDoc.kit as any;

    // Extract skills from resume
    const resumeData = await extractResumeSkills(resumeText);

    // Generate interview questions based on resume vs JD
    const questions = await generateInterviewQuestions(
      resumeData.skills,
      kit.role?.requirements || [],
      kit.company_brief?.summary || '',
    );

    // Add IDs
    const interviewQuestions = questions.map((q: any, i: number) => ({
      id: `iq-${i + 1}`,
      question: q.question,
      category: q.category,
      relatedRequirements: q.relatedRequirements || [],
      timeLimit: q.timeLimit || 120,
    }));

    return NextResponse.json({
      resumeData,
      questions: interviewQuestions,
    });
  } catch (error) {
    console.error('Error starting mock interview:', error);
    return NextResponse.json({ error: 'Failed to start mock interview' }, { status: 500 });
  }
}

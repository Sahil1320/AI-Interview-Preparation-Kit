import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import KitDocument from '@/models/KitDocument';
import { generateKit, validateKit } from '@/lib/pipeline';

// GET /api/kits — List all kits for the current user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const userId = (session.user as { id: string }).id;
    const kitDocs = await KitDocument.find({ userId })
      .sort({ createdAt: -1 })
      .lean() as any[];

    const kits = kitDocs.map((doc: any) => {
      const raw = doc.kit || {};
      return {
        _id: doc._id.toString(),
        companyName: raw.source?.company || 'Target Company',
        role: raw.role?.title || 'Software Engineer',
        daysUntilInterview: raw.schedule?.days_available || 7,
        dailyStudyMinutes: 60,
        requirementsCount: raw.role?.requirements?.length || 0,
        questionsCount: raw.questions?.length || 0,
        flashcardsCount: raw.flashcards?.length || 0,
        status: doc.status || 'ready',
        progress: doc.progress,
        createdAt: doc.createdAt,
      };
    });

    return NextResponse.json({ kits });
  } catch (error) {
    console.error('Error fetching kits:', error);
    return NextResponse.json({ error: 'Failed to fetch kits' }, { status: 500 });
  }
}

// POST /api/kits — Create a new kit
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;
    const body = await request.json();
    const jobDescription = body.jobDescription || body.jd;
    const companyUrl = body.companyUrl || body.company_url;
    const daysAvailable = Number(body.daysAvailable ?? body.daysUntilInterview ?? body.days ?? 7);

    // Validate input
    if (!jobDescription || !companyUrl) {
      return NextResponse.json(
        { error: 'Job description and company URL are required' },
        { status: 400 }
      );
    }

    if (isNaN(daysAvailable) || daysAvailable < 1 || daysAvailable > 60) {
      return NextResponse.json(
        { error: 'Days available must be between 1 and 60' },
        { status: 400 }
      );
    }

    await connectDB();

    // Create a placeholder document to show progress
    const kitDoc = await KitDocument.create({
      userId,
      status: 'generating',
      progress: { step: 'starting', percentage: 0, message: 'Starting kit generation...' },
    });

    // Start generation in background (non-blocking)
    generateKitAsync(kitDoc._id.toString(), userId, jobDescription, companyUrl, daysAvailable);

    return NextResponse.json({
      message: 'Kit generation started',
      kitId: kitDoc._id.toString(),
    }, { status: 202 });
  } catch (error) {
    console.error('Error creating kit:', error);
    return NextResponse.json({ error: 'Failed to create kit' }, { status: 500 });
  }
}

// Background kit generation
async function generateKitAsync(
  kitId: string,
  userId: string,
  jobDescription: string,
  companyUrl: string,
  daysAvailable: number,
) {
  try {
    await connectDB();

    const kit = await generateKit(jobDescription, companyUrl, daysAvailable, async (progress) => {
      // Update progress in DB
      await KitDocument.findByIdAndUpdate(kitId, {
        progress: {
          step: progress.step,
          percentage: progress.percentage,
          message: progress.message,
        },
      });
    });

    // Validate the generated kit
    const validationErrors = validateKit(kit);
    if (validationErrors.length > 0) {
      console.warn('Kit validation warnings:', validationErrors);
      // Don't fail — log warnings but still save
    }

    // Save the completed kit
    await KitDocument.findByIdAndUpdate(kitId, {
      kit,
      status: 'ready',
      progress: { step: 'done', percentage: 100, message: 'Kit generated successfully!' },
    });
  } catch (error) {
    console.error('Kit generation failed:', error);
    await connectDB();
    await KitDocument.findByIdAndUpdate(kitId, {
      status: 'failed',
      error: (error as Error).message || 'Unknown error during generation',
      progress: { step: 'error', percentage: 0, message: 'Generation failed' },
    });
  }
}

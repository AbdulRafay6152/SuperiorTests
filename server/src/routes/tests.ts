import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../index.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

// All test routes require authentication
router.use(authMiddleware);

// ── List User's Tests ──────────────────────────────────────

router.get('/', async (req: AuthRequest, res: Response) => {
  const tests = await prisma.test.findMany({
    where: { ownerId: req.userId },
    orderBy: { updatedAt: 'desc' },
    include: {
      _count: { select: { questions: true, attempts: true } },
    },
  });

  res.json(tests.map(t => ({
    ...t,
    settings: JSON.parse(t.settingsJson),
    questionCount: t._count.questions,
    attemptCount: t._count.attempts,
    _count: undefined,
  })));
});

// ── Create Test ────────────────────────────────────────────

const createTestSchema = z.object({
  name: z.string().min(1),
});

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { name } = createTestSchema.parse(req.body);
    const slug = Math.random().toString(36).substr(2, 8).toUpperCase();

    const defaultSettings = {
      name,
      description: '',
      timeLimitMinutes: null,
      attemptLimit: null,
      passcode: null,
      emailWhitelist: [],
      studentIdList: [],
      accessMode: 'open',
      startDate: null,
      endDate: null,
      showResults: true,
      showCorrectAnswers: true,
      completionMessage: 'Thank you. Your responses have been recorded.',
      negativeMarking: false,
      negativeMarkingPenalty: 0.25,
      allowBlankSubmissions: true,
      onePerPage: false,
      shuffleQuestions: false,
      shuffleOptions: false,
      antiCheat: {
        tabSwitchDetection: false,
        fullscreenEnforcement: false,
        disableCopyPaste: false,
        disableRightClick: false,
        disableTextSelection: false,
        watermark: false,
        preventRefresh: false,
        resumeControl: false,
      },
      notifyOnSubmit: false,
    };

    const test = await prisma.test.create({
      data: {
        slug,
        ownerId: req.userId!,
        settingsJson: JSON.stringify(defaultSettings),
      },
    });

    res.json({ ...test, settings: defaultSettings });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ── Get Test by ID ─────────────────────────────────────────

router.get('/:id', async (req: AuthRequest, res: Response) => {
  const test = await prisma.test.findFirst({
    where: { id: req.params.id, ownerId: req.userId },
    include: { questions: { orderBy: { order: 'asc' } } },
  });

  if (!test) {
    return res.status(404).json({ error: 'Test not found' });
  }

  res.json({
    ...test,
    settings: JSON.parse(test.settingsJson),
    questions: test.questions.map(q => ({
      ...q,
      content: JSON.parse(q.contentJson),
    })),
  });
});

// ── Get Test by Slug (public, for test-takers) ─────────────

router.get('/slug/:slug', async (req: Request, res: Response) => {
  const test = await prisma.test.findUnique({
    where: { slug: req.params.slug },
    include: { questions: { orderBy: { order: 'asc' } } },
  });

  if (!test || !test.published) {
    return res.status(404).json({ error: 'Test not found or not published' });
  }

  const settings = JSON.parse(test.settingsJson);

  // Check availability window
  const now = new Date();
  if (settings.startDate && new Date(settings.startDate) > now) {
    return res.status(403).json({ error: 'Test not yet available' });
  }
  if (settings.endDate && new Date(settings.endDate) < now) {
    return res.status(403).json({ error: 'Test has ended' });
  }

  // Return test without correct answers
  res.json({
    id: test.id,
    slug: test.slug,
    settings: {
      ...settings,
      showCorrectAnswers: false, // Never expose to taker
    },
    questions: test.questions.map(q => {
      const content = JSON.parse(q.contentJson);
      // Strip correct answers from options
      if (content.options) {
        content.options = content.options.map((o: any) => ({
          id: o.id,
          text: o.text,
        }));
      }
      return { ...q, content };
    }),
  });
});

// ── Update Test ────────────────────────────────────────────

router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const test = await prisma.test.findFirst({
      where: { id: req.params.id, ownerId: req.userId },
    });

    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }

    const { settings, questions } = req.body;

    await prisma.test.update({
      where: { id: test.id },
      data: {
        ...(settings && { settingsJson: JSON.stringify(settings) }),
      },
    });

    // Update questions if provided
    if (questions) {
      // Delete existing questions
      await prisma.question.deleteMany({ where: { testId: test.id } });

      // Create new questions
      if (questions.length > 0) {
        await prisma.question.createMany({
          data: questions.map((q: any, i: number) => ({
            testId: test.id,
            order: i,
            type: q.type,
            contentJson: JSON.stringify(q),
          })),
        });
      }
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ── Publish / Unpublish ────────────────────────────────────

router.patch('/:id/publish', async (req: AuthRequest, res: Response) => {
  const test = await prisma.test.findFirst({
    where: { id: req.params.id, ownerId: req.userId },
  });

  if (!test) {
    return res.status(404).json({ error: 'Test not found' });
  }

  await prisma.test.update({
    where: { id: test.id },
    data: { published: true },
  });

  res.json({ success: true });
});

router.patch('/:id/unpublish', async (req: AuthRequest, res: Response) => {
  const test = await prisma.test.findFirst({
    where: { id: req.params.id, ownerId: req.userId },
  });

  if (!test) {
    return res.status(404).json({ error: 'Test not found' });
  }

  await prisma.test.update({
    where: { id: test.id },
    data: { published: false },
  });

  res.json({ success: true });
});

// ── Delete Test ────────────────────────────────────────────

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const test = await prisma.test.findFirst({
    where: { id: req.params.id, ownerId: req.userId },
  });

  if (!test) {
    return res.status(404).json({ error: 'Test not found' });
  }

  await prisma.test.delete({ where: { id: test.id } });
  res.json({ success: true });
});

// ── Get Test Results ───────────────────────────────────────

router.get('/:id/results', async (req: AuthRequest, res: Response) => {
  const test = await prisma.test.findFirst({
    where: { id: req.params.id, ownerId: req.userId },
    include: { questions: { orderBy: { order: 'asc' } } },
  });

  if (!test) {
    return res.status(404).json({ error: 'Test not found' });
  }

  const attempts = await prisma.attempt.findMany({
    where: { testId: test.id, status: 'submitted' },
    orderBy: { submittedAt: 'desc' },
    include: {
      antiCheatEvents: true,
      answers: true,
    },
  });

  res.json({
    test: {
      ...test,
      settings: JSON.parse(test.settingsJson),
      questions: test.questions.map(q => ({ ...q, content: JSON.parse(q.contentJson) })),
    },
    attempts: attempts.map(a => ({
      ...a,
      answers: a.answers.map(ans => ({
        ...ans,
        answer: JSON.parse(ans.answerJson),
      })),
    })),
  });
});

export default router;

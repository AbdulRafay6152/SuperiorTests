// ============================================================
// GGDC Tests — Tests Routes
// ============================================================

import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { sendEmail } from '../utils/email';
import { config } from '../config';

const prisma = new PrismaClient();
const router = Router();

function generateSlug(): string {
  return Math.random().toString(36).substr(2, 8).toUpperCase();
}

// ── List User's Tests ──────────────────────────────────────
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const tests = await prisma.test.findMany({
      where: { ownerId: req.userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        questions: { select: { id: true } },
        attempts: { select: { id: true, status: true } },
      },
    });

    const result = tests.map(t => ({
      id: t.id,
      slug: t.slug,
      name: JSON.parse(t.settingsJson).name || 'Untitled Test',
      published: t.published,
      questionCount: t.questions.length,
      attemptCount: t.attempts.filter(a => a.status === 'submitted').length,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));

    res.json(result);
  } catch (err) {
    console.error('List tests error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Create Test ────────────────────────────────────────────
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.body;
    const settings = {
      name: name || 'Untitled Test',
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
        ownerId: req.userId!,
        slug: generateSlug(),
        settingsJson: JSON.stringify(settings),
      },
    });

    res.status(201).json(test);
  } catch (err) {
    console.error('Create test error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Get Test by ID ─────────────────────────────────────────
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const test = await prisma.test.findUnique({
      where: { id: req.params.id },
      include: { questions: { orderBy: { order: 'asc' } } },
    });

    if (!test || test.ownerId !== req.userId) {
      return res.status(404).json({ error: 'Test not found' });
    }

    res.json({
      ...test,
      settings: JSON.parse(test.settingsJson),
      questions: test.questions.map(q => ({
        ...q,
        data: JSON.parse(q.dataJson),
      })),
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Get Test by Slug (public) ──────────────────────────────
router.get('/slug/:slug', async (req: Request, res: Response) => {
  try {
    const test = await prisma.test.findUnique({
      where: { slug: req.params.slug },
      include: {
        questions: { orderBy: { order: 'asc' } },
        emailWhitelist: true,
        studentIdWhitelist: true,
      },
    });

    if (!test || !test.published) {
      return res.status(404).json({ error: 'Test not found or not published' });
    }

    const settings = JSON.parse(test.settingsJson);

    // Check availability
    const now = new Date();
    if (settings.startDate && new Date(settings.startDate) > now) {
      return res.status(403).json({ error: 'Test not yet available' });
    }
    if (settings.endDate && new Date(settings.endDate) < now) {
      return res.status(403).json({ error: 'Test has ended' });
    }

    res.json({
      id: test.id,
      slug: test.slug,
      settings: {
        ...settings,
        emailWhitelist: test.emailWhitelist.map(w => w.email),
        studentIdList: test.studentIdWhitelist.map(w => w.studentId),
      },
      questions: test.questions.map(q => ({
        id: q.id,
        type: q.type,
        text: q.text,
        points: q.points,
        order: q.order,
        data: JSON.parse(q.dataJson),
      })),
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Update Test ────────────────────────────────────────────
router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const test = await prisma.test.findUnique({ where: { id: req.params.id } });
    if (!test || test.ownerId !== req.userId) {
      return res.status(404).json({ error: 'Test not found' });
    }

    const { settings, questions } = req.body;

    // Update settings
    if (settings) {
      const { emailWhitelist, studentIdList, ...settingsWithoutLists } = settings;
      await prisma.test.update({
        where: { id: req.params.id },
        data: { settingsJson: JSON.stringify(settingsWithoutLists) },
      });

      // Update whitelists
      if (emailWhitelist !== undefined) {
        await prisma.emailWhitelist.deleteMany({ where: { testId: req.params.id } });
        if (emailWhitelist.length > 0) {
          await prisma.emailWhitelist.createMany({
            data: emailWhitelist.map((email: string) => ({ testId: req.params.id, email })),
          });
        }
      }
      if (studentIdList !== undefined) {
        await prisma.studentIdWhitelist.deleteMany({ where: { testId: req.params.id } });
        if (studentIdList.length > 0) {
          await prisma.studentIdWhitelist.createMany({
            data: studentIdList.map((studentId: string) => ({ testId: req.params.id, studentId })),
          });
        }
      }
    }

    // Update questions (replace all)
    if (questions) {
      await prisma.question.deleteMany({ where: { testId: req.params.id } });
      if (questions.length > 0) {
        await prisma.question.createMany({
          data: questions.map((q: any, idx: number) => ({
            testId: req.params.id,
            order: q.order ?? idx,
            type: q.type,
            text: q.text,
            points: q.points || 1,
            dataJson: JSON.stringify({
              options: q.options,
              matchingPairs: q.matchingPairs,
              correctAnswer: q.correctAnswer,
              correctAnswers: q.correctAnswers,
              numericTolerance: q.numericTolerance,
              explanation: q.explanation,
            }),
          })),
        });
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Update test error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Publish / Unpublish ────────────────────────────────────
router.patch('/:id/publish', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const test = await prisma.test.findUnique({ where: { id: req.params.id } });
    if (!test || test.ownerId !== req.userId) {
      return res.status(404).json({ error: 'Test not found' });
    }

    const { published } = req.body;
    await prisma.test.update({
      where: { id: req.params.id },
      data: { published: published !== false },
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Delete Test ────────────────────────────────────────────
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const test = await prisma.test.findUnique({ where: { id: req.params.id } });
    if (!test || test.ownerId !== req.userId) {
      return res.status(404).json({ error: 'Test not found' });
    }

    await prisma.test.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

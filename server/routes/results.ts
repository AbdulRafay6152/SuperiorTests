// ============================================================
// GGDC Tests — Results Routes
// ============================================================

import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const prisma = new PrismaClient();
const router = Router();

// ── Get Test Results ───────────────────────────────────────
router.get('/:testId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const test = await prisma.test.findUnique({ where: { id: req.params.testId } });
    if (!test || test.ownerId !== req.userId) {
      return res.status(404).json({ error: 'Test not found' });
    }

    const attempts = await prisma.attempt.findMany({
      where: { testId: req.params.testId, status: 'submitted' },
      orderBy: { submittedAt: 'desc' },
      include: { antiCheatEvents: true },
    });

    const results = attempts.map(a => ({
      id: a.id,
      takerName: a.takerName,
      takerEmail: a.takerEmail,
      takerStudentId: a.takerStudentId,
      score: a.score,
      maxScore: a.maxScore,
      percentage: a.percentage,
      timeTakenSeconds: a.timeTakenSeconds,
      submittedAt: a.submittedAt,
      attemptNumber: a.attemptNumber,
      antiCheatEventCount: a.antiCheatEvents.length,
    }));

    // Stats
    const scores = results.map(r => r.percentage || 0);
    const stats = scores.length > 0 ? {
      totalAttempts: scores.length,
      averageScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      highestScore: Math.max(...scores),
      lowestScore: Math.min(...scores),
      passRate: Math.round((scores.filter(s => s >= 50).length / scores.length) * 100),
    } : null;

    res.json({ results, stats });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Get Single Attempt Detail ──────────────────────────────
router.get('/:testId/attempts/:attemptId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const test = await prisma.test.findUnique({
      where: { id: req.params.testId },
      include: { questions: { orderBy: { order: 'asc' } } },
    });
    if (!test || test.ownerId !== req.userId) {
      return res.status(404).json({ error: 'Test not found' });
    }

    const attempt = await prisma.attempt.findUnique({
      where: { id: req.params.attemptId },
      include: { antiCheatEvents: { orderBy: { timestamp: 'asc' } } },
    });
    if (!attempt) {
      return res.status(404).json({ error: 'Attempt not found' });
    }

    res.json({
      attempt: {
        ...attempt,
        answers: JSON.parse(attempt.answersJson),
      },
      test: {
        ...test,
        settings: JSON.parse(test.settingsJson),
        questions: test.questions.map(q => ({
          ...q,
          data: JSON.parse(q.dataJson),
        })),
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Per-Question Stats ─────────────────────────────────────
router.get('/:testId/question-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const test = await prisma.test.findUnique({
      where: { id: req.params.testId },
      include: {
        questions: { orderBy: { order: 'asc' } },
        attempts: { where: { status: 'submitted' } },
      },
    });
    if (!test || test.ownerId !== req.userId) {
      return res.status(404).json({ error: 'Test not found' });
    }

    const questionStats = test.questions.map(q => {
      const qData = JSON.parse(q.dataJson);
      let correct = 0;
      let total = 0;

      for (const attempt of test.attempts) {
        const answers = JSON.parse(attempt.answersJson);
        const answer = answers.find((a: any) => a.questionId === q.id);
        if (!answer || !answer.answer) continue;
        total++;

        let isCorrect = false;
        switch (q.type) {
          case 'multiple-choice-single':
          case 'true-false':
            isCorrect = qData.options?.some((o: any) => o.isCorrect && o.text === answer.answer) || false;
            break;
          case 'fill-blank':
          case 'short-answer':
            isCorrect = (answer.answer as string).toLowerCase().trim() ===
              (qData.correctAnswer || '').toLowerCase().trim();
            break;
        }
        if (isCorrect) correct++;
      }

      return {
        questionId: q.id,
        order: q.order,
        text: q.text.substring(0, 80),
        correct,
        total,
        rate: total > 0 ? Math.round((correct / total) * 100) : 0,
      };
    });

    res.json(questionStats);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Export CSV ─────────────────────────────────────────────
router.get('/:testId/export/csv', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const test = await prisma.test.findUnique({ where: { id: req.params.testId } });
    if (!test || test.ownerId !== req.userId) {
      return res.status(404).json({ error: 'Test not found' });
    }

    const attempts = await prisma.attempt.findMany({
      where: { testId: req.params.testId, status: 'submitted' },
      orderBy: { submittedAt: 'desc' },
      include: { antiCheatEvents: true },
    });

    const headers = ['#', 'Name', 'Email', 'Student ID', 'Score', 'Max Score', 'Percentage', 'Time (s)', 'Submitted At', 'Attempt #', 'Anti-Cheat Flags'];
    const rows = attempts.map((a, idx) => [
      idx + 1,
      `"${a.takerName}"`,
      `"${a.takerEmail}"`,
      `"${a.takerStudentId}"`,
      a.score,
      a.maxScore,
      `${a.percentage}%`,
      a.timeTakenSeconds,
      a.submittedAt ? new Date(a.submittedAt).toISOString() : '',
      a.attemptNumber,
      a.antiCheatEvents.length,
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const settings = JSON.parse(test.settingsJson);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${settings.name.replace(/\s+/g, '_')}_results.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

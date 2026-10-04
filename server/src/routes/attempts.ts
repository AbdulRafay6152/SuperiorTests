import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../index.js';
import { sendEmail } from '../utils/email.js';

const router = Router();

// ── Start Attempt (no auth required — guest taker) ─────────

const startAttemptSchema = z.object({
  testSlug: z.string(),
  takerName: z.string().min(1),
  takerFatherName: z.string().min(1),
  takerEmail: z.string().email().optional(),
  takerStudentId: z.string().optional(),
  passcode: z.string().optional(),
});

router.post('/start', async (req: Request, res: Response) => {
  try {
    const data = startAttemptSchema.parse(req.body);
    const test = await prisma.test.findUnique({
      where: { slug: data.testSlug },
      include: { questions: { orderBy: { order: 'asc' } } },
    });

    if (!test || !test.published) {
      return res.status(404).json({ error: 'Test not found' });
    }

    const settings = JSON.parse(test.settingsJson);

    // Access control
    if (settings.accessMode === 'passcode' && data.passcode !== settings.passcode) {
      return res.status(403).json({ error: 'Incorrect passcode' });
    }
    if (settings.accessMode === 'whitelist-email' && data.takerEmail) {
      if (!settings.emailWhitelist.includes(data.takerEmail.toLowerCase())) {
        return res.status(403).json({ error: 'Email not authorized' });
      }
    }
    if (settings.accessMode === 'whitelist-id' && data.takerStudentId) {
      if (!settings.studentIdList.includes(data.takerStudentId)) {
        return res.status(403).json({ error: 'Student ID not authorized' });
      }
    }

    // Check attempt limit
    if (settings.attemptLimit) {
      const existingCount = await prisma.attempt.count({
        where: {
          testId: test.id,
          OR: [
            ...(data.takerEmail ? [{ takerEmail: data.takerEmail.toLowerCase() }] : []),
            ...(data.takerStudentId ? [{ takerStudentId: data.takerStudentId }] : []),
          ],
        },
      });
      if (existingCount >= settings.attemptLimit) {
        return res.status(403).json({ error: 'Attempt limit reached' });
      }
    }

    const attemptNumber = await prisma.attempt.count({
      where: { testId: test.id },
    }) + 1;

    const attempt = await prisma.attempt.create({
      data: {
        testId: test.id,
        takerName: data.takerName,
        takerFatherName: data.takerFatherName,
        takerEmail: data.takerEmail?.toLowerCase() || '',
        takerStudentId: data.takerStudentId || '',
        attemptNumber,
        status: 'in-progress',
        maxScore: test.questions.reduce((sum, q) => {
          const content = JSON.parse(q.contentJson);
          return sum + (content.points || 1);
        }, 0),
      },
    });

    res.json({ attemptId: attempt.id });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ── Save Progress (auto-save answers) ──────────────────────

const saveProgressSchema = z.object({
  attemptId: z.string(),
  answers: z.array(z.object({
    questionId: z.string(),
    answer: z.any(),
    flagged: z.boolean().optional(),
    timeSpent: z.number().optional(),
  })),
});

router.post('/progress', async (req: Request, res: Response) => {
  try {
    const { attemptId, answers } = saveProgressSchema.parse(req.body);

    await prisma.attempt.update({
      where: { id: attemptId },
      data: { answersJson: JSON.stringify(answers) },
    });

    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ── Log Anti-Cheat Event ───────────────────────────────────

const antiCheatSchema = z.object({
  attemptId: z.string(),
  type: z.string(),
  details: z.string().optional(),
});

router.post('/anti-cheat', async (req: Request, res: Response) => {
  try {
    const data = antiCheatSchema.parse(req.body);

    await prisma.antiCheatEvent.create({
      data: {
        attemptId: data.attemptId,
        type: data.type,
        details: data.details,
      },
    });

    // If resume control is on, pause the attempt
    const attempt = await prisma.attempt.findUnique({
      where: { id: data.attemptId },
      include: { test: true },
    });

    if (attempt) {
      const settings = JSON.parse(attempt.test.settingsJson);
      if (settings.antiCheat?.resumeControl) {
        await prisma.attempt.update({
          where: { id: data.attemptId },
          data: { status: 'paused' },
        });
      }

      // Notify owner
      if (settings.notifyOnSubmit || settings.antiCheat?.tabSwitchDetection) {
        const owner = await prisma.user.findUnique({ where: { id: attempt.test.ownerId } });
        if (owner) {
          await sendEmail({
            to: owner.email,
            subject: `Anti-Cheat Alert: ${attempt.takerName}`,
            html: `<p>Anti-cheat event detected for <strong>${attempt.takerName}</strong> on test "${attempt.test.settingsJson ? JSON.parse(attempt.test.settingsJson).name : 'Unknown'}":</p><p>Type: ${data.type}</p><p>Details: ${data.details || 'None'}</p>`,
          });
        }
      }
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ── Submit Attempt ─────────────────────────────────────────

const submitSchema = z.object({
  attemptId: z.string(),
  answers: z.array(z.object({
    questionId: z.string(),
    answer: z.any(),
    flagged: z.boolean().optional(),
    timeSpent: z.number().optional(),
  })),
  antiCheatEvents: z.array(z.object({
    type: z.string(),
    timestamp: z.string(),
    details: z.string().optional(),
  })).optional(),
});

router.post('/submit', async (req: Request, res: Response) => {
  try {
    const data = submitSchema.parse(req.body);
    const attempt = await prisma.attempt.findUnique({
      where: { id: data.attemptId },
      include: {
        test: { include: { questions: { orderBy: { order: 'asc' } } } },
      },
    });

    if (!attempt) {
      return res.status(404).json({ error: 'Attempt not found' });
    }

    const settings = JSON.parse(attempt.test.settingsJson);
    const questions = attempt.test.questions.map(q => ({
      ...q,
      content: JSON.parse(q.contentJson),
    }));

    // Calculate score
    let totalScore = 0;
    let maxScore = 0;

    for (const q of questions) {
      maxScore += q.content.points || 1;
      const ans = data.answers.find(a => a.questionId === q.id);
      if (!ans) continue;

      let isCorrect = false;
      switch (q.type) {
        case 'multiple-choice-single':
        case 'true-false':
          isCorrect = q.content.options?.some((o: any) => o.isCorrect && o.text === ans.answer) || false;
          break;
        case 'multiple-choice-multi': {
          const correct = q.content.options?.filter((o: any) => o.isCorrect).map((o: any) => o.text) || [];
          const selected = Array.isArray(ans.answer) ? ans.answer : [];
          isCorrect = correct.length === selected.length && correct.every((c: string) => selected.includes(c));
          break;
        }
        case 'fill-blank':
        case 'short-answer':
          isCorrect = (ans.answer as string).toLowerCase().trim() === (q.content.correctAnswer || '').toLowerCase().trim();
          break;
        case 'numeric': {
          const numAns = parseFloat(ans.answer as string);
          const numCorrect = parseFloat(q.content.correctAnswer || '0');
          const tol = q.content.numericTolerance || 0;
          isCorrect = Math.abs(numAns - numCorrect) <= tol;
          break;
        }
        case 'matching': {
          const pairs = q.content.matchingPairs || [];
          const matchAns = ans.answer as Record<string, string>;
          isCorrect = pairs.every((p: any) => matchAns[p.id] === p.right);
          break;
        }
        case 'essay':
          isCorrect = false; // Manual grading
          break;
      }

      if (isCorrect) {
        totalScore += q.content.points || 1;
      } else if (settings.negativeMarking && q.type !== 'essay') {
        totalScore -= (q.content.points || 1) * (settings.negativeMarkingPenalty || 0.25);
      }
    }

    const score = Math.max(0, totalScore);
    const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
    const timeTaken = Math.floor((Date.now() - attempt.startedAt.getTime()) / 1000);

    // Save answers
    await prisma.answer.deleteMany({ where: { attemptId: attempt.id } });
    if (data.answers.length > 0) {
      await prisma.answer.createMany({
        data: data.answers.map(a => ({
          attemptId: attempt.id,
          questionId: a.questionId,
          answerJson: JSON.stringify(a.answer),
          flagged: a.flagged || false,
          timeSpent: a.timeSpent || 0,
        })),
      });
    }

    // Save anti-cheat events
    if (data.antiCheatEvents?.length) {
      await prisma.antiCheatEvent.createMany({
        data: data.antiCheatEvents.map(e => ({
          attemptId: attempt.id,
          type: e.type,
          details: e.details,
          timestamp: new Date(e.timestamp),
        })),
      });
    }

    // Update attempt
    await prisma.attempt.update({
      where: { id: attempt.id },
      data: {
        status: 'submitted',
        submittedAt: new Date(),
        score,
        maxScore,
        percentage,
        timeTakenSec: timeTaken,
        answersJson: JSON.stringify(data.answers),
      },
    });

    // Notify owner
    if (settings.notifyOnSubmit) {
      const owner = await prisma.user.findUnique({ where: { id: attempt.test.ownerId } });
      if (owner) {
        const testName = settings.name || 'Unknown Test';
        await sendEmail({
          to: owner.email,
          subject: `New Result: ${attempt.takerName} — ${testName}`,
          html: `<p><strong>${attempt.takerName}</strong> submitted "${testName}".</p><p>Score: ${score}/${maxScore} (${percentage}%)</p>`,
        });
      }
    }

    res.json({
      success: true,
      score,
      maxScore,
      percentage,
      showResults: settings.showResults,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ── Resume Paused Attempt (owner approval) ─────────────────

router.patch('/:id/resume', async (req: Request, res: Response) => {
  const attempt = await prisma.attempt.findUnique({ where: { id: req.params.id } });
  if (!attempt) {
    return res.status(404).json({ error: 'Attempt not found' });
  }

  await prisma.attempt.update({
    where: { id: attempt.id },
    data: { status: 'in-progress' },
  });

  res.json({ success: true });
});

export default router;

// ============================================================
// GGDC Tests — Attempts Routes (Test Taking)
// ============================================================

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { sendEmail } from '../utils/email';
import { config } from '../config';

const prisma = new PrismaClient();
const router = Router();

// ── Start Attempt ──────────────────────────────────────────
router.post('/start/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const { takerName, takerEmail, takerStudentId, passcode } = req.body;

    if (!takerName) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const test = await prisma.test.findUnique({
      where: { slug },
      include: {
        emailWhitelist: true,
        studentIdWhitelist: true,
      },
    });

    if (!test || !test.published) {
      return res.status(404).json({ error: 'Test not found or not published' });
    }

    const settings = JSON.parse(test.settingsJson);

    // Validate access
    if (settings.accessMode === 'passcode' && passcode !== settings.passcode) {
      return res.status(403).json({ error: 'Incorrect passcode' });
    }
    if (settings.accessMode === 'whitelist-email' && !test.emailWhitelist.find(w => w.email === takerEmail?.toLowerCase())) {
      return res.status(403).json({ error: 'Email not authorized' });
    }
    if (settings.accessMode === 'whitelist-id' && !test.studentIdWhitelist.find(w => w.studentId === takerStudentId)) {
      return res.status(403).json({ error: 'Student ID not authorized' });
    }

    // Check attempt limit
    if (settings.attemptLimit) {
      const existingAttempts = await prisma.attempt.count({
        where: {
          testId: test.id,
          OR: [
            { takerEmail: takerEmail?.toLowerCase() || '' },
            { takerStudentId: takerStudentId || '' },
          ],
          status: 'submitted',
        },
      });
      if (existingAttempts >= settings.attemptLimit) {
        return res.status(403).json({ error: 'Attempt limit reached' });
      }
    }

    // Count existing attempts for attempt number
    const attemptNumber = await prisma.attempt.count({
      where: {
        testId: test.id,
        OR: [
          { takerEmail: takerEmail?.toLowerCase() || '' },
          { takerStudentId: takerStudentId || '' },
        ],
      },
    }) + 1;

    const attempt = await prisma.attempt.create({
      data: {
        testId: test.id,
        takerName,
        takerEmail: takerEmail?.toLowerCase() || '',
        takerStudentId: takerStudentId || '',
        attemptNumber,
        status: 'in-progress',
      },
    });

    res.status(201).json(attempt);
  } catch (err) {
    console.error('Start attempt error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Save Progress (auto-save) ──────────────────────────────
router.put('/:attemptId/progress', async (req: Request, res: Response) => {
  try {
    const { attemptId } = req.params;
    const { answers } = req.body;

    await prisma.attempt.update({
      where: { id: attemptId },
      data: { answersJson: JSON.stringify(answers) },
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Log Anti-Cheat Event ───────────────────────────────────
router.post('/:attemptId/anti-cheat', async (req: Request, res: Response) => {
  try {
    const { attemptId } = req.params;
    const { type, details } = req.body;

    await prisma.antiCheatEvent.create({
      data: { attemptId, type, details },
    });

    // If resume control is enabled, pause the attempt
    const attempt = await prisma.attempt.findUnique({ where: { id: attemptId }, include: { test: true } });
    if (attempt) {
      const settings = JSON.parse(attempt.test.settingsJson);
      if (settings.antiCheat?.resumeControl) {
        await prisma.attempt.update({
          where: { id: attemptId },
          data: { status: 'paused' },
        });

        // Notify owner
        if (settings.notifyOnSubmit) {
          const owner = await prisma.user.findUnique({ where: { id: attempt.test.ownerId } });
          if (owner) {
            await sendEmail({
              to: owner.email,
              subject: `Suspicious Activity: ${attempt.takerName} — ${settings.name}`,
              html: `
                <h2>Anti-Cheat Alert</h2>
                <p><strong>Student:</strong> ${attempt.takerName} (${attempt.takerEmail})</p>
                <p><strong>Test:</strong> ${settings.name}</p>
                <p><strong>Event:</strong> ${type}</p>
                <p><strong>Details:</strong> ${details || 'N/A'}</p>
                <p>The attempt has been paused. You can resume it from the dashboard.</p>
              `,
            });
          }
        }
      }
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Submit Attempt ─────────────────────────────────────────
router.post('/:attemptId/submit', async (req: Request, res: Response) => {
  try {
    const { attemptId } = req.params;
    const { answers, antiCheatEvents } = req.body;

    const attempt = await prisma.attempt.findUnique({
      where: { id: attemptId },
      include: {
        test: { include: { questions: { orderBy: { order: 'asc' } } } },
        antiCheatEvents: true,
      },
    });

    if (!attempt) {
      return res.status(404).json({ error: 'Attempt not found' });
    }

    const settings = JSON.parse(attempt.test.settingsJson);

    // Calculate score
    let totalScore = 0;
    let maxScore = 0;

    for (const question of attempt.test.questions) {
      maxScore += question.points;
      const qData = JSON.parse(question.dataJson);
      const answer = answers.find((a: any) => a.questionId === question.id);
      if (!answer) continue;

      let isCorrect = false;
      switch (question.type) {
        case 'multiple-choice-single':
        case 'true-false':
          isCorrect = qData.options?.some((o: any) => o.isCorrect && o.text === answer.answer) || false;
          break;
        case 'multiple-choice-multi': {
          const correctOptions = qData.options?.filter((o: any) => o.isCorrect).map((o: any) => o.text) || [];
          const selectedAnswers = Array.isArray(answer.answer) ? answer.answer : [];
          isCorrect = correctOptions.length === selectedAnswers.length &&
            correctOptions.every((c: string) => selectedAnswers.includes(c));
          break;
        }
        case 'fill-blank':
        case 'short-answer':
          isCorrect = (answer.answer as string).toLowerCase().trim() ===
            (qData.correctAnswer || '').toLowerCase().trim();
          break;
        case 'numeric': {
          const numAnswer = parseFloat(answer.answer as string);
          const numCorrect = parseFloat(qData.correctAnswer || '0');
          const tolerance = qData.numericTolerance || 0;
          isCorrect = Math.abs(numAnswer - numCorrect) <= tolerance;
          break;
        }
        case 'matching': {
          const pairs = qData.matchingPairs || [];
          const matchAnswers = answer.answer as Record<string, string>;
          isCorrect = pairs.every((p: any) => matchAnswers[p.id] === p.right);
          break;
        }
        case 'essay':
          isCorrect = false; // Requires manual grading
          break;
      }

      if (isCorrect) {
        totalScore += question.points;
      } else if (settings.negativeMarking && question.type !== 'essay') {
        const penalty = question.points * (settings.negativeMarkingPenalty || 0.25);
        totalScore -= penalty;
      }
    }

    const score = Math.max(0, totalScore);
    const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
    const timeTakenSeconds = Math.floor((Date.now() - new Date(attempt.startedAt).getTime()) / 1000);

    // Save anti-cheat events
    if (antiCheatEvents && antiCheatEvents.length > 0) {
      await prisma.antiCheatEvent.createMany({
        data: antiCheatEvents.map((e: any) => ({
          attemptId,
          type: e.type,
          details: e.details,
          timestamp: new Date(e.timestamp),
        })),
      });
    }

    // Update attempt
    const updated = await prisma.attempt.update({
      where: { id: attemptId },
      data: {
        answersJson: JSON.stringify(answers),
        score,
        maxScore,
        percentage,
        timeTakenSeconds,
        submittedAt: new Date(),
        status: 'submitted',
      },
    });

    // Notify owner
    if (settings.notifyOnSubmit) {
      const owner = await prisma.user.findUnique({ where: { id: attempt.test.ownerId } });
      if (owner) {
        await sendEmail({
          to: owner.email,
          subject: `New Submission: ${attempt.takerName} — ${settings.name}`,
          html: `
            <h2>New Test Submission</h2>
            <p><strong>Student:</strong> ${attempt.takerName} (${attempt.takerEmail})</p>
            <p><strong>Test:</strong> ${settings.name}</p>
            <p><strong>Score:</strong> ${score}/${maxScore} (${percentage}%)</p>
            <p><a href="${config.appUrl}/test/${attempt.testId}/results/${attemptId}">View Details</a></p>
          `,
        });
      }
    }

    res.json(updated);
  } catch (err) {
    console.error('Submit attempt error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Resume Paused Attempt (owner only) ─────────────────────
router.post('/:attemptId/resume', async (req: Request, res: Response) => {
  try {
    const { attemptId } = req.params;
    // TODO: Add auth check for test owner

    await prisma.attempt.update({
      where: { id: attemptId },
      data: { status: 'in-progress' },
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

// ============================================================
// SuperiorTests — Auth Routes
// ============================================================

import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { config } from '../config';
import { sendEmail } from '../utils/email';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const prisma = new PrismaClient();
const router = Router();

// ── Signup ─────────────────────────────────────────────────
router.post('/signup', async (req: Request, res: Response) => {
  try {
    const { email, name, password } = req.body;

    if (!email || !name || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, config.bcryptRounds);
    const user = await prisma.user.create({
      data: { email: email.toLowerCase(), name, passwordHash },
    });

    // Generate tokens
    const accessToken = jwt.sign({ userId: user.id, email: user.email }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
    const refreshToken = jwt.sign({ userId: user.id, email: user.email }, config.jwtRefreshSecret, { expiresIn: config.jwtRefreshExpiresIn });

    // Store refresh token
    await prisma.session.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // Send welcome email
    await sendEmail({
      to: user.email,
      subject: 'Welcome to SuperiorTests',
      html: `
        <h2>Welcome, ${user.name}!</h2>
        <p>Your SuperiorTests account has been created successfully.</p>
        <p>You can now create and manage online assessments for your students.</p>
        <p><a href="${config.appUrl}/dashboard">Go to Dashboard</a></p>
      `,
    });

    res.status(201).json({
      user: { id: user.id, email: user.email, name: user.name },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Login ──────────────────────────────────────────────────
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const accessToken = jwt.sign({ userId: user.id, email: user.email }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
    const refreshToken = jwt.sign({ userId: user.id, email: user.email }, config.jwtRefreshSecret, { expiresIn: config.jwtRefreshExpiresIn });

    await prisma.session.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    res.json({
      user: { id: user.id, email: user.email, name: user.name },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Refresh Token ──────────────────────────────────────────
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    const decoded = jwt.verify(refreshToken, config.jwtRefreshSecret) as { userId: string; email: string };
    const session = await prisma.session.findUnique({ where: { token: refreshToken } });

    if (!session || session.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    const accessToken = jwt.sign({ userId: decoded.userId, email: decoded.email }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
    res.json({ accessToken });
  } catch (err) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// ── Logout ─────────────────────────────────────────────────
router.post('/logout', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await prisma.session.deleteMany({ where: { token: refreshToken, userId: req.userId! } });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Get Current User ───────────────────────────────────────
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ id: user.id, email: user.email, name: user.name, createdAt: user.createdAt });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Update Profile ─────────────────────────────────────────
router.put('/profile', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { name, email } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'Name and email are required' });

    const existing = await prisma.user.findFirst({
      where: { email: email.toLowerCase(), id: { not: req.userId } },
    });
    if (existing) return res.status(409).json({ error: 'Email already in use' });

    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { name, email: email.toLowerCase() },
    });

    res.json({ id: user.id, email: user.email, name: user.name });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Change Password ────────────────────────────────────────
router.put('/password', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Both passwords are required' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

    const passwordHash = await bcrypt.hash(newPassword, config.bcryptRounds);
    await prisma.user.update({ where: { id: req.userId }, data: { passwordHash } });

    // Invalidate all sessions
    await prisma.session.deleteMany({ where: { userId: req.userId } });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Request Password Reset ─────────────────────────────────
router.post('/password-reset', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) {
      // Don't reveal if email exists
      return res.json({ success: true, message: 'If an account exists, a reset email has been sent.' });
    }

    const token = require('crypto').randomBytes(32).toString('hex');
    await prisma.passwordResetToken.create({
      data: {
        email: user.email,
        token,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    const resetUrl = `${config.appUrl}/reset-password?token=${token}`;
    await sendEmail({
      to: user.email,
      subject: 'Reset Your SuperiorTests Password',
      html: `
        <h2>Password Reset Request</h2>
        <p>You requested a password reset. Click the link below to reset your password:</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>This link expires in 1 hour.</p>
        <p>If you did not request this, ignore this email.</p>
      `,
    });

    res.json({ success: true, message: 'If an account exists, a reset email has been sent.' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Confirm Password Reset ─────────────────────────────────
router.post('/password-reset/confirm', async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ error: 'Token and new password are required' });
    if (newPassword.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

    const resetToken = await prisma.passwordResetToken.findUnique({ where: { token } });
    if (!resetToken || resetToken.used || resetToken.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const passwordHash = await bcrypt.hash(newPassword, config.bcryptRounds);
    await prisma.user.update({ where: { email: resetToken.email }, data: { passwordHash } });
    await prisma.passwordResetToken.update({ where: { id: resetToken.id }, data: { used: true } });
    await prisma.session.deleteMany({ where: { user: { email: resetToken.email } } });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

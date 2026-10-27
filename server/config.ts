// ============================================================
// GGDC — Government Girls Degree College — Backend Configuration
// ============================================================

import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  database: {
    url: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/ggdc_tests',
  },
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'GGDC <noreply@ggdctests.com>',
  },
};

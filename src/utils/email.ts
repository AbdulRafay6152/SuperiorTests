import emailjs from '@emailjs/browser';

// EmailJS Configuration
// You'll need to set these up in your Vercel environment variables
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || '';
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || '';
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || '';

// Initialize EmailJS
export const initEmailJS = () => {
  if (EMAILJS_PUBLIC_KEY) {
    emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
  }
};

// Send welcome email to new user
export const sendWelcomeEmail = async (userEmail: string, userName: string) => {
  if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY) {
    console.warn('EmailJS not configured. Skipping welcome email.');
    return { success: false, error: 'EmailJS not configured' };
  }

  try {
    const templateParams = {
      to_email: userEmail,
      to_name: userName,
      message: `Welcome to SuperiorTests, ${userName}! Your account has been created successfully. You can now create and manage online tests.`,
    };

    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams);
    return { success: true };
  } catch (error) {
    console.error('Failed to send welcome email:', error);
    return { success: false, error: 'Failed to send email' };
  }
};

// Send password reset email
export const sendPasswordResetEmail = async (userEmail: string, resetLink: string) => {
  if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY) {
    console.warn('EmailJS not configured. Skipping password reset email.');
    return { success: false, error: 'EmailJS not configured' };
  }

  try {
    const templateParams = {
      to_email: userEmail,
      reset_link: resetLink,
      message: `Click the link below to reset your password:\n\n${resetLink}\n\nThis link will expire in 1 hour.`,
    };

    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams);
    return { success: true };
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    return { success: false, error: 'Failed to send email' };
  }
};

// Send anti-cheat alert to test owner
export const sendAntiCheatAlert = async (
  ownerEmail: string,
  testName: string,
  studentName: string,
  eventType: string
) => {
  if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY) {
    console.warn('EmailJS not configured. Skipping anti-cheat alert.');
    return { success: false, error: 'EmailJS not configured' };
  }

  try {
    const templateParams = {
      to_email: ownerEmail,
      test_name: testName,
      student_name: studentName,
      event_type: eventType,
      message: `Anti-cheat alert for test "${testName}":\n\nStudent: ${studentName}\nEvent: ${eventType}\n\nPlease review this attempt in your dashboard.`,
    };

    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams);
    return { success: true };
  } catch (error) {
    console.error('Failed to send anti-cheat alert:', error);
    return { success: false, error: 'Failed to send email' };
  }
};

// Send new submission notification to test owner
export const sendNewSubmissionEmail = async (
  ownerEmail: string,
  testName: string,
  studentName: string,
  score: number,
  maxScore: number
) => {
  if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY) {
    console.warn('EmailJS not configured. Skipping submission notification.');
    return { success: false, error: 'EmailJS not configured' };
  }

  try {
    const percentage = Math.round((score / maxScore) * 100);
    const templateParams = {
      to_email: ownerEmail,
      test_name: testName,
      student_name: studentName,
      score: `${score}/${maxScore} (${percentage}%)`,
      message: `New test submission received!\n\nTest: ${testName}\nStudent: ${studentName}\nScore: ${score}/${maxScore} (${percentage}%)\n\nView results in your dashboard.`,
    };

    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams);
    return { success: true };
  } catch (error) {
    console.error('Failed to send submission notification:', error);
    return { success: false, error: 'Failed to send email' };
  }
};

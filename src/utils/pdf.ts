import jsPDF from 'jspdf';
import { Test, Attempt } from '../types';
import { format } from 'date-fns';

// Brand colors
const PRIMARY = [40, 75, 99] as const; // #284B63
const ACCENT = [60, 110, 113] as const; // #3C6E71
const TEXT = [26, 26, 26] as const;
const TEXT_SECONDARY = [85, 85, 85] as const;
const BORDER = [224, 224, 224] as const;

function addHeader(doc: jsPDF, title: string) {
  // Header bar
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, 210, 16, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('GGDC Tests', 14, 10.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Government Girls Degree College', 160, 10.5);

  // Title
  doc.setTextColor(...TEXT);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 14, 30);
  
  // Separator
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.5);
  doc.line(14, 34, 196, 34);
}

function formatAnswer(answer: any): string {
  if (!answer) return '(no answer)';
  if (Array.isArray(answer)) return answer.join(', ');
  if (typeof answer === 'object') return Object.values(answer).join(', ');
  return String(answer);
}

function getCorrectAnswer(question: any): string {
  switch (question.type) {
    case 'multiple-choice-single':
    case 'true-false':
      return question.options?.find((o: any) => o.isCorrect)?.text || '—';
    case 'multiple-choice-multi':
      return question.options?.filter((o: any) => o.isCorrect).map((o: any) => o.text).join(', ') || '—';
    case 'fill-blank':
    case 'short-answer':
    case 'numeric':
      return question.correctAnswer || '—';
    case 'matching':
      return question.matchingPairs?.map((p: any) => `${p.left} → ${p.right}`).join('; ') || '—';
    default:
      return '—';
  }
}

function checkCorrectness(question: any, answer: any): boolean | null {
  if (!answer || !answer.answer || answer.answer === '') return null;
  if (question.type === 'essay') return null;

  switch (question.type) {
    case 'multiple-choice-single':
    case 'true-false':
      return question.options?.some((o: any) => o.isCorrect && o.text === answer.answer) || false;
    case 'multiple-choice-multi': {
      const correct = question.options?.filter((o: any) => o.isCorrect).map((o: any) => o.text) || [];
      const selected = Array.isArray(answer.answer) ? answer.answer : [];
      return correct.length === selected.length && correct.every((c: string) => selected.includes(c));
    }
    case 'fill-blank':
    case 'short-answer':
      return (answer.answer as string).toLowerCase().trim() === (question.correctAnswer || '').toLowerCase().trim();
    case 'numeric': {
      const numAns = parseFloat(answer.answer as string);
      const numCorrect = parseFloat(question.correctAnswer || '0');
      const tol = question.numericTolerance || 0;
      return Math.abs(numAns - numCorrect) <= tol;
    }
    case 'matching': {
      const pairs = question.matchingPairs || [];
      const matchAns = answer.answer as Record<string, string>;
      return pairs.every((p: any) => matchAns[p.id] === p.right);
    }
    default:
      return null;
  }
}

export function generatePDFReport(test: Test, attempt: Attempt): void {
  const doc = new jsPDF();
  
  addHeader(doc, `${test.settings.name} — Student Report`);

  let y = 42;

  // Student info
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...TEXT);
  doc.text('Student Information', 14, y);
  y += 6;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...TEXT_SECONDARY);
  doc.text(`Name: ${attempt.takerName}`, 14, y); y += 5;
  if (attempt.takerFatherName) { doc.text(`Father's Name: ${attempt.takerFatherName}`, 14, y); y += 5; }
  doc.text(`Email: ${attempt.takerEmail}`, 14, y); y += 5;
  if (attempt.takerStudentId) { doc.text(`Student ID: ${attempt.takerStudentId}`, 14, y); y += 5; }
  doc.text(`Attempt: #${attempt.attemptNumber}`, 14, y); y += 5;
  doc.text(`Submitted: ${attempt.submittedAt ? format(new Date(attempt.submittedAt), 'MMM d, yyyy h:mm a') : '—'}`, 14, y); y += 5;
  if (attempt.timeTakenSeconds) {
    const mins = Math.floor(attempt.timeTakenSeconds / 60);
    const secs = attempt.timeTakenSeconds % 60;
    doc.text(`Time Taken: ${mins}m ${secs}s`, 14, y); y += 5;
  }
  y += 4;

  // Score summary
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(14, y, 182, 20, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...PRIMARY);
  doc.text(`Score: ${attempt.score} / ${attempt.maxScore} (${attempt.percentage}%)`, 20, y + 8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...TEXT_SECONDARY);
  doc.text(`Result: ${(attempt.percentage || 0) >= 50 ? 'PASS' : 'FAIL'}`, 20, y + 15);
  y += 28;

  // Anti-cheat flags
  if (attempt.antiCheatEvents.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(217, 119, 6);
    doc.text(`⚠ Anti-Cheat Flags: ${attempt.antiCheatEvents.length} event(s)`, 14, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...TEXT_SECONDARY);
    for (const event of attempt.antiCheatEvents.slice(0, 5)) {
      doc.text(`• ${format(new Date(event.timestamp), 'HH:mm:ss')} — ${event.type}${event.details ? `: ${event.details}` : ''}`, 18, y);
      y += 4;
    }
    y += 4;
  }

  // Question breakdown
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...TEXT);
  doc.text('Question Breakdown', 14, y);
  y += 6;

  for (let i = 0; i < test.questions.length; i++) {
    const q = test.questions[i];
    const answer = attempt.answers.find(a => a.questionId === q.id);
    const isCorrect = checkCorrectness(q, answer);

    if (y > 265) {
      doc.addPage();
      y = 20;
    }

    // Question header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...TEXT);
    const statusIcon = isCorrect === true ? '✓' : isCorrect === false ? '✗' : '—';
    const statusColor = isCorrect === true ? [5, 150, 105] : isCorrect === false ? [220, 38, 38] : [136, 136, 136];
    doc.setTextColor(...statusColor as [number, number, number]);
    doc.text(statusIcon, 14, y);
    doc.setTextColor(...TEXT);
    doc.text(`Q${i + 1} (${q.points} pts)`, 20, y);
    y += 4;

    // Question text (truncated)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...TEXT_SECONDARY);
    const qText = q.text.length > 100 ? q.text.substring(0, 100) + '...' : q.text;
    const splitQ = doc.splitTextToSize(qText, 170);
    doc.text(splitQ, 20, y);
    y += splitQ.length * 3.5 + 1;

    // Answer
    doc.setFontSize(8);
    doc.setTextColor(...TEXT_SECONDARY);
    doc.text(`Answer: ${formatAnswer(answer?.answer)}`, 24, y); y += 3.5;
    doc.setTextColor(5, 150, 105);
    doc.text(`Correct: ${getCorrectAnswer(q)}`, 24, y); y += 5;

    // Separator
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.2);
    doc.line(14, y, 196, y);
    y += 4;
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(...TEXT_SECONDARY);
    doc.text(`GGDC Tests — Generated ${format(new Date(), 'MMM d, yyyy h:mm a')} — Page ${i} of ${pageCount}`, 14, 290);
  }

  doc.save(`${attempt.takerName.replace(/\s+/g, '_')}_${test.settings.name.replace(/\s+/g, '_')}_report.pdf`);
}

export function generateBulkPDFReport(test: Test, attempts: Attempt[]): void {
  const doc = new jsPDF();
  
  addHeader(doc, `${test.settings.name} — Bulk Results Report`);

  let y = 42;

  // Summary
  const scores = attempts.map(a => a.percentage || 0);
  const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const highest = scores.length > 0 ? Math.max(...scores) : 0;
  const lowest = scores.length > 0 ? Math.min(...scores) : 0;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...TEXT_SECONDARY);
  doc.text(`Total Submissions: ${attempts.length} | Average: ${avg}% | Highest: ${highest}% | Lowest: ${lowest}%`, 14, y);
  y += 10;

  // Table header
  doc.setFillColor(...PRIMARY);
  doc.rect(14, y, 182, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('#', 16, y + 5.5);
  doc.text('Name', 24, y + 5.5);
  doc.text("Father's Name", 65, y + 5.5);
  doc.text('Score', 120, y + 5.5);
  doc.text('%', 140, y + 5.5);
  doc.text('Time', 155, y + 5.5);
  doc.text('Flags', 180, y + 5.5);
  y += 8;

  // Table rows
  doc.setTextColor(...TEXT);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);

  attempts.forEach((attempt, idx) => {
    if (y > 275) {
      doc.addPage();
      y = 20;
    }

    if (idx % 2 === 0) {
      doc.setFillColor(249, 249, 249);
      doc.rect(14, y, 182, 7, 'F');
    }

    doc.setTextColor(...TEXT);
    doc.text(String(idx + 1), 16, y + 5);
    doc.text(attempt.takerName.substring(0, 20), 24, y + 5);
    doc.setTextColor(...TEXT_SECONDARY);
    doc.text((attempt.takerFatherName || '—').substring(0, 25), 65, y + 5);
    doc.setTextColor(...TEXT);
    doc.text(`${attempt.score}/${attempt.maxScore}`, 120, y + 5);
    const pct = attempt.percentage || 0;
    doc.setTextColor(pct >= 50 ? 5 : 220, pct >= 50 ? 150 : 38, pct >= 50 ? 105 : 38);
    doc.text(`${pct}%`, 140, y + 5);
    doc.setTextColor(...TEXT_SECONDARY);
    const timeStr = attempt.timeTakenSeconds ? `${Math.floor(attempt.timeTakenSeconds / 60)}m` : '—';
    doc.text(timeStr, 155, y + 5);
    doc.text(attempt.antiCheatEvents.length > 0 ? String(attempt.antiCheatEvents.length) : '—', 180, y + 5);
    y += 7;
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(...TEXT_SECONDARY);
    doc.text(`GGDC Tests — Generated ${format(new Date(), 'MMM d, yyyy h:mm a')} — Page ${i} of ${pageCount}`, 14, 290);
  }

  doc.save(`${test.settings.name.replace(/\s+/g, '_')}_bulk_report.pdf`);
}

export function exportCSV(test: Test, attempts: Attempt[]): void {
  const headers = ['#', 'Name', "Father's Name", 'Email', 'Student ID', 'Score', 'Max Score', 'Percentage', 'Time (seconds)', 'Submitted At', 'Attempt #', 'Anti-Cheat Flags'];
  
  const rows = attempts.map((a, idx) => [
    String(idx + 1),
    `"${a.takerName}"`,
    `"${a.takerFatherName || ''}"`,
    `"${a.takerEmail}"`,
    `"${a.takerStudentId}"`,
    String(a.score ?? ''),
    String(a.maxScore),
    `${a.percentage ?? ''}%`,
    String(a.timeTakenSeconds ?? ''),
    a.submittedAt ? format(new Date(a.submittedAt), 'yyyy-MM-dd HH:mm:ss') : '',
    String(a.attemptNumber),
    String(a.antiCheatEvents.length),
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${test.settings.name.replace(/\s+/g, '_')}_results.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

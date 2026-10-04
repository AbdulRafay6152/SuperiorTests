import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getTest, updateTest } from '../firestoreStore';
import { Test, TestSettings as TestSettingsType } from '../types';
import { Save, ArrowLeft } from 'lucide-react';

function getDefaultSettings(): TestSettingsType {
  return {
    name: '', description: '', timeLimitMinutes: null, attemptLimit: null,
    passcode: null, emailWhitelist: [], studentIdList: [], accessMode: 'open',
    startDate: null, endDate: null, showResults: true, showCorrectAnswers: true,
    completionMessage: 'Thank you. Your responses have been recorded.',
    negativeMarking: false, negativeMarkingPenalty: 0.25, allowBlankSubmissions: true,
    onePerPage: false, shuffleQuestions: false, shuffleOptions: false,
    antiCheat: { tabSwitchDetection: false, fullscreenEnforcement: false, disableCopyPaste: false,
      disableRightClick: false, disableTextSelection: false, watermark: false, preventRefresh: false, resumeControl: false },
    notifyOnSubmit: false,
  };
}

export default function TestSettingsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [test, setTest] = useState<Test | null>(null);
  const [settings, setSettings] = useState<TestSettingsType>(getDefaultSettings());
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTest() {
      if (id) {
        const loaded = await getTest(id);
        if (loaded) {
          setTest(loaded);
          setSettings(loaded.settings);
        } else {
          navigate('/dashboard');
        }
      }
      setLoading(false);
    }
    loadTest();
  }, [id]);

  if (loading) {
    return <div className="py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Loading…</div>;
  }

  if (!test) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Test not found.</p>
      </div>
    );
  }

  const save = async () => {
    setSaving(true);
    await updateTest({ ...test, settings });
    setTimeout(() => { setSaving(false); navigate(`/test/${test.id}/edit`); }, 500);
  };

  const update = (partial: Partial<TestSettingsType>) => setSettings({ ...settings, ...partial });
  const updateAC = (partial: Partial<TestSettingsType['antiCheat']>) => 
    setSettings({ ...settings, antiCheat: { ...settings.antiCheat, ...partial } });

  const parseList = (text: string) => text.split('\n').map(s => s.trim()).filter(Boolean);

  return (
    <div className="max-w-2xl">
      <div className="mb-3 pb-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <Link to={`/test/${test.id}/edit`} className="text-xs no-underline" style={{ color: 'var(--text-muted)' }}>
          ← Back to editor
        </Link>
      </div>

      <h1 className="text-base font-semibold mb-4 tracking-tight" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text)' }}>
        Test Settings
      </h1>

      <div className="space-y-4">
        <Section title="General">
          <Field label="Test name">
            <input type="text" value={settings.name} onChange={e => update({ name: e.target.value })}
              className="w-full px-2.5 py-1.5 rounded border text-xs outline-none"
              style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }} />
          </Field>
          <Field label="Description / Instructions">
            <textarea value={settings.description} onChange={e => update({ description: e.target.value })}
              className="w-full px-2.5 py-1.5 rounded border text-xs outline-none resize-y"
              style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
              rows={3} placeholder="Instructions shown to students before they begin..." />
          </Field>
          <Field label="Completion message">
            <textarea value={settings.completionMessage} onChange={e => update({ completionMessage: e.target.value })}
              className="w-full px-2.5 py-1.5 rounded border text-xs outline-none resize-y"
              style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
              rows={2} />
          </Field>
        </Section>

        <Section title="Timing & Attempts">
          <Field label="Time Limit">
            <div className="flex items-center gap-2">
              <input type="number" value={settings.timeLimitMinutes || ''} onChange={e => update({ timeLimitMinutes: e.target.value ? parseInt(e.target.value) : null })}
                className="w-20 px-2 py-1 rounded border text-xs outline-none"
                style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
                min={1} placeholder="∞" />
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>minutes (leave blank for unlimited)</span>
            </div>
          </Field>
          <Field label="Attempt Limit">
            <div className="flex items-center gap-2">
              <input type="number" value={settings.attemptLimit || ''} onChange={e => update({ attemptLimit: e.target.value ? parseInt(e.target.value) : null })}
                className="w-20 px-2 py-1 rounded border text-xs outline-none"
                style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
                min={1} placeholder="∞" />
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>attempts (leave blank for unlimited)</span>
            </div>
          </Field>
        </Section>

        <Section title="Access Control">
          <Field label="Access Mode">
            <select value={settings.accessMode} onChange={e => update({ accessMode: e.target.value as TestSettingsType['accessMode'] })}
              className="px-2.5 py-1.5 rounded border text-xs outline-none cursor-pointer"
              style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}>
              <option value="open">Open — anyone with the link</option>
              <option value="passcode">Passcode protected</option>
              <option value="whitelist-email">Email whitelist only</option>
              <option value="whitelist-id">Student ID list only</option>
            </select>
          </Field>
          {settings.accessMode === 'passcode' && (
            <Field label="Passcode">
              <input type="text" value={settings.passcode || ''} onChange={e => update({ passcode: e.target.value || null })}
                className="w-full px-2.5 py-1.5 rounded border text-xs outline-none font-mono"
                style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
                placeholder="Enter passcode" />
            </Field>
          )}
          {settings.accessMode === 'whitelist-email' && (
            <Field label="Allowed Emails (one per line)">
              <textarea value={settings.emailWhitelist.join('\n')} 
                onChange={e => update({ emailWhitelist: parseList(e.target.value) })}
                className="w-full px-2.5 py-1.5 rounded border text-xs outline-none resize-y font-mono"
                style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
                rows={4} placeholder="student@university.edu" />
            </Field>
          )}
          {settings.accessMode === 'whitelist-id' && (
            <Field label="Allowed Student IDs (one per line)">
              <textarea value={settings.studentIdList.join('\n')}
                onChange={e => update({ studentIdList: parseList(e.target.value) })}
                className="w-full px-2.5 py-1.5 rounded border text-xs outline-none resize-y font-mono"
                style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
                rows={4} placeholder="STU2024001" />
            </Field>
          )}
        </Section>

        <Section title="Display & Scoring">
          <Toggle label="Show results immediately after submission" checked={settings.showResults} onChange={v => update({ showResults: v })} />
          <Toggle label="Show correct answers and explanations after submission" checked={settings.showCorrectAnswers} onChange={v => update({ showCorrectAnswers: v })} />
          <Toggle label="Enable negative marking" checked={settings.negativeMarking} onChange={v => update({ negativeMarking: v })} />
          {settings.negativeMarking && (
            <Field label="Penalty per wrong answer (fraction of points)">
              <input type="number" value={settings.negativeMarkingPenalty} onChange={e => update({ negativeMarkingPenalty: parseFloat(e.target.value) || 0 })}
                className="w-20 px-2 py-1 rounded border text-xs outline-none"
                style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
                min={0} max={1} step={0.05} />
            </Field>
          )}
          <Toggle label="Allow blank submissions" checked={settings.allowBlankSubmissions} onChange={v => update({ allowBlankSubmissions: v })} />
          <Toggle label="One question per page" checked={settings.onePerPage} onChange={v => update({ onePerPage: v })} />
          <Toggle label="Shuffle questions" checked={settings.shuffleQuestions} onChange={v => update({ shuffleQuestions: v })} />
          <Toggle label="Shuffle answer options" checked={settings.shuffleOptions} onChange={v => update({ shuffleOptions: v })} />
        </Section>

        <Section title="Anti-Cheat Controls">
          <Toggle label="Tab-switch / window-blur detection" checked={settings.antiCheat.tabSwitchDetection} onChange={v => updateAC({ tabSwitchDetection: v })} />
          <Toggle label="Fullscreen enforcement" checked={settings.antiCheat.fullscreenEnforcement} onChange={v => updateAC({ fullscreenEnforcement: v })} />
          <Toggle label="Disable copy/paste" checked={settings.antiCheat.disableCopyPaste} onChange={v => updateAC({ disableCopyPaste: v })} />
          <Toggle label="Disable right-click context menu" checked={settings.antiCheat.disableRightClick} onChange={v => updateAC({ disableRightClick: v })} />
          <Toggle label="Disable text selection" checked={settings.antiCheat.disableTextSelection} onChange={v => updateAC({ disableTextSelection: v })} />
          <Toggle label="Watermark overlay with taker's name" checked={settings.antiCheat.watermark} onChange={v => updateAC({ watermark: v })} />
          <Toggle label="Prevent page refresh during attempt" checked={settings.antiCheat.preventRefresh} onChange={v => updateAC({ preventRefresh: v })} />
          <Toggle label="Resume control (paused attempts require owner approval)" checked={settings.antiCheat.resumeControl} onChange={v => updateAC({ resumeControl: v })} />
        </Section>

        <Section title="Notifications">
          <Toggle label="Email me when a new result is submitted" checked={settings.notifyOnSubmit} onChange={v => update({ notifyOnSubmit: v })} />
        </Section>

        <div className="flex gap-3 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <button onClick={save} className="flex items-center gap-2 px-4 py-2 rounded text-xs font-semibold border-none cursor-pointer"
            style={{ backgroundColor: 'var(--primary)', color: '#fff' }}>
            <Save size={12} /> {saving ? 'Saving…' : 'Save Settings'}
          </button>
          <Link to={`/test/${test.id}/edit`} className="px-4 py-2 rounded text-xs font-medium no-underline border"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
            Cancel
          </Link>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded border" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
      <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)' }}>
        <h2 className="text-xs font-semibold tracking-tight" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text)' }}>{title}</h2>
      </div>
      <div className="p-3 space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{label}</label>
      {children}
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer">
      <div className="relative">
        <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="sr-only" />
        <div className="w-7 h-4 rounded-full transition-colors" style={{ backgroundColor: checked ? 'var(--accent)' : 'var(--border)' }} />
        <div className="absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform" style={{ transform: checked ? 'translateX(12px)' : 'translateX(0)' }} />
      </div>
      <span className="text-xs" style={{ color: 'var(--text)' }}>{label}</span>
    </label>
  );
}

'use client';
import { useState } from 'react';
import { Globe, GitBranch, BriefcaseBusiness, Users } from 'lucide-react';
import { isValidLinkUrl } from '@/lib/validators';

interface LinksData {
  portfolio: string;
  github: string;
  linkedin: string;
  facebook: string;
}

interface LinksEditorProps {
  links: Partial<LinksData>;
  onSave: (links: LinksData) => Promise<{ success: boolean; message?: string }>;
  onCancel: () => void;
}

const PLATFORMS: { key: keyof LinksData; label: string; icon: any; placeholder: string }[] = [
  { key: 'portfolio', label: 'Portfolio', icon: Globe, placeholder: 'https://yourportfolio.com' },
  { key: 'github', label: 'GitHub', icon: GitBranch, placeholder: 'https://github.com/username' },
  { key: 'linkedin', label: 'LinkedIn', icon: BriefcaseBusiness, placeholder: 'https://linkedin.com/in/username' },
  { key: 'facebook', label: 'Facebook', icon: Users, placeholder: 'https://facebook.com/username' },
];

export default function LinksEditor({ links, onSave, onCancel }: LinksEditorProps) {
  const [form, setForm] = useState<LinksData>({
    portfolio: links.portfolio || '',
    github: links.github || '',
    linkedin: links.linkedin || '',
    facebook: links.facebook || '',
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSave = async () => {
    for (const platform of PLATFORMS) {
      if (!isValidLinkUrl(form[platform.key])) {
        setFormError(`${platform.label} link must start with http:// or https://`);
        return;
      }
    }
    setFormError('');
    setSaving(true);
    setMessage(null);
    const res = await onSave(form);
    setSaving(false);
    setMessage(
      res.success
        ? { type: 'success', text: 'Links saved.' }
        : { type: 'error', text: res.message || 'Failed to save links.' }
    );
  };

  return (
    <div>
      <div className="space-y-3">
        {PLATFORMS.map(({ key, label, icon: Icon, placeholder }) => (
          <div key={key} className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
              <Icon size={18} />
            </div>
            <input
              value={form[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              placeholder={placeholder}
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>
        ))}
      </div>

      {formError && <p className="mt-3 text-sm text-red-600">{formError}</p>}
      {message && (
        <p className={`mt-3 text-sm ${message.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>{message.text}</p>
      )}

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
        >
          {saving ? 'Saving...' : 'Save Links'}
        </button>
        <button type="button" onClick={onCancel} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
          Done
        </button>
      </div>
    </div>
  );
}
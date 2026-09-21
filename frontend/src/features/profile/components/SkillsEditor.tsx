'use client';
import { useState } from 'react';

interface SkillsEditorProps {
  skills: string[];
  onSave: (skills: string[]) => Promise<{ success: boolean; message?: string }>;
  onCancel: () => void;
}

export default function SkillsEditor({ skills, onSave, onCancel }: SkillsEditorProps) {
  const [localSkills, setLocalSkills] = useState<string[]>(skills);
  const [input, setInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const addSkill = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    if (localSkills.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      setInput('');
      return;
    }
    setLocalSkills([...localSkills, trimmed]);
    setInput('');
  };

  const removeSkill = (skill: string) => {
    setLocalSkills(localSkills.filter((s) => s !== skill));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    const res = await onSave(localSkills);
    setSaving(false);
    setMessage(
      res.success
        ? { type: 'success', text: 'Skills updated.' }
        : { type: 'error', text: res.message || 'Failed to update skills.' }
    );
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {localSkills.length === 0 && <p className="text-sm text-slate-400">No skills added yet.</p>}
        {localSkills.map((skill) => (
          <span
            key={skill}
            className="flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700"
          >
            {skill}
            <button
              type="button"
              onClick={() => removeSkill(skill)}
              className="text-indigo-400 hover:text-indigo-700"
              aria-label={`Remove ${skill}`}
            >
              ×
            </button>
          </span>
        ))}
      </div>

      <div className="mt-4 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addSkill();
            }
          }}
          placeholder="Add a skill and press Enter"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />
        <button
          type="button"
          onClick={addSkill}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Add
        </button>
      </div>

      {message && (
        <p className={`mt-3 text-sm ${message.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>
          {message.text}
        </p>
      )}

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
        >
          {saving ? 'Saving...' : 'Save Skills'}
        </button>
        <button type="button" onClick={onCancel} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
          Done
        </button>
      </div>
    </div>
  );
}
'use client';
import { useState } from 'react';
import { formatMonth } from '@/lib/dateUtils';

interface Experience {
  title: string;
  company: string;
  from: string;
  to: string;
  description: string;
}

interface ExperienceEditorProps {
  experiences: Experience[];
  onSave: (experiences: Experience[]) => Promise<{ success: boolean; message?: string }>;
  onCancel: () => void;
}

const emptyForm: Experience = { title: '', company: '', from: '', to: '', description: '' };

export default function ExperienceEditor({ experiences, onSave, onCancel }: ExperienceEditorProps) {
  const [localExperiences, setLocalExperiences] = useState<Experience[]>(experiences);
  const [form, setForm] = useState<Experience>(emptyForm);
  const [isCurrent, setIsCurrent] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [formError, setFormError] = useState('');

  const resetForm = () => {
    setForm(emptyForm);
    setIsCurrent(false);
    setEditingIndex(null);
    setFormError('');
    setShowForm(false);
  };

  const handleAddOrUpdate = () => {
    if (!form.title.trim() || !form.company.trim() || !form.from) {
      setFormError('Title, company, and start date are required.');
      return;
    }
    const entry = { ...form, to: isCurrent ? '' : form.to };
    setFormError('');
    if (editingIndex !== null) {
      const updated = [...localExperiences];
      updated[editingIndex] = entry;
      setLocalExperiences(updated);
    } else {
      setLocalExperiences([...localExperiences, entry]);
    }
    resetForm();
  };

  const handleEdit = (index: number) => {
    const exp = localExperiences[index];
    setForm(exp);
    setIsCurrent(!exp.to);
    setEditingIndex(index);
    setFormError('');
    setShowForm(true);
  };

  const handleRemove = (index: number) => {
    setLocalExperiences(localExperiences.filter((_, i) => i !== index));
    if (editingIndex === index) resetForm();
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    const res = await onSave(localExperiences);
    setSaving(false);
    setMessage(
      res.success
        ? { type: 'success', text: 'Experience saved.' }
        : { type: 'error', text: res.message || 'Failed to save experience.' }
    );
  };

  return (
    <div>
      <div className="space-y-4">
        {localExperiences.length === 0 && !showForm && <p className="text-sm text-slate-400">No experience added yet.</p>}
        {localExperiences.map((exp, index) => (
          <div key={index} className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 p-4">
            <div className="flex gap-3">
              <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-100 text-sm font-bold text-slate-500">
                {exp.company.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-slate-900">{exp.title}</p>
                <p className="text-sm text-slate-600">{exp.company}</p>
                <p className="text-xs text-slate-400">
                  {formatMonth(exp.from)} — {formatMonth(exp.to)}
                </p>
                {exp.description && <p className="mt-1.5 text-sm text-slate-500">{exp.description}</p>}
              </div>
            </div>
            <div className="flex shrink-0 gap-2 text-sm">
              <button type="button" onClick={() => handleEdit(index)} className="text-indigo-600 hover:underline">
                Edit
              </button>
              <button type="button" onClick={() => handleRemove(index)} className="text-red-600 hover:underline">
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      {showForm ? (
        <div className="mt-4 rounded-lg border border-dashed border-slate-300 p-4">
          <p className="mb-3 text-sm font-medium text-slate-700">{editingIndex !== null ? 'Edit experience' : 'Add experience'}</p>
          {formError && <p className="mb-2 text-sm text-red-600">{formError}</p>}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Job title"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
            <input
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              placeholder="Company"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Start date</label>
              <input
                type="month"
                value={form.from}
                onChange={(e) => setForm({ ...form, from: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">End date</label>
              <input
                type="month"
                value={form.to}
                disabled={isCurrent}
                onChange={(e) => setForm({ ...form, to: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100 disabled:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
              <label className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500">
                <input type="checkbox" checked={isCurrent} onChange={(e) => setIsCurrent(e.target.checked)} className="rounded border-slate-300" />
                I currently work here
              </label>
            </div>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Description (optional)"
              rows={2}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 sm:col-span-2"
            />
          </div>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={handleAddOrUpdate} className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900">
              {editingIndex !== null ? 'Update Entry' : 'Add Entry'}
            </button>
            <button type="button" onClick={resetForm} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="mt-4 rounded-lg border border-dashed border-slate-300 px-4 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50"
        >
          + Add another experience
        </button>
      )}

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
          {saving ? 'Saving...' : 'Save Experience'}
        </button>
        <button type="button" onClick={onCancel} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
          Done
        </button>
      </div>
    </div>
  );
}
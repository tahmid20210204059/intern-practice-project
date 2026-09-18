'use client';
import { useState } from 'react';
import { formatMonth } from '@/lib/dateUtils';
import { educationItemSchema } from '@/lib/schemas';

interface EducationItem {
  degree: string;
  institute: string;
  subject: string;
  from: string;
  to: string;
}

interface EducationEditorProps {
  education: EducationItem[];
  onSave: (education: EducationItem[]) => Promise<{ success: boolean; message?: string }>;
  onCancel: () => void;
}

const emptyForm: EducationItem = { degree: '', institute: '', subject: '', from: '', to: '' };

export default function EducationEditor({ education, onSave, onCancel }: EducationEditorProps) {
  const [localEducation, setLocalEducation] = useState<EducationItem[]>(education);
  const [form, setForm] = useState<EducationItem>(emptyForm);
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
    const entry = { ...form, to: isCurrent ? '' : form.to };
    const parsed = educationItemSchema.safeParse(entry);

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      setFormError(issue?.message || 'Please check the education details.');
      return;
    }

    setFormError('');
    if (editingIndex !== null) {
      const updated = [...localEducation];
      updated[editingIndex] = parsed.data;
      setLocalEducation(updated);
    } else {
      setLocalEducation([...localEducation, parsed.data]);
    }
    resetForm();
  };

  const handleEdit = (index: number) => {
    const edu = localEducation[index];
    setForm(edu);
    setIsCurrent(!edu.to);
    setEditingIndex(index);
    setFormError('');
    setShowForm(true);
  };

  const handleRemove = (index: number) => {
    setLocalEducation(localEducation.filter((_, i) => i !== index));
    if (editingIndex === index) resetForm();
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    const res = await onSave(localEducation);
    setSaving(false);
    setMessage(
      res.success
        ? { type: 'success', text: 'Education saved.' }
        : { type: 'error', text: res.message || 'Failed to save education.' }
    );
  };

  return (
    <div>
      <div className="space-y-4">
        {localEducation.length === 0 && !showForm && <p className="text-sm text-slate-400">No education added yet.</p>}
        {localEducation.map((edu, index) => (
          <div key={index} className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 p-4">
            <div className="flex gap-3">
              <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-100 text-sm font-bold text-slate-500">
                {edu.institute.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-slate-900">{edu.degree}</p>
                <p className="text-sm text-slate-600">{edu.institute}</p>
                {edu.subject && <p className="text-sm text-slate-500">{edu.subject}</p>}
                <p className="text-xs text-slate-400">
                  {formatMonth(edu.from)} — {formatMonth(edu.to)}
                </p>
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
          <p className="mb-3 text-sm font-medium text-slate-700">{editingIndex !== null ? 'Edit education' : 'Add education'}</p>
          {formError && <p className="mb-2 text-sm text-red-600">{formError}</p>}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              value={form.degree}
              onChange={(e) => setForm({ ...form, degree: e.target.value })}
              placeholder="Degree (e.g. B.Sc in CSE)"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
            <input
              value={form.institute}
              onChange={(e) => setForm({ ...form, institute: e.target.value })}
              placeholder="Institute / University"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
            <input
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              placeholder="Field of study (optional)"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 sm:col-span-2"
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
              {formError && formError.includes('End date') && <p className="mt-1 text-xs text-red-600">{formError}</p>}
              <label className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500">
                <input type="checkbox" checked={isCurrent} onChange={(e) => setIsCurrent(e.target.checked)} className="rounded border-slate-300" />
                I currently study here
              </label>
            </div>
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
          + Add education
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
          {saving ? 'Saving...' : 'Save Education'}
        </button>
        <button type="button" onClick={onCancel} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
          Done
        </button>
      </div>
    </div>
  );
}
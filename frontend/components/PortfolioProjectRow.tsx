'use client';
import { useState } from 'react';
import { useFieldArray, useWatch, type Control, type UseFormRegister } from 'react-hook-form';
import type { PortfolioFormValues } from '@/lib/schemas';

interface PortfolioProjectRowProps {
  control: Control<PortfolioFormValues>;
  register: UseFormRegister<PortfolioFormValues>;
  index: number;
  errors: any;
  onRemove: () => void;
}

export default function PortfolioProjectRow({ control, register, index, errors, onRemove }: PortfolioProjectRowProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [techInput, setTechInput] = useState('');

  const isCurrent = useWatch({ control, name: `portfolioProjects.${index}.isCurrent` });

  const {
    fields: techFields,
    append: appendTech,
    remove: removeTech,
  } = useFieldArray({ control, name: `portfolioProjects.${index}.technologies` });

  const projectErrors = errors?.portfolioProjects?.[index];

  const handleAddTech = () => {
    const trimmed = techInput.trim();
    if (!trimmed) return;
    appendTech({ value: trimmed });
    setTechInput('');
  };

  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-slate-700">Project {index + 1}</p>

        {!confirmingDelete ? (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="text-sm font-medium text-red-600 hover:underline"
          >
            Remove
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-red-600">Remove this project?</span>
            <button
              type="button"
              onClick={onRemove}
              className="rounded-lg bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700"
            >
              Confirm
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              className="rounded-lg border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-slate-500">Project title</label>
          <input
            {...register(`portfolioProjects.${index}.title`)}
            placeholder="e.g. Dev Community Platform"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
          {projectErrors?.title && <p className="mt-1 text-xs text-red-600">{projectErrors.title.message}</p>}
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-slate-500">Description</label>
          <textarea
            {...register(`portfolioProjects.${index}.description`)}
            rows={2}
            maxLength={500}
            placeholder="What does this project do?"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
          {projectErrors?.description && (
            <p className="mt-1 text-xs text-red-600">{projectErrors.description.message}</p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Live URL</label>
          <input
            {...register(`portfolioProjects.${index}.urls.live`)}
            placeholder="https://example.com"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
          {projectErrors?.urls?.live && (
            <p className="mt-1 text-xs text-red-600">{projectErrors.urls.live.message}</p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">GitHub URL</label>
          <input
            {...register(`portfolioProjects.${index}.urls.github`)}
            placeholder="https://github.com/username/repo"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
          {projectErrors?.urls?.github && (
            <p className="mt-1 text-xs text-red-600">{projectErrors.urls.github.message}</p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Start date</label>
          <input
            type="month"
            {...register(`portfolioProjects.${index}.from`)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
          {projectErrors?.from && <p className="mt-1 text-xs text-red-600">{projectErrors.from.message}</p>}
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">End date</label>
          <input
            type="month"
            disabled={!!isCurrent}
            {...register(`portfolioProjects.${index}.to`)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100 disabled:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
          {projectErrors?.to && <p className="mt-1 text-xs text-red-600">{projectErrors.to.message}</p>}
          <label className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500">
            <input
              type="checkbox"
              {...register(`portfolioProjects.${index}.isCurrent`)}
              className="rounded border-slate-300"
            />
            This project is ongoing
          </label>
        </div>
      </div>

      <div className="mt-3">
        <label className="mb-1 block text-xs font-medium text-slate-500">Tools</label>
        <div className="flex flex-wrap gap-2">
          {techFields.map((field, techIndex) => (
            <span
              key={field.id}
              className="flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700"
            >
              {field.value}
              <button
                type="button"
                onClick={() => removeTech(techIndex)}
                className="text-indigo-400 hover:text-indigo-700"
                aria-label={`Remove ${field.value}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <input
            value={techInput}
            onChange={(e) => setTechInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddTech();
              }
            }}
            placeholder="Add a tool and press Enter"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
          <button
            type="button"
            onClick={handleAddTech}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Add
          </button>
        </div>
        {projectErrors?.technologies?.message && (
          <p className="mt-1 text-xs text-red-600">{projectErrors.technologies.message}</p>
        )}
      </div>
    </div>
  );
}
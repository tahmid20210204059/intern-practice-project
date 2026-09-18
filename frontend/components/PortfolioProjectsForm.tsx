'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiCall } from '@/lib/api';
import { portfolioFormSchema, PortfolioFormValues } from '@/lib/schemas';
import { mapApiToPortfolioForm, mapPortfolioFormToApi, emptyProject, ProfileApiData } from '@/lib/profileTransform';
import PortfolioProjectRow from './PortfolioProjectRow';

const DEFAULT_VALUES: PortfolioFormValues = {
  portfolioProjects: [],
};

export default function PortfolioProjectsForm() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<PortfolioFormValues>({
    resolver: zodResolver(portfolioFormSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['profile', 'me'],
    queryFn: async () => {
      const res = await apiCall<ProfileApiData>('/profile/me');
      if (!res.success) throw new Error(res.message || 'Failed to load portfolio');
      return res.data;
    },
  });

  useEffect(() => {
    if (data) {
      reset(mapApiToPortfolioForm(data));
    }
  }, [data, reset]);

  const {
    fields: projectFields,
    append: appendProject,
    remove: removeProject,
  } = useFieldArray({ control, name: 'portfolioProjects' });

  const mutation = useMutation({
    mutationFn: async (values: PortfolioFormValues) => {
      const payload = mapPortfolioFormToApi(values);
      const res = await apiCall<ProfileApiData>('/profile/me', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      if (!res.success) {
        const err = new Error(res.message || 'Failed to save portfolio') as Error & { details?: string[] };
        err.details = res.errors;
        throw err;
      }
      return res.data;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(['profile', 'me'], updated);
      reset(mapApiToPortfolioForm(updated));
      setTimeout(() => router.push('/profile/me'), 900);
    },
  });

  const onSubmit = (values: PortfolioFormValues) => {
    mutation.reset();
    mutation.mutate(values);
  };

  if (isLoading) {
    return <p className="text-sm text-slate-500">Loading your portfolio...</p>;
  }

  if (isError) {
    return (
      <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
        {(error as Error).message || 'Failed to load portfolio.'}
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {mutation.isSuccess && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-600">
          Portfolio saved. Taking you back to your profile...
        </p>
      )}
      {mutation.isError && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          <p>{(mutation.error as Error).message}</p>
          {(mutation.error as Error & { details?: string[] }).details?.length ? (
            <ul className="mt-1 list-disc pl-5">
              {(mutation.error as Error & { details?: string[] }).details!.map((msg, i) => (
                <li key={i}>{msg}</li>
              ))}
            </ul>
          ) : null}
        </div>
      )}

      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Projects</h2>
            <p className="mt-0.5 text-sm text-slate-500">Add the work you want other developers to see.</p>
          </div>
          <button
            type="button"
            onClick={() => appendProject(emptyProject())}
            className="rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50"
          >
            + Add project
          </button>
        </div>

        {errors.portfolioProjects?.message && (
          <p className="mt-2 text-xs text-red-600">{errors.portfolioProjects.message}</p>
        )}

        <div className="mt-4 space-y-4">
          {projectFields.length === 0 && (
            <p className="text-sm text-slate-400">No portfolio projects added yet.</p>
          )}
          {projectFields.map((field, index) => (
            <PortfolioProjectRow
              key={field.id}
              control={control}
              register={register}
              index={index}
              errors={errors}
              onRemove={() => removeProject(index)}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={mutation.isPending}
          className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
        >
          {mutation.isPending ? 'Saving...' : 'Save Portfolio'}
        </button>
        {isDirty && !mutation.isPending && (
          <span className="text-xs text-slate-400">You have unsaved changes.</span>
        )}
      </div>
    </form>
  );
}
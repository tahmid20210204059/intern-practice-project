'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Globe, GitBranch, Pencil, CalendarDays, Clock, CheckCircle2 } from 'lucide-react';
import { apiCall } from '@/lib/http/client';
import Navbar from '@/components/layout/Navbar';
import { formatMonth } from '@/features/profile/utils/dateUtils';

export default function PortfolioProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const index = Number(params.index);
  const isOwnProfile = id === 'me';

  const [viewer, setViewer] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      const me = await apiCall('/users/me');
      if (!me.success) {
        router.push('/login');
        return;
      }
      setViewer(me.data);

      if (isOwnProfile) {
        setProfile(me.data);
        setLoading(false);
        return;
      }

      const res = await apiCall(`/users/${id}`);
      if (!res.success) {
        setError(res.message || 'Could not load this profile.');
        setLoading(false);
        return;
      }
      setProfile(res.data);
      setLoading(false);
    };
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm font-medium text-slate-500">Loading project...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50">
        {viewer && <Navbar name={viewer.name} role={viewer.role} avatarUrl={viewer.avatarUrl} />}
        <div className="mx-auto max-w-2xl px-6 py-16 text-center">
          <p className="text-lg font-semibold text-slate-900">Profile unavailable</p>
          <p className="mt-2 text-sm text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  const project = Number.isInteger(index) ? profile.portfolioProjects?.[index] : undefined;
  const profileHref = `/profile/${id}`;

  if (!project) {
    return (
      <div className="min-h-screen bg-slate-50">
        {viewer && <Navbar name={viewer.name} role={viewer.role} avatarUrl={viewer.avatarUrl} />}
        <main className="mx-auto max-w-2xl px-6 py-16 text-center">
          <p className="text-lg font-semibold text-slate-900">Project not found</p>
          <p className="mt-2 text-sm text-slate-500">This project may have been removed or the link is incorrect.</p>
          <Link href={profileHref} className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:underline">
            <ArrowLeft size={15} />
            Back to profile
          </Link>
        </main>
      </div>
    );
  }

  const isCurrent = !!project.isCurrent;

  return (
    <div className="min-h-screen bg-slate-50">
      {viewer && <Navbar name={viewer.name} role={viewer.role} avatarUrl={viewer.avatarUrl} />}

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Link href={profileHref} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-indigo-600">
          <ArrowLeft size={15} />
          Back to profile
        </Link>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900">{project.title}</h1>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                    isCurrent ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-600'
                  }`}
                >
                  {isCurrent ? <Clock size={12} /> : <CheckCircle2 size={12} />}
                  {isCurrent ? 'Ongoing' : 'Completed'}
                </span>
              </div>
              <p className="mt-1.5 flex items-center gap-1.5 text-sm text-slate-500">
                <CalendarDays size={14} />
                {formatMonth(project.from)} — {isCurrent ? 'Present' : formatMonth(project.to)}
              </p>
            </div>

            {isOwnProfile && (
              <Link
                href="/profile/edit"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <Pencil size={14} />
                Edit
              </Link>
            )}
          </div>

          {(project.urls?.live || project.urls?.github) && (
            <div className="mt-5 flex flex-wrap gap-3">
              {project.urls?.live && (
                <a
                  href={project.urls.live}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  <Globe size={16} />
                  View Live
                </a>
              )}
              {project.urls?.github && (
                <a
                  href={project.urls.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <GitBranch size={16} />
                  View Source
                </a>
              )}
            </div>
          )}

          <div className="mt-8">
            <h2 className="text-base font-semibold text-slate-900">Overview</h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-600">
              {project.description || 'No description provided for this project.'}
            </p>
          </div>

          {project.technologies?.length > 0 && (
            <div className="mt-8">
              <h2 className="text-base font-semibold text-slate-900">Tools &amp; technologies</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {project.technologies.map((tech: string) => (
                  <span key={tech} className="rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700">
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

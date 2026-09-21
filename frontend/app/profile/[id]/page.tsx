'use client';
import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Globe,
  GitBranch,
  BriefcaseBusiness,
  Users,
  Pencil,
  Trash2,
  Camera,
  Briefcase,
  GraduationCap,
  Sparkles,
  FolderGit2,
  Link2,
  ShieldCheck,
  Mail,
  ArrowUpRight,
  FileText,
} from 'lucide-react';
import { apiCall, apiUpload } from '@/lib/api';
import Navbar from '@/components/Navbar';
import SkillsEditor from '@/components/SkillsEditor';
import ExperienceEditor from '@/components/ExperienceEditor';
import EducationEditor from '@/components/EducationEditor';
import LinksEditor from '@/components/LinksEditor';
import ChangePasswordForm from '@/components/ChangePasswordForm';
import ProfilePosts from '@/components/ProfilePosts';
import { formatMonth } from '@/lib/dateUtils';

type Section = 'about' | 'skills' | 'experience' | 'education' | 'links' | 'security' | null;

const LINK_PLATFORMS: { key: 'portfolio' | 'github' | 'linkedin' | 'facebook'; label: string; icon: any }[] = [
  { key: 'portfolio', label: 'Portfolio', icon: Globe },
  { key: 'github', label: 'GitHub', icon: GitBranch },
  { key: 'linkedin', label: 'LinkedIn', icon: BriefcaseBusiness },
  { key: 'facebook', label: 'Facebook', icon: Users },
];

const NAV_ITEMS: { id: string; label: string }[] = [
  { id: 'about', label: 'About' },
  { id: 'experience', label: 'Experience' },
  { id: 'education', label: 'Education' },
  { id: 'skills', label: 'Skills' },
  { id: 'portfolio', label: 'Portfolio' },
  { id: 'links', label: 'Links' },
  { id: 'posts', label: 'Posts' },
];

function SectionCard({
  id,
  icon: Icon,
  title,
  description,
  action,
  children,
}: {
  id: string;
  icon: any;
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
            <Icon size={18} />
          </span>
          <div>
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
          </div>
        </div>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const isOwnProfile = id === 'me';

  const [viewer, setViewer] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingSection, setEditingSection] = useState<Section>(null);

  const [aboutForm, setAboutForm] = useState({ name: '', headline: '', bio: '', avatarUrl: '' });
  const [aboutSaving, setAboutSaving] = useState(false);
  const [aboutMessage, setAboutMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);

  const isAdmin = viewer?.role === 'admin';
  const canEdit = isOwnProfile || isAdmin;
  const canDelete = isAdmin && !isOwnProfile;

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
        setAboutForm({ name: me.data.name, headline: me.data.headline || '', bio: me.data.bio || '', avatarUrl: me.data.avatarUrl || '' });
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
      setAboutForm({ name: res.data.name, headline: res.data.headline || '', bio: res.data.bio || '', avatarUrl: res.data.avatarUrl || '' });
      setLoading(false);
    };
    load();
  }, [id]);

  const handleAvatarPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setAboutMessage({ type: 'error', text: 'Please select an image file.' });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setAboutMessage({ type: 'error', text: 'Image must be smaller than 2MB.' });
      return;
    }

    setAboutMessage(null);
    setAvatarUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiUpload<{ url: string }>('/uploads/avatar', formData);
    setAvatarUploading(false);

    if (res.success) {
      setAboutForm((prev) => ({ ...prev, avatarUrl: res.data.url }));
    } else {
      setAboutMessage({ type: 'error', text: res.message || 'Failed to upload image.' });
    }
  };

  const handleAboutSave = async () => {
    setAboutSaving(true);
    setAboutMessage(null);
    const endpoint = isOwnProfile ? '/users/me' : `/users/${id}`;
    const res = await apiCall(endpoint, { method: 'PATCH', body: JSON.stringify(aboutForm) });
    setAboutSaving(false);
    if (res.success) {
      setProfile(res.data);
      setAboutMessage({ type: 'success', text: 'Profile updated.' });
      setEditingSection(null);
    } else {
      setAboutMessage({ type: 'error', text: res.message || 'Failed to update profile.' });
    }
  };

  const handleSkillsSave = async (skills: string[]) => {
    const endpoint = isOwnProfile ? '/users/me/skills' : `/users/${id}`;
    const res = await apiCall(endpoint, { method: 'PATCH', body: JSON.stringify({ skills }) });
    if (res.success) setProfile(res.data);
    return { success: res.success, message: res.success ? undefined : res.message };
  };

  const handleExperiencesSave = async (experiences: any[]) => {
    const endpoint = isOwnProfile ? '/users/me/experiences' : `/users/${id}`;
    const res = await apiCall(endpoint, { method: 'PATCH', body: JSON.stringify({ experiences }) });
    if (res.success) setProfile(res.data);
    return { success: res.success, message: res.success ? undefined : res.message };
  };

  const handleEducationSave = async (education: any[]) => {
    const endpoint = isOwnProfile ? '/users/me/education' : `/users/${id}`;
    const res = await apiCall(endpoint, { method: 'PATCH', body: JSON.stringify({ education }) });
    if (res.success) setProfile(res.data);
    return { success: res.success, message: res.success ? undefined : res.message };
  };

  const handleLinksSave = async (links: any) => {
    const endpoint = isOwnProfile ? '/users/me/links' : `/users/${id}`;
    const res = await apiCall(endpoint, { method: 'PATCH', body: JSON.stringify({ links }) });
    if (res.success) setProfile(res.data);
    return { success: res.success, message: res.success ? undefined : res.message };
  };

  const handleDeleteProfile = async () => {
    setDeleting(true);
    setDeleteError('');
    const res = await apiCall(`/users/${id}`, { method: 'DELETE' });
    setDeleting(false);
    if (res.success) {
      router.push('/dashboard/admin');
      return;
    }
    setDeleteError(res.message || 'Failed to delete this profile.');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm font-medium text-slate-500">Loading profile...</p>
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

  const activeLinks = LINK_PLATFORMS.filter((p) => profile.links?.[p.key]);
  const joinedLabel = profile.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null;

  return (
    <div className="min-h-screen bg-slate-50">
      {viewer && <Navbar name={viewer.name} role={viewer.role} avatarUrl={viewer.avatarUrl} />}

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div id="about" className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div
            className="relative h-32 bg-slate-900 sm:h-40"
            style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.08) 1px, transparent 0)', backgroundSize: '18px 18px' }}
          >
            <div className="absolute inset-x-0 bottom-0 h-px bg-indigo-500/50" />
          </div>

          <div className="px-6 pb-6 sm:px-8">
            <div className="-mt-12 flex flex-wrap items-end justify-between gap-4 sm:-mt-14">
              <div className="relative">
                {(editingSection === 'about' ? aboutForm.avatarUrl : profile.avatarUrl) ? (
                  <img
                    src={editingSection === 'about' ? aboutForm.avatarUrl : profile.avatarUrl}
                    alt={profile.name}
                    className="h-24 w-24 rounded-full border-4 border-white object-cover shadow-sm sm:h-28 sm:w-28"
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-white bg-slate-900 text-3xl font-semibold text-white shadow-sm sm:h-28 sm:w-28">
                    {profile.name?.charAt(0).toUpperCase()}
                  </div>
                )}
                {canEdit && editingSection === 'about' && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={avatarUploading}
                    className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-slate-900 text-white shadow hover:bg-slate-800 disabled:opacity-60"
                    aria-label="Change photo"
                  >
                    <Camera size={14} />
                  </button>
                )}
                {avatarUploading && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 text-[11px] font-medium text-white">
                    Uploading...
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarPick}
                  disabled={avatarUploading}
                  className="hidden"
                />
              </div>

              <div className="flex items-center gap-2 pb-1">
                {canEdit && editingSection !== 'about' && (
                  <button
                    type="button"
                    onClick={() => setEditingSection('about')}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <Pencil size={14} />
                    Edit Profile
                  </button>
                )}
                {canDelete && !showDeleteConfirm && (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-4 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    <Trash2 size={14} />
                    Delete Profile
                  </button>
                )}
                {canDelete && showDeleteConfirm && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-red-600">Delete this profile?</span>
                    <button
                      type="button"
                      onClick={handleDeleteProfile}
                      disabled={deleting}
                      className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                    >
                      {deleting ? 'Deleting...' : 'Confirm'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>

            {deleteError && <p className="mt-3 text-sm text-red-600">{deleteError}</p>}

            {editingSection === 'about' ? (
              <div className="mt-4 max-w-xl space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">Full name</label>
                  <input
                    value={aboutForm.name}
                    onChange={(e) => setAboutForm({ ...aboutForm, name: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">Headline</label>
                  <input
                    value={aboutForm.headline}
                    onChange={(e) => setAboutForm({ ...aboutForm, headline: e.target.value })}
                    maxLength={120}
                    placeholder="e.g. Full-stack Developer | React & NestJS"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">Bio</label>
                  <textarea
                    value={aboutForm.bio}
                    onChange={(e) => setAboutForm({ ...aboutForm, bio: e.target.value })}
                    rows={3}
                    maxLength={300}
                    placeholder="A short professional summary about yourself..."
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  />
                  <p className="mt-1 text-right text-xs text-slate-400">{aboutForm.bio.length}/300</p>
                </div>
                {aboutMessage && (
                  <p className={`text-sm ${aboutMessage.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>{aboutMessage.text}</p>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleAboutSave}
                    disabled={aboutSaving || avatarUploading}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                  >
                    {aboutSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingSection(null);
                      setAboutForm({ name: profile.name, headline: profile.headline || '', bio: profile.bio || '', avatarUrl: profile.avatarUrl || '' });
                      setAboutMessage(null);
                    }}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <h1 className="text-xl font-semibold text-slate-900">{profile.name}</h1>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                      profile.role === 'admin' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-indigo-200 bg-indigo-50 text-indigo-700'
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${profile.role === 'admin' ? 'bg-emerald-500' : 'bg-indigo-500'}`} />
                    {profile.role === 'admin' ? 'Admin' : 'User'}
                  </span>
                </div>

                {profile.headline ? (
                  <p className="mt-1 text-sm font-medium text-slate-600">{profile.headline}</p>
                ) : (
                  isOwnProfile && (
                    <button
                      type="button"
                      onClick={() => setEditingSection('about')}
                      className="mt-1 text-sm font-medium text-indigo-600 hover:underline"
                    >
                      + Add a professional headline
                    </button>
                  )
                )}

                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-900">
                  <span className="inline-flex items-center gap-1">
                    <Mail size={13} />
                    {profile.email}
                  </span>
                  {joinedLabel && <span>Joined {joinedLabel}</span>}
                </div>

                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-900">
                  {profile.bio || (isOwnProfile ? 'Add a short bio to tell others about yourself.' : 'No bio provided.')}
                </p>

                {activeLinks.length > 0 && (
                  <div className="mt-4 flex gap-2">
                    {activeLinks.map(({ key, label, icon: Icon }) => (
                      <a
                        key={key}
                        href={profile.links?.[key] ?? '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={label}
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-indigo-300 hover:text-indigo-600"
                      >
                        <Icon size={16} />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 lg:grid lg:grid-cols-[180px_1fr] lg:items-start lg:gap-8">
          <nav className="hidden lg:sticky lg:top-20 lg:block">
            <ul className="space-y-1 text-sm">
              {NAV_ITEMS.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      const target = document.getElementById(item.id);
                      if (target) {
                        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }
                    }}
                    className="block w-full rounded-lg px-3 py-1.5 text-left font-medium text-slate-900 hover:bg-white hover:text-slate-900"
                  >
                    {item.label}
                  </button>
                </li>
              ))}
              {isOwnProfile && (
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      const target = document.getElementById('security');
                      if (target) {
                        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }
                    }}
                    className="block w-full rounded-lg px-3 py-1.5 text-left font-medium text-slate-900 hover:bg-white hover:text-slate-900"
                  >
                    Security
                  </button>
                </li>
              )}
            </ul>
          </nav>

          <div className="mt-6 space-y-6 lg:mt-0">
            <SectionCard
              id="experience"
              icon={Briefcase}
              title="Experience"
              action={
                canEdit &&
                editingSection !== 'experience' && (
                  <button type="button" onClick={() => setEditingSection('experience')} className="text-sm font-medium text-indigo-600 hover:underline">
                    Edit
                  </button>
                )
              }
            >
              {editingSection === 'experience' ? (
                <ExperienceEditor experiences={profile.experiences || []} onSave={handleExperiencesSave} onCancel={() => setEditingSection(null)} />
              ) : profile.experiences?.length ? (
                <div className="space-y-6 border-l border-slate-200 pl-6">
                  {profile.experiences.map((exp: any, i: number) => (
                    <div key={i} className="relative">
                      <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-indigo-600 bg-white" />
                      <p className="font-semibold text-slate-900">{exp.title}</p>
                      <p className="text-sm text-slate-900">{exp.company}</p>
                      <p className="text-xs text-slate-900">
                        {formatMonth(exp.from)} — {formatMonth(exp.to)}
                      </p>
                      {exp.description && <p className="mt-1.5 text-sm text-slate-900">{exp.description}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">{isOwnProfile ? "You haven't added any experience yet." : 'No experience added yet.'}</p>
              )}
            </SectionCard>

            <SectionCard
              id="education"
              icon={GraduationCap}
              title="Education"
              action={
                canEdit &&
                editingSection !== 'education' && (
                  <button type="button" onClick={() => setEditingSection('education')} className="text-sm font-medium text-indigo-600 hover:underline">
                    Edit
                  </button>
                )
              }
            >
              {editingSection === 'education' ? (
                <EducationEditor education={profile.education || []} onSave={handleEducationSave} onCancel={() => setEditingSection(null)} />
              ) : profile.education?.length ? (
                <div className="space-y-6 border-l border-slate-200 pl-6">
                  {profile.education.map((edu: any, i: number) => (
                    <div key={i} className="relative">
                      <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-indigo-600 bg-white" />
                      <p className="font-semibold text-slate-900">{edu.degree}</p>
                      <p className="text-sm text-slate-900">{edu.institute}</p>
                      {edu.subject && <p className="text-sm text-slate-900">{edu.subject}</p>}
                      <p className="text-xs text-slate-900">
                        {formatMonth(edu.from)} — {formatMonth(edu.to)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">{isOwnProfile ? "You haven't added any education yet." : 'No education added yet.'}</p>
              )}
            </SectionCard>

            <SectionCard
              id="skills"
              icon={Sparkles}
              title="Skills"
              action={
                canEdit &&
                editingSection !== 'skills' && (
                  <button type="button" onClick={() => setEditingSection('skills')} className="text-sm font-medium text-indigo-600 hover:underline">
                    Edit
                  </button>
                )
              }
            >
              {editingSection === 'skills' ? (
                <SkillsEditor skills={profile.skills || []} onSave={handleSkillsSave} onCancel={() => setEditingSection(null)} />
              ) : profile.skills?.length ? (
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((skill: string) => (
                    <span key={skill} className="rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700">
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">{isOwnProfile ? "You haven't added any skills yet." : 'No skills added yet.'}</p>
              )}
            </SectionCard>

            <SectionCard
              id="portfolio"
              icon={FolderGit2}
              title="Portfolio"
              description="Click a project to view full details."
              action={
                isOwnProfile && (
                  <Link href="/profile/edit" className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:underline">
                    Manage projects
                    <ArrowUpRight size={14} />
                  </Link>
                )
              }
            >
              {profile.portfolioProjects?.length ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {profile.portfolioProjects.map((project: any, i: number) => (
                    <div
                      key={i}
                      onClick={() => router.push(`/profile/${id}/portfolio/${i}`)}
                      className="cursor-pointer rounded-xl border border-slate-200 p-4 transition hover:border-indigo-300 hover:shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-900">{project.title}</p>
                          <p className="text-xs text-slate-900">
                            {formatMonth(project.from)} — {project.isCurrent ? 'Present' : formatMonth(project.to)}
                          </p>
                        </div>
                        <div onClick={(e) => e.stopPropagation()} className="flex shrink-0 gap-2">
                          {project.urls?.live && (
                            <a
                              href={project.urls.live}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Live"
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600"
                            >
                              <Globe size={15} />
                            </a>
                          )}
                          {project.urls?.github && (
                            <a
                              href={project.urls.github}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="GitHub"
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600"
                            >
                              <GitBranch size={15} />
                            </a>
                          )}
                        </div>
                      </div>
                      {project.description && <p className="mt-2 line-clamp-3 text-sm text-slate-900">{project.description}</p>}
                      {project.technologies?.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {project.technologies.map((tech: string) => (
                            <span key={tech} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                              {tech}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">
                  {isOwnProfile ? "You haven't added any portfolio projects yet." : 'No portfolio projects added yet.'}
                </p>
              )}
            </SectionCard>

            <SectionCard
              id="links"
              icon={Link2}
              title="Links"
              action={
                canEdit &&
                editingSection !== 'links' && (
                  <button type="button" onClick={() => setEditingSection('links')} className="text-sm font-medium text-indigo-600 hover:underline">
                    Edit
                  </button>
                )
              }
            >
              {editingSection === 'links' ? (
                <LinksEditor links={profile.links || {}} onSave={handleLinksSave} onCancel={() => setEditingSection(null)} />
              ) : activeLinks.length > 0 ? (
                <div className="flex flex-wrap gap-3">
                  {activeLinks.map(({ key, label, icon: Icon }) => (
                    <a
                      key={key}
                      href={profile.links?.[key] ?? '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-indigo-300 hover:text-indigo-600"
                    >
                      <Icon size={16} />
                      {label}
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">{isOwnProfile ? "You haven't added any links yet." : 'No links added yet.'}</p>
              )}
            </SectionCard>

            {isOwnProfile && (
              <SectionCard
                id="security"
                icon={ShieldCheck}
                title="Security"
                action={
                  editingSection !== 'security' && (
                    <button type="button" onClick={() => setEditingSection('security')} className="text-sm font-medium text-indigo-600 hover:underline">
                      Change Password
                    </button>
                  )
                }
              >
                {editingSection === 'security' ? (
                  <>
                    <ChangePasswordForm />
                    <button
                      type="button"
                      onClick={() => setEditingSection(null)}
                      className="mt-4 rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                    >
                      Done
                    </button>
                  </>
                ) : (
                  <p className="text-sm text-slate-400">Keep your account secure by updating your password regularly.</p>
                )}
              </SectionCard>
            )}

            <SectionCard
              id="posts"
              icon={FileText}
              title="Posts"
              description="All posts, newest first."
              action={
                isOwnProfile && (
                  <Link
                    href="/posts/new"
                    className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:underline"
                  >
                    New Post
                    <ArrowUpRight size={14} />
                  </Link>
                )
              }
            >
              <ProfilePosts
                profileId={profile._id}
                currentUserId={viewer._id}
                currentUserRole={viewer.role}
                isOwnProfile={isOwnProfile}
              />
            </SectionCard>
          </div>
        </div>
      </main>
    </div>
  );
}
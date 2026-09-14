'use client';
import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Globe, GitBranch, BriefcaseBusiness, Users } from 'lucide-react';
import { apiCall } from '@/lib/api';
import { getToken } from '@/lib/auth';
import Navbar from '@/components/Navbar';
import SkillsEditor from '@/components/SkillsEditor';
import ExperienceEditor from '@/components/ExperienceEditor';
import EducationEditor from '@/components/EducationEditor';
import LinksEditor from '@/components/LinksEditor';
import ChangePasswordForm from '@/components/ChangePasswordForm';
import { formatMonth } from '@/lib/dateUtils';

type Section = 'about' | 'skills' | 'experience' | 'education' | 'links' | 'security' | null;

const LINK_PLATFORMS: { key: 'portfolio' | 'github' | 'linkedin' | 'facebook'; label: string; icon: any }[] = [
  { key: 'portfolio', label: 'Portfolio', icon: Globe },
  { key: 'github', label: 'GitHub', icon: GitBranch },
  { key: 'linkedin', label: 'LinkedIn', icon: BriefcaseBusiness },
  { key: 'facebook', label: 'Facebook', icon: Users },
];

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

  const [aboutForm, setAboutForm] = useState({ name: '', bio: '', avatarUrl: '' });
  const [aboutSaving, setAboutSaving] = useState(false);
  const [aboutMessage, setAboutMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const isAdmin = viewer?.role === 'admin';
  const canEdit = isOwnProfile || isAdmin;
  const canDelete = isAdmin && !isOwnProfile;

  useEffect(() => {
    const load = async () => {
      if (!getToken()) {
        router.push('/login');
        return;
      }
      const me = await apiCall('/users/me');
      if (!me.success) {
        router.push('/login');
        return;
      }
      setViewer(me.data);

      if (isOwnProfile) {
        setProfile(me.data);
        setAboutForm({ name: me.data.name, bio: me.data.bio || '', avatarUrl: me.data.avatarUrl || '' });
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
      setAboutForm({ name: res.data.name, bio: res.data.bio || '', avatarUrl: res.data.avatarUrl || '' });
      setLoading(false);
    };
    load();
  }, [id]);

  const handleAvatarPick = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    const reader = new FileReader();
    reader.onload = () => setAboutForm((prev) => ({ ...prev, avatarUrl: reader.result as string }));
    reader.readAsDataURL(file);
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
    return { success: res.success, message: res.message };
  };

  const handleExperiencesSave = async (experiences: any[]) => {
    const endpoint = isOwnProfile ? '/users/me/experiences' : `/users/${id}`;
    const res = await apiCall(endpoint, { method: 'PATCH', body: JSON.stringify({ experiences }) });
    if (res.success) setProfile(res.data);
    return { success: res.success, message: res.message };
  };

  const handleEducationSave = async (education: any[]) => {
    const endpoint = isOwnProfile ? '/users/me/education' : `/users/${id}`;
    const res = await apiCall(endpoint, { method: 'PATCH', body: JSON.stringify({ education }) });
    if (res.success) setProfile(res.data);
    return { success: res.success, message: res.message };
  };

  const handleLinksSave = async (links: any) => {
    const endpoint = isOwnProfile ? '/users/me/links' : `/users/${id}`;
    const res = await apiCall(endpoint, { method: 'PATCH', body: JSON.stringify({ links }) });
    if (res.success) setProfile(res.data);
    return { success: res.success, message: res.message };
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

  return (
    <div className="min-h-screen bg-slate-100">
      {viewer && <Navbar name={viewer.name} role={viewer.role} avatarUrl={viewer.avatarUrl} />}

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        {/* Header / About card */}
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="h-28 bg-gradient-to-r from-indigo-600 to-violet-600 sm:h-32" />
          <div className="px-6 pb-6">
            <div className="-mt-12 flex items-end justify-between">
              <div className="relative">
                {(editingSection === 'about' ? aboutForm.avatarUrl : profile.avatarUrl) ? (
                  <img
                    src={editingSection === 'about' ? aboutForm.avatarUrl : profile.avatarUrl}
                    alt={profile.name}
                    className="h-24 w-24 rounded-full border-4 border-white object-cover shadow"
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-white bg-indigo-600 text-3xl font-bold text-white shadow">
                    {profile.name?.charAt(0).toUpperCase()}
                  </div>
                )}
                {canEdit && editingSection === 'about' && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-white shadow hover:bg-slate-900"
                    aria-label="Change photo"
                  >
                    ✎
                  </button>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarPick} className="hidden" />
              </div>

              <div className="flex items-center gap-2">
                {canEdit && editingSection !== 'about' && (
                  <button
                    type="button"
                    onClick={() => setEditingSection('about')}
                    className="rounded-lg border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Edit Profile
                  </button>
                )}
                {canDelete && !showDeleteConfirm && (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="rounded-lg border border-red-200 px-4 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
                  >
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
              <div className="mt-4 space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">Full name</label>
                  <input
                    value={aboutForm.name}
                    onChange={(e) => setAboutForm({ ...aboutForm, name: e.target.value })}
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
                    disabled={aboutSaving}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                  >
                    {aboutSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingSection(null);
                      setAboutForm({ name: profile.name, bio: profile.bio || '', avatarUrl: profile.avatarUrl || '' });
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
                <h1 className="text-xl font-bold text-slate-900">{profile.name}</h1>
                <p className="text-sm text-slate-500">{profile.email}</p>
                <span
                  className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    profile.role === 'admin' ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'
                  }`}
                >
                  {profile.role}
                </span>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  {profile.bio || (isOwnProfile ? 'Add a short bio to tell others about yourself.' : 'No bio provided.')}
                </p>

                {activeLinks.length > 0 && (
                  <div className="mt-4 flex gap-2">
                    {activeLinks.map(({ key, label, icon: Icon }) => (
                      <a
                        key={key}
                        href={profile.links[key]}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={label}
                        className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition hover:bg-indigo-100 hover:text-indigo-600"
                      >
                        <Icon size={18} />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Experience */}
        <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Experience</h2>
            {canEdit && editingSection !== 'experience' && (
              <button type="button" onClick={() => setEditingSection('experience')} className="text-sm font-medium text-indigo-600 hover:underline">
                Edit
              </button>
            )}
          </div>
          <div className="mt-4">
            {editingSection === 'experience' ? (
              <ExperienceEditor experiences={profile.experiences || []} onSave={handleExperiencesSave} onCancel={() => setEditingSection(null)} />
            ) : profile.experiences?.length ? (
              <div className="space-y-4">
                {profile.experiences.map((exp: any, i: number) => (
                  <div key={i} className="flex gap-3">
                    <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-slate-100 text-sm font-bold text-slate-500">
                      {exp.company?.charAt(0).toUpperCase()}
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
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">{isOwnProfile ? "You haven't added any experience yet." : 'No experience added yet.'}</p>
            )}
          </div>
        </div>

        {/* Education */}
        <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Education</h2>
            {canEdit && editingSection !== 'education' && (
              <button type="button" onClick={() => setEditingSection('education')} className="text-sm font-medium text-indigo-600 hover:underline">
                Edit
              </button>
            )}
          </div>
          <div className="mt-4">
            {editingSection === 'education' ? (
              <EducationEditor education={profile.education || []} onSave={handleEducationSave} onCancel={() => setEditingSection(null)} />
            ) : profile.education?.length ? (
              <div className="space-y-4">
                {profile.education.map((edu: any, i: number) => (
                  <div key={i} className="flex gap-3">
                    <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-slate-100 text-sm font-bold text-slate-500">
                      {edu.institute?.charAt(0).toUpperCase()}
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
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">{isOwnProfile ? "You haven't added any education yet." : 'No education added yet.'}</p>
            )}
          </div>
        </div>

        {/* Skills */}
        <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Skills</h2>
            {canEdit && editingSection !== 'skills' && (
              <button type="button" onClick={() => setEditingSection('skills')} className="text-sm font-medium text-indigo-600 hover:underline">
                Edit
              </button>
            )}
          </div>
          <div className="mt-4">
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
          </div>
        </div>

        {/* Links */}
        <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Links</h2>
            {canEdit && editingSection !== 'links' && (
              <button type="button" onClick={() => setEditingSection('links')} className="text-sm font-medium text-indigo-600 hover:underline">
                Edit
              </button>
            )}
          </div>
          <div className="mt-4">
            {editingSection === 'links' ? (
              <LinksEditor links={profile.links || {}} onSave={handleLinksSave} onCancel={() => setEditingSection(null)} />
            ) : activeLinks.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {activeLinks.map(({ key, label, icon: Icon }) => (
                  <a
                    key={key}
                    href={profile.links[key]}
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
          </div>
        </div>

        {/* Security (own profile only) */}
        {isOwnProfile && (
          <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Security</h2>
              {editingSection !== 'security' && (
                <button type="button" onClick={() => setEditingSection('security')} className="text-sm font-medium text-indigo-600 hover:underline">
                  Change Password
                </button>
              )}
            </div>
            <div className="mt-4">
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
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
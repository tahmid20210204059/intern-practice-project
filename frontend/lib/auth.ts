export function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

export function getStoredUser() {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('user');
  return raw ? JSON.parse(raw) : null;
}

export function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

export function saveSession(token: string, user: any) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}
'use client';

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#f8fafc' }}>
        <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div role="alert" style={{ maxWidth: 360, background: '#fff', padding: 32, borderRadius: 8, textAlign: 'center' }}>
            <h1 style={{ fontSize: 20, margin: 0 }}>Something went wrong</h1>
            <p style={{ color: '#64748b', fontSize: 14 }}>The application hit an unexpected error.</p>
            <button type="button" onClick={reset} style={{ marginTop: 16, padding: '10px 20px', borderRadius: 8, border: 0, background: '#1877F2', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
'use client';

import { useEffect, useState } from 'react';

export default function Home() {
  const [status, setStatus] = useState('checking...');
  const [dbStatus, setDbStatus] = useState('');

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/health`)
      .then((res) => res.json())
      .then((data) => {
        setStatus(data.success ? 'API connected' : 'API error');
        setDbStatus(data.data?.database ?? 'unknown');
      })
      .catch(() => {
        setStatus('API not reachable');
        setDbStatus('unknown');
      });
  }, []);

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Dev Community</h1>
      <p>Backend status: {status}</p>
      <p>Database status: {dbStatus}</p>
    </div>
  );
}
import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { useEffect, useState } from 'react';
import { useLoaderData } from '@remix-run/react';
import useSupabaseClient from '~/utils/supabase.client';

export async function loader({ request }: LoaderFunctionArgs) {
  const key = new URL(request.url).searchParams.get('key');
  if (!process.env.ADMIN_SECRET || key !== process.env.ADMIN_SECRET) {
    throw new Response('Unauthorized', { status: 401 });
  }
  return json({ ok: true });
}

export default function AdminIndexRoute() {
  useLoaderData<typeof loader>();
  const sb = useSupabaseClient();
  const [rooms, setRooms] = useState<Array<{ code: string; status: string }>>([]);

  useEffect(() => {
    sb.from('rooms').select('code,status').then(({ data }) => setRooms(data || []));
  }, [sb]);

  async function setStatus(code: string, status: string) {
    await sb.from('rooms').update({ status }).eq('code', code);
    setRooms((prev) => prev.map((r) => (r.code === code ? { ...r, status } : r)));
  }

  return (
    <main style={{ maxWidth: 800, margin: '32px auto', padding: 16 }}>
      <h1>Admin</h1>
      <a href="/rooms/new">Create room</a>
      <ul>
        {rooms.map((r) => (
          <li key={r.code} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <code>{r.code}</code> <span>— {r.status}</span>
            <button onClick={() => setStatus(r.code, 'locked')}>Lock</button>
            <button onClick={() => setStatus(r.code, 'in_progress')}>Start</button>
            <button onClick={() => setStatus(r.code, 'closed')}>Close</button>
          </li>
        ))}
      </ul>
    </main>
  );
}



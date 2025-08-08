import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { useEffect, useMemo, useState } from 'react';
import { useLoaderData, useSearchParams } from '@remix-run/react';
import useSupabaseClient from '~/utils/supabase.client';

export async function loader({ params }: LoaderFunctionArgs) {
  const code = (params.code || '').toUpperCase();
  return json({ code });
}

export default function RoomLobbyRoute() {
  const { code } = useLoaderData<typeof loader>();
  const [params] = useSearchParams();
  const isHost = params.get('host') === '1';

  const sb = useSupabaseClient();
  const [nickname, setNickname] = useState('');
  const [team, setTeam] = useState<'A' | 'B' | null>(null);
  const [rosterA, setRosterA] = useState<string[]>([]);
  const [rosterB, setRosterB] = useState<string[]>([]);
  const [roomId, setRoomId] = useState<string | null>(null);
  const clientId = useMemo(() => {
    if (typeof window === 'undefined') return 'server';
    let id = localStorage.getItem('client_id');
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem('client_id', id);
    }
    return id;
  }, []);

  useEffect(() => {
    let mounted = true;
    sb.from('rooms')
      .select('id,status')
      .eq('code', code)
      .single()
      .then(({ data }) => {
        if (mounted && data?.id) setRoomId(data.id);
      });
    return () => {
      mounted = false;
    };
  }, [sb, code]);

  useEffect(() => {
    const channel = sb.channel(`room:${code}`, { config: { presence: { key: clientId } } });

    function handlePresenceSync() {
      const state = channel.presenceState<{ nickname: string; team: 'A' | 'B' | null }>();
      const a: string[] = [];
      const b: string[] = [];
      Object.values(state).forEach((arr) => {
        arr.forEach((p) => {
          if (p.team === 'A') a.push(p.nickname);
          else if (p.team === 'B') b.push(p.nickname);
        });
      });
      setRosterA(a);
      setRosterB(b);
    }

    channel.on('presence', { event: 'sync' }, handlePresenceSync);

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channel.track({ nickname: nickname || 'Anon', team }).catch(() => {});
      }
    });

    return () => {
      sb.removeChannel(channel);
    };
  }, [sb, code, clientId, nickname, team]);

  async function join() {
    await sb.channel(`room:${code}`).track({ nickname, team });
    if (roomId && team) {
      await sb
        .from('room_members')
        .upsert({ room_id: roomId, user_id: clientId, nickname, team, is_host: isHost });
    }
  }

  async function startMatch() {
    if (!isHost) return;
    await sb.from('rooms').update({ status: 'in_progress' }).eq('code', code);
    window.location.href = `/game?room=${code}`;
  }

  return (
    <main style={{ maxWidth: 900, margin: '32px auto', padding: 16 }}>
      <h1>Room {code}</h1>
      <div style={{ display: 'flex', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <label>
            Nickname
            <input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="Your name" />
          </label>
          <div style={{ marginTop: 8 }}>
            <label><input type="radio" checked={team === 'A'} onChange={() => setTeam('A')} /> Team A</label>
            <label style={{ marginLeft: 12 }}><input type="radio" checked={team === 'B'} onChange={() => setTeam('B')} /> Team B</label>
          </div>
          <button onClick={join} style={{ marginTop: 8 }}>Join</button>
          {isHost ? <button onClick={startMatch} style={{ marginLeft: 8 }}>Start match</button> : null}
        </div>
        <div style={{ flex: 1 }}>
          <h3>Team A</h3>
          <ul>{rosterA.map((n) => <li key={n}>{n}</li>)}</ul>
          <h3>Team B</h3>
          <ul>{rosterB.map((n) => <li key={n}>{n}</li>)}</ul>
        </div>
      </div>
    </main>
  );
}



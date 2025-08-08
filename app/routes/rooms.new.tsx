import { json, redirect, type ActionFunctionArgs } from '@remix-run/node';
import { Form, useActionData } from '@remix-run/react';
import { getAdminClient } from '~/utils/supabase.server';

function generateRoomCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c = '';
  for (let i = 0; i < 6; i++) c += alphabet[Math.floor(Math.random() * alphabet.length)];
  return c;
}

export async function action({ request }: ActionFunctionArgs) {
  const form = await request.formData();
  const nickname = (form.get('nickname') as string)?.trim() || 'Host';

  const sb = getAdminClient();
  const code = generateRoomCode();
  const { data, error } = await sb
    .from('rooms')
    .insert({ code, status: 'open' })
    .select('id, code')
    .single();
  if (error) return json({ error: error.message }, { status: 400 });

  await sb.from('room_members').upsert({
    room_id: data.id,
    user_id: crypto.randomUUID(),
    nickname,
    is_host: true
  });

  return redirect(`/rooms/${data.code}?host=1`);
}

export default function NewRoomRoute() {
  const actionData = useActionData<typeof action>();
  return (
    <main style={{ maxWidth: 520, margin: '40px auto', padding: 16 }}>
      <h1>Create a room</h1>
      <Form method="post">
        <input name="nickname" placeholder="Your name" required />
        <button type="submit" style={{ marginLeft: 8 }}>Create</button>
      </Form>
      {actionData?.error ? <p style={{ color: 'red' }}>{actionData.error}</p> : null}
    </main>
  );
}



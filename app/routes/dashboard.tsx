import { json, type MetaFunction } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { useEffect, useState } from 'react';
import DashboardScreen from '~/features/dashboard/components/DashboardScreen';
import { fetchDashboardData } from '~/features/dashboard/services/matchService';
import { getSupabaseClient } from '~/lib/supabase';

export const meta: MetaFunction = () => {
  const title = "Thor's 3Key — Dashboard";
  return [
    { title },
    { name: 'description', content: 'Match history and analytics dashboard' }
  ];
};

export async function loader() {
  return json({
    supabaseUrl: process.env.SUPABASE_URL ?? '',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? ''
  });
}

export default function DashboardRoute() {
  const { supabaseUrl, supabaseAnonKey } = useLoaderData<typeof loader>();
  const [data, setData] = useState<Awaited<
    ReturnType<typeof fetchDashboardData>
  > | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabaseUrl || !supabaseAnonKey) {
      setError('Supabase is not configured');
      return;
    }
    const supabase = getSupabaseClient(supabaseUrl, supabaseAnonKey);
    fetchDashboardData(supabase)
      .then(setData)
      .catch((e) => setError(e.message ?? 'Failed to load dashboard'));
  }, [supabaseUrl, supabaseAnonKey]);

  if (error) {
    return (
      <div
        style={{ textAlign: 'center', padding: '60px 20px', color: '#ff4d4d' }}
      >
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: '#ccc' }}>
        Loading dashboard...
      </div>
    );
  }

  return <DashboardScreen data={data} />;
}

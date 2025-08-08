import type { LoaderFunctionArgs } from '@remix-run/node';

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const origin = `${url.protocol}//${url.host}`;
  const body = `User-agent: *
Allow: /
Sitemap: ${origin}/sitemap.xml`;

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600'
    }
  });
}

export default function RobotsTxtRoute() {
  return null;
}



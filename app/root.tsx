import {
  Links,
  Meta,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  Outlet
} from '@remix-run/react';

import { json, type MetaFunction, type LinksFunction } from '@remix-run/node';
// existing imports

import appStylesHref from './app.css?url';

export const links: LinksFunction = () => [
  { rel: 'stylesheet', href: appStylesHref }
];

// existing imports
import ShareButtons from './components/ShareButtons';

export async function loader() {
  return json({
    API_KEY: process.env.API_KEY ?? '',
    SITE_URL: process.env.SITE_URL ?? 'http://localhost:5173',
    ANALYTICS_DOMAIN: process.env.PLAUSIBLE_DOMAIN ?? '',
    TWITTER_HANDLE: process.env.TWITTER_HANDLE ?? 'thor3key',
    SUPABASE_URL: process.env.SUPABASE_URL ?? '',
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ?? '',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
  });
}

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  const siteUrl = data?.SITE_URL ?? 'http://localhost:5173';
  const title = 'Thor\'s 3Key — Chaotic team card showdown';
  const description =
    'Fast, silly, team-based card chaos. Load players from Google Sheets, slam power-ups, and trash talk your way to victory.';
  const image = `${siteUrl}/images/star.png`;

  return [
    { title },
    { name: 'description', content: description },
    { name: 'theme-color', content: '#0b1221' },
    // Open Graph
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: siteUrl },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:image', content: image },
    // Twitter
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: description },
    { name: 'twitter:image', content: image }
  ];
};

export default function App() {
  const clientSecrets = useLoaderData<typeof loader>() ?? {
    API_KEY: '',
    SITE_URL: 'http://localhost:5173',
    ANALYTICS_DOMAIN: '',
    TWITTER_HANDLE: 'thor3key',
    SUPABASE_URL: '',
    SUPABASE_ANON_KEY: ''
  };
  const siteUrl = clientSecrets.SITE_URL ?? 'http://localhost:5173';
  const analyticsDomain = clientSecrets.ANALYTICS_DOMAIN;
  const twitterHandle = clientSecrets.TWITTER_HANDLE;
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        <link rel="canonical" href={siteUrl} />
        <link rel="manifest" href="/manifest.webmanifest" />
        {analyticsDomain ? (
          <script
            defer
            data-domain={analyticsDomain}
            src="https://plausible.io/js/script.js"
          />
        ) : null}
        {analyticsDomain ? (
          <script
            dangerouslySetInnerHTML={{
              __html:
                "try { const url = new URL(window.location.href); const ref = url.searchParams.get('ref'); if (ref && typeof window.plausible === 'function') { window.plausible('Referral', { props: { ref } }); } } catch(e) { /* noop */ }"
            }}
          />
        ) : null}
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'SoftwareApplication',
              applicationCategory: 'GameApplication',
              operatingSystem: 'Web',
              name: "Thor's 3Key",
              description:
                'Fast, silly, team-based card chaos. Load players from Google Sheets, slam power-ups, and trash talk your way to victory.',
              url: siteUrl,
              image: `${siteUrl}/images/star.png`,
              author: {
                '@type': 'Person',
                name: 'Thor 3Key Team'
              },
              sameAs: twitterHandle
                ? [`https://twitter.com/${twitterHandle.replace('@', '')}`]
                : []
            })
          }}
        />
      </head>
      <body>
        <div id="detail">
          <Outlet context={clientSecrets} />
          <ShareButtons siteUrl={siteUrl} />
        </div>

        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

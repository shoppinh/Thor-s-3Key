import {
  json,
  Links,
  Meta,
  Scripts,
  ScrollRestoration,
  useLoaderData
} from '@remix-run/react';

import type { LinksFunction } from '@remix-run/node';
// existing imports

import appStylesHref from './app.css?url';

export const links: LinksFunction = () => [
  { rel: 'stylesheet', href: appStylesHref }
];

// existing imports
import CardGame from './routes/minigame';

export async function loader() {
  return json({
    API_KEY: process.env.API_KEY
  });
}

export default function App() {
  const clientSecrets = useLoaderData<typeof loader>() ?? { API_KEY: '' };
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <div id="detail">
          <CardGame clientSecrets={clientSecrets} />
        </div>

        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

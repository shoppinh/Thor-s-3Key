import {
  Form,
  json,
  Link,
  Links,
  Meta,
  Outlet,
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
import { getContacts } from './data';
import CardGame from './routes/minigame';

// existing exports

export const loader = async () => {
  const contacts = await getContacts();
  return json({ contacts });
};

export default function App() {
  const { contacts } = useLoaderData<typeof loader>();

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
          <CardGame />
        </div>

        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

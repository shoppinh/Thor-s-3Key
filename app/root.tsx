import {
  Links,
  Meta,
  Scripts,
  ScrollRestoration
} from '@remix-run/react';

import type { LinksFunction } from '@remix-run/node';
// existing imports

import appStylesHref from './app.css?url';

export const links: LinksFunction = () => [
  { rel: 'stylesheet', href: appStylesHref }
];

// existing imports
import CardGame from './routes/minigame';


export default function App() {

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

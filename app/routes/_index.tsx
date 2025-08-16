import MainMenu from '~/components/MainMenu';
import type { MetaFunction } from '@remix-run/node';

export const meta: MetaFunction = () => {
  const title = "Thor's 3Key — Chaotic team card showdown";
  const description =
    'Fast, silly, team-based card chaos. Load players from Google Sheets, slam power-ups, and trash talk your way to victory.';
  return [
    { title },
    { name: 'description', content: description }
  ];
};

export default function IndexRoute() {
  return <MainMenu />;
}



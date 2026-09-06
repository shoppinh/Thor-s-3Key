import { json, type LoaderFunctionArgs } from '@remix-run/node';

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const sheetId = url.searchParams.get('sheetId');
  const sheetRange = url.searchParams.get('sheetRange');

  if (!sheetId || !sheetRange) {
    return json(
      { error: 'Missing sheetId or sheetRange parameter' },
      { status: 400 }
    );
  }

  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    return json(
      { error: 'Google Sheets API key is not configured on the server' },
      { status: 500 }
    );
  }

  const googleUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    sheetId
  )}/values/${encodeURIComponent(sheetRange)}?key=${encodeURIComponent(apiKey)}`;

  try {
    const response = await fetch(googleUrl);
    if (!response.ok) {
      return json(
        { error: `Google Sheets API error: ${response.statusText}` },
        { status: response.status }
      );
    }
    const data = await response.json();
    return json(data);
  } catch (err) {
    return json(
      { error: err instanceof Error ? err.message : 'Unknown server error' },
      { status: 500 }
    );
  }
}

# Supabase Setup Guide for Thor's 3Key

This guide walks you through setting up a free Supabase project to persist match history and power the analytics dashboard. No prior Supabase experience is required.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Step 1: Create a Supabase Project](#step-1-create-a-supabase-project)
3. [Step 2: Create the `matches` Table](#step-2-create-the-matches-table)
4. [Step 3: Create the `duel_events` Table](#step-3-create-the-duel_events-table)
5. [Step 4: Enable Row Level Security (RLS)](#step-4-enable-row-level-security-rls)
6. [Step 5: Get Your API Credentials](#step-5-get-your-api-credentials)
7. [Step 6: Update Your `.env` File](#step-6-update-your-env-file)
8. [Step 7: Test the Connection](#step-7-test-the-connection)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- A [Supabase](https://supabase.com) account (free tier is sufficient)
- Your Thor's 3Key app codebase running locally
- The `.env` file in your project root (it already has placeholder values)

---

## Step 1: Create a Supabase Project

1. Go to [https://app.supabase.com](https://app.supabase.com) and sign in (or sign up).
2. Click **"New project"**.
3. Choose your organization (or create a personal one).
4. Fill in the project details:
   - **Name:** `thors-3key` (or anything you like)
   - **Database Password:** Generate a strong password and save it somewhere safe (you won't need it for this guide, but it's good to keep)
   - **Region:** Choose the region closest to your users (e.g., `US East` for North America, `Singapore` for Southeast Asia)
5. Click **"Create new project"**.
6. Wait ~2 minutes for the project to provision.

---

## Step 2: Create the `matches` Table

Once your project is ready, you'll land on the project dashboard.

1. In the left sidebar, click **"Table Editor"**.
2. Click **"New table"**.
3. Set the table name to: `matches`
4. Ensure **"Enable Row Level Security (RLS)"** is **checked** (checked by default).
5. Uncheck **"Enable Realtime"** (we don't need it for this feature).
6. Leave **"Primary key"** as the default `id` column (type `uuid`, default `gen_random_uuid()`).

Now add the following columns using the **"Add column"** button:

| Column Name    | Type     | Default Value | Is Nullable |
| -------------- | -------- | ------------- | ----------- |
| `winner_team`  | `text`   | —             | ❌ No       |
| `team1_roster` | `text[]` | —             | ❌ No       |
| `team2_roster` | `text[]` | —             | ❌ No       |
| `team1_score`  | `int8`   | —             | ❌ No       |
| `team2_score`  | `int8`   | —             | ❌ No       |
| `total_duels`  | `int8`   | —             | ❌ No       |

> **Note:** The `created_at` column is added automatically by Supabase with type `timestamptz` and default `now()`. Do not remove it.

7. Click **"Save"** to create the table.

### Visual Check

Your `matches` table should look like this:

| Column         | Type          | Default             |
| -------------- | ------------- | ------------------- |
| `id`           | `uuid`        | `gen_random_uuid()` |
| `created_at`   | `timestamptz` | `now()`             |
| `winner_team`  | `text`        | —                   |
| `team1_roster` | `text[]`      | —                   |
| `team2_roster` | `text[]`      | —                   |
| `team1_score`  | `int8`        | —                   |
| `team2_score`  | `int8`        | —                   |
| `total_duels`  | `int8`        | —                   |

---

## Step 3: Create the `duel_events` Table

1. In the **Table Editor**, click **"New table"** again.
2. Set the table name to: `duel_events`
3. Ensure **"Enable Row Level Security (RLS)"** is **checked**.
4. Uncheck **"Enable Realtime"**.
5. Leave the default `id` column as-is.

Add the following columns:

| Column Name      | Type    | Default Value | Is Nullable |
| ---------------- | ------- | ------------- | ----------- |
| `match_id`       | `uuid`  | —             | ❌ No       |
| `round`          | `int8`  | —             | ❌ No       |
| `winner_name`    | `text`  | —             | ❌ No       |
| `loser_name`     | `text`  | —             | ❌ No       |
| `winner_team`    | `text`  | —             | ❌ No       |
| `loser_team`     | `text`  | —             | ❌ No       |
| `shielded`       | `bool`  | —             | ❌ No       |
| `winner_cards`   | `jsonb` | —             | ❌ No       |
| `loser_cards`    | `jsonb` | —             | ❌ No       |
| `winner_sum`     | `int8`  | —             | ❌ No       |
| `loser_sum`      | `int8`  | —             | ❌ No       |
| `power_ups_used` | `jsonb` | —             | ❌ No       |

6. Click **"Save"**.

### Add the Foreign Key Relationship

The `match_id` column must reference the `matches` table so Supabase knows these events belong to a specific match.

1. Click on the `duel_events` table to open it.
2. Click the dropdown on the `match_id` column row and select **"Edit column"**.
3. In the modal, click **"Add foreign key relation"**.
4. Set:
   - **Schema:** `public`
   - **Table:** `matches`
   - **Column:** `id`
5. Ensure **"On delete"** is set to `CASCADE` (this means if a match is deleted, its duel events are also deleted automatically).
6. Click **"Save"**.

### Visual Check

Your `duel_events` table should look like this:

| Column           | Type          | Default             |
| ---------------- | ------------- | ------------------- |
| `id`             | `uuid`        | `gen_random_uuid()` |
| `created_at`     | `timestamptz` | `now()`             |
| `match_id`       | `uuid`        | → `matches.id`      |
| `round`          | `int8`        | —                   |
| `winner_name`    | `text`        | —                   |
| `loser_name`     | `text`        | —                   |
| `winner_team`    | `text`        | —                   |
| `loser_team`     | `text`        | —                   |
| `shielded`       | `bool`        | —                   |
| `winner_cards`   | `jsonb`       | —                   |
| `loser_cards`    | `jsonb`       | —                   |
| `winner_sum`     | `int8`        | —                   |
| `loser_sum`      | `int8`        | —                   |
| `power_ups_used` | `jsonb`       | —                   |

---

## Step 4: Enable Row Level Security (RLS)

RLS controls who can read and write your data. For this app, we want anonymous users to be able to save matches and view the dashboard, but not modify or delete existing records.

### 4.1 Enable RLS on `matches`

1. Go to **Table Editor** → click `matches`.
2. Click **"Authentication"** (or the lock icon 🔒) near the top.
3. Toggle **"Enable RLS"** to **ON**.
4. Click **"Add RLS policy"**.
5. Click **"Create policy from scratch"**.

Create **two policies**:

#### Policy 1: Allow anonymous INSERT

- **Policy name:** `Allow anonymous insert`
- **Allowed operation:** `INSERT`
- **Target roles:** Leave empty (applies to all)
- **Using expression:** `true`
- **With check expression:** `true`
- Click **"Save policy"**

#### Policy 2: Allow anonymous SELECT

- **Policy name:** `Allow anonymous select`
- **Allowed operation:** `SELECT`
- **Target roles:** Leave empty
- **Using expression:** `true`
- Click **"Save policy"**

### 4.2 Enable RLS on `duel_events`

1. Go to **Table Editor** → click `duel_events`.
2. Click **"Authentication"** (or the lock icon 🔒).
3. Toggle **"Enable RLS"** to **ON**.
4. Click **"Add RLS policy"** → **"Create policy from scratch"**.

Create **two policies**:

#### Policy 1: Allow anonymous INSERT

- **Policy name:** `Allow anonymous insert`
- **Allowed operation:** `INSERT`
- **Target roles:** Leave empty
- **Using expression:** `true`
- **With check expression:** `true`
- Click **"Save policy"**

#### Policy 2: Allow anonymous SELECT

- **Policy name:** `Allow anonymous select`
- **Allowed operation:** `SELECT`
- **Target roles:** Leave empty
- **Using expression:** `true`
- Click **"Save policy"**

> **Why no UPDATE or DELETE policies?** The app only creates new records. By not adding UPDATE/DELETE policies, you protect historical match data from accidental or malicious changes.

---

## Step 5: Get Your API Credentials

Your app needs two values from Supabase to connect: the **Project URL** and the **Anon Key**.

1. In the Supabase dashboard left sidebar, click **"Project Settings"** (at the very bottom, with a gear icon).
2. Click **"API"** in the settings submenu.
3. You will see two important values:
   - **Project URL** — looks like `https://xxxxxxxxxxxxxxxxxxxx.supabase.co`
   - **anon public** — a long string starting with `eyJhbG...`

Copy both of these values somewhere safe (like a temporary text file). You will paste them into your `.env` file in the next step.

> **Security note:** The `anon` key is safe to expose in client-side code because RLS policies control what users can do. Never share your `service_role` key — that bypasses all RLS rules.

---

## Step 6: Update Your `.env` File

1. Open your project's `.env` file in your code editor.
2. Find these two lines:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

3. Replace them with the real values from Step 5:

```bash
SUPABASE_URL=https://xxxxxxxxxxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

4. Save the file.

> **Important:** The `.env` file is already in `.gitignore`, so these secrets won't be committed to GitHub.

---

## Step 7: Test the Connection

Now let's verify everything works.

### 7.1 Start your local dev server

```bash
npm run dev
```

### 7.2 Play a match and check the save

1. Open your app at `http://localhost:5173`.
2. Start a new game with any teams.
3. Play through until one team wins (game over screen appears).
4. On the game over screen, you should see:
   - **"Saving match history..."** briefly
   - Then **"Match saved!"** in green

If you see **"Failed to save match history"** in red, see the [Troubleshooting](#troubleshooting) section.

### 7.3 Verify data in Supabase

1. Go back to the Supabase dashboard.
2. Click **"Table Editor"** → `matches`.
3. You should see a new row with your match data!
4. Click **"Table Editor"** → `duel_events`.
5. You should see multiple rows, one for each duel in your match, all linked to the match via `match_id`.

### 7.4 Visit the Dashboard

1. Navigate to `http://localhost:5173/dashboard`.
2. You should see:
   - Summary cards (Total Matches, Total Duels, etc.)
   - Player leaderboard
   - Head-to-head records
   - Team streaks
   - Recent matches table

If the dashboard says **"Supabase is not configured"**, double-check that your `.env` values are correct and that you restarted the dev server after editing `.env`.

---

## Troubleshooting

### "Failed to save match history" appears

1. **Check browser console** (F12 → Console tab) for error messages.
2. **Verify `.env` values:** Make sure there are no extra spaces or quotes around the URL or key.
3. **Check RLS policies:** Go to Supabase → Table Editor → `matches` → Authentication. Ensure both INSERT and SELECT policies exist and are enabled.
4. **Check table columns:** Ensure column names exactly match the schema in this guide (e.g., `winner_team` not `winnerTeam`).
5. **Restart dev server:** If you edited `.env` while the server was running, stop it (`Ctrl+C`) and run `npm run dev` again.

### Dashboard shows "Supabase is not configured"

- This means `SUPABASE_URL` or `SUPABASE_ANON_KEY` is empty or missing.
- Verify the `.env` file has both values.
- Make sure the dev server was restarted after editing `.env`.

### "No data yet" on dashboard

- This is normal if you haven't completed any matches yet.
- Play a full game and wait for the "Match saved!" message.

### TypeScript errors after setup

```bash
npm run typecheck
```

If you see errors related to Supabase types, ensure your `app/features/dashboard/types.ts` matches the schema in this guide exactly.

---

## Summary

You now have a fully functional Supabase backend that:

- ✅ Saves every completed match with full duel history
- ✅ Protects data with Row Level Security
- ✅ Powers the `/dashboard` analytics route
- ✅ Requires zero authentication for players (anonymous access)

If you need to scale beyond the free tier later, Supabase's Pro plan starts at $25/month and includes more database space, connection pooling, and support.

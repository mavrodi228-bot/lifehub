# LifeHub

LifeHub is a mobile-first PWA for organizing home tasks, shopping, family items, and important documents.

## Features

- Home dashboard with upcoming items
- Household tasks with due dates and completion status
- Shopping list
- Document tracker with expiration dates
- Local document attachments for small images/PDFs
- Family/shared responsibility list
- Search, edit, delete, and JSON export
- Local browser storage

## Run Locally

```powershell
cd C:\Users\user\Desktop\LifeHubWeb
python -m http.server 8080 --bind 0.0.0.0
```

Open on the same computer:

```text
http://127.0.0.1:8080
```

Open on iPhone in the same Wi-Fi network:

```text
http://192.168.0.100:8080
```

Then use Safari -> Share -> Add to Home Screen.

## Deploy

This app is a static site. It can be deployed to:

- GitHub Pages
- Netlify
- Vercel
- Any VPS or static file server

For GitHub Pages, publish the repository and enable Pages from the repository settings.

## Supabase Sync

1. Create a Supabase project.
2. Open Supabase SQL Editor.
3. Run the SQL from `supabase.sql`.
4. Open LifeHub.
5. Click `Локально` in the header.
6. Paste:
   - Supabase project URL
   - publishable anon key
   - workspace key, or keep the generated one
7. Click `Сохранить`.
8. Click `Выгрузить` to send local data to Supabase.

After this, new cards are saved to Supabase automatically. Attachments in cloud mode are uploaded to the `lifehub-files` Storage bucket.

Security note: the current setup is an MVP without user login. For production, add Supabase Auth and replace the broad anon policies in `supabase.sql` with user-scoped policies.

# LifeHub

LifeHub is a mobile-first PWA for organizing home tasks, shopping, family items, and important documents.

## Features

- Home dashboard with upcoming items
- Household tasks with due dates and completion status
- Shopping list
- Document tracker with expiration dates
- Local document attachments for small images/PDFs
- Family/shared responsibility list
- Supabase email auth
- Family invite links
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
4. In Supabase Auth settings, add your deployed app URL to allowed redirect URLs.
   For local testing, add `http://127.0.0.1:8080`.
5. Open LifeHub.
6. Click `Локально` in the header.
7. Paste:
   - Supabase project URL
   - publishable anon key
   - workspace key, or keep the generated one
8. Click `Сохранить`.
9. Enter your email and click `Войти по ссылке`.
10. Click `Выгрузить` to send local data to Supabase.

After this, new cards are saved to Supabase automatically. Attachments in cloud mode are uploaded to the `lifehub-files` Storage bucket.

## Family Invites

1. Connect Supabase and sign in by email.
2. Open `Семья`.
3. Click `Инвайт`.
4. Click `Создать`.
5. Send the generated link to a family member.
6. The family member opens the link, signs in, and LifeHub switches them into the same workspace.

Security note: the current setup is MVP-level. It uses Supabase Auth and a workspace invite flow, but the SQL policies are intentionally permissive for easy setup. For production, replace them with strict user-scoped membership policies.

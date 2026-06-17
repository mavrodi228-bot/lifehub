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
- Full-screen invite onboarding
- In-app and browser reminders for nearby due dates
- Invite acceptance notifications for the invite creator
- Search, edit, delete, and JSON export
- Capacitor iOS wrapper for App Store builds
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
4. Copy your Supabase Project URL and publishable anon key into `config.js`.
5. In Supabase Auth settings, add your deployed app URL to allowed redirect URLs.
   For local testing, add `http://127.0.0.1:8080`.
6. Open LifeHub.
7. Enter your email in the first-screen sign-in panel.
8. Open the magic link from email.
9. LifeHub will create or join the family workspace and sync data automatically.

After this, users do not need to configure Supabase themselves. New cards are saved to the configured Supabase project automatically after sign-in. Attachments in cloud mode are uploaded to the `lifehub-files` Storage bucket.

If you already created the Supabase project earlier, run the current `supabase.sql` again. It adds the notification table and updates the invite RPC so accepted invites create a family member card automatically.

## Family Invites

1. Connect Supabase and sign in by email.
2. Open `Семья`.
3. Click `Инвайт`.
4. Click `Создать`.
5. Send the generated link to a family member.
6. The family member opens the link, sees a full-screen join screen, signs in, and LifeHub switches them into the same workspace.
7. The creator of the invite receives a LifeHub notification, and the new person appears in the family list.

Security note: `supabase.sql` uses Supabase Auth, workspace membership checks, and an invite RPC. Keep the service-role key out of the client. Only the publishable anon key belongs in `config.js`.

## Branded Auth Email

To send registration/login emails from your company instead of the default Supabase sender:

1. Buy or use a domain you control.
2. Create an email sending account with a provider such as Resend, Postmark, SendGrid, Brevo, Mailgun, or Amazon SES.
3. Verify the domain in that provider by adding the DNS records they give you, usually SPF, DKIM, and DMARC.
4. In Supabase, open `Authentication -> Emails`.
5. Configure custom SMTP with the provider's SMTP host, port, username, password, sender email, and sender name.
6. In the Magic Link email template, paste `email-templates/magic-link.html`.
7. Set the email subject to something like `Вход в LifeHub`.

Use a sender like:

```text
LifeHub <no-reply@yourdomain.com>
```

## iOS / App Store

LifeHub is wrapped with Capacitor for iOS.

On Windows you can prepare the web bundle and iOS project:

```powershell
npm install
npm run prepare:ios
npx cap sync ios
```

The generated Xcode project is in:

```text
ios/App/App.xcworkspace
```

Final App Store upload requires macOS with Xcode, an Apple Developer account, signing certificates, app icons, screenshots, privacy details, and App Store Connect metadata.

On a Mac:

```bash
npm install
npm run cap:sync
npx cap open ios
```

Then archive and upload from Xcode.

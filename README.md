# LifeHub

LifeHub is a mobile-first PWA for organizing home tasks, shopping, family items, and important documents.

## Features

- Home dashboard with upcoming items
- Household tasks with due dates and completion status
- Shopping list
- Document tracker with expiration dates
- Local document attachments for small images/PDFs
- Family/shared responsibility list
- Member names and generated avatars
- Supabase email auth
- Family invite links
- Full-screen invite onboarding
- Full-screen login and registration
- In-app reminders, Web Push, and native iOS APNs notifications for nearby due dates
- New item notifications for other family members
- Invite acceptance notifications for the invite creator
- Search, edit, and delete
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
7. Choose login or registration on the full-screen access screen.
8. Open the magic link from email.
9. LifeHub will create or join the family workspace and sync data automatically.

After this, users do not need to configure Supabase themselves. New cards are saved to the configured Supabase project automatically after sign-in. Attachments in cloud mode are uploaded to the `lifehub-files` Storage bucket.

If you already created the Supabase project earlier, run the current `supabase.sql` again. It adds profile avatars, web push subscriptions, native iOS push tokens, item notifications, and updates the invite RPC so accepted invites create a family member card automatically.

## Family Invites

1. Connect Supabase and sign in by email.
2. Open `Семья`.
3. Click `Инвайт`.
4. Click `Создать`.
5. Send the generated link to a family member.
6. The family member opens the link, sees a full-screen join screen, signs in, and LifeHub switches them into the same workspace.
7. The creator of the invite receives a LifeHub notification, and the new person appears in the family list.

Security note: `supabase.sql` uses Supabase Auth, workspace membership checks, and an invite RPC. Keep the service-role key out of the client. Only the publishable anon key belongs in `config.js`.

## Web Push Notifications

LifeHub includes a service worker and Supabase Edge Function for real push notifications.

1. Run the latest `supabase.sql` in Supabase SQL Editor.
2. Generate VAPID keys on your computer in the project folder:

```powershell
npm install
npx web-push generate-vapid-keys
```

The command prints `Public Key` and `Private Key`. The public key goes into the app. The private key stays only in Supabase secrets.

3. Put the public key into `config.js`:

```js
vapidPublicKey: 'PASTE_PUBLIC_KEY_HERE'
```

4. Log in to Supabase CLI and link the project:

```powershell
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
```

`YOUR_PROJECT_REF` is the id in your Supabase URL, for example `avikkeimjvojhqpavheh`.

5. Add Supabase Edge Function secrets:

```powershell
npx supabase secrets set VAPID_SUBJECT=mailto:hello@yourdomain.com
npx supabase secrets set VAPID_PUBLIC_KEY=PASTE_PUBLIC_KEY_HERE
npx supabase secrets set VAPID_PRIVATE_KEY=PASTE_PRIVATE_KEY_HERE
npx supabase secrets set LIFEHUB_PUSH_SECRET=any-long-random-string
```

6. Deploy the push sender:

```powershell
npx supabase functions deploy send-push
```

The committed `supabase/config.toml` disables JWT verification for this one cron function. Access is protected by `LIFEHUB_PUSH_SECRET`.

7. Call `send-push` every few minutes from Supabase cron or any server cron with header:

```text
x-lifehub-push-secret: any-long-random-string
```

When LifeHub is open and visible, push messages are shown as temporary in-app toasts. When the app is closed or in the background, the service worker shows regular system notifications.

## Native iOS Push Notifications

LifeHub also registers a real iOS APNs device token when the Capacitor app runs on iPhone. Web users keep using VAPID; iOS App Store builds use APNs.

1. Run the latest `supabase.sql` in Supabase SQL Editor. It creates `lifehub_native_push_tokens`.
2. In Supabase, open `Authentication -> URL Configuration -> Redirect URLs` and add:

```text
lifehub://auth
```

3. In Apple Developer, open `Certificates, Identifiers & Profiles -> Keys`.
4. Create a key with `Apple Push Notifications service (APNs)`, then download the `.p8` file once.
5. Save the `Key ID`, your `Team ID`, and keep the `.p8` private key outside the repo.
6. Make sure the app bundle id is:

```text
com.lifehub.app
```

7. In Xcode on a Mac, open `ios/App/App.xcworkspace`, select the App target, then add:

```text
Signing & Capabilities -> Push Notifications
Signing & Capabilities -> Background Modes -> Remote notifications
```

8. Add APNs secrets to Supabase. Use `production` for TestFlight/App Store. Use `sandbox` only for local debug builds from Xcode:

```powershell
npx supabase secrets set APNS_KEY_ID=PASTE_KEY_ID
npx supabase secrets set APNS_TEAM_ID=PASTE_TEAM_ID
npx supabase secrets set APNS_BUNDLE_ID=com.lifehub.app
npx supabase secrets set APNS_ENVIRONMENT=production
npx supabase secrets set APNS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nPASTE_P8_BODY\n-----END PRIVATE KEY-----"
```

9. Deploy the sender again:

```powershell
npx supabase functions deploy send-push
```

The same scheduled `send-push` call sends due-date reminders, invite accepted alerts, and new item alerts to both web subscriptions and iOS APNs tokens.

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

Before uploading:

1. In Xcode, select your Apple Developer team under `Signing & Capabilities`.
2. Confirm the bundle id is `com.lifehub.app`.
3. Add `Push Notifications` and `Background Modes -> Remote notifications`.
4. Set the App Store icon in `Assets.xcassets`.
5. Choose `Any iOS Device` as the run destination.
6. Open `Product -> Archive`.
7. In Organizer, click `Distribute App -> App Store Connect -> Upload`.
8. In App Store Connect, create the app, fill privacy details, screenshots, description, age rating, and submit for review.

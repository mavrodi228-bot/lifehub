import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

type NotificationRow = {
  id: number;
  workspace_key: string;
  target_user_id: string;
  type: string;
  title: string;
  body: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:hello@example.com';
const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY') || '';
const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY') || '';
const apnsKeyId = Deno.env.get('APNS_KEY_ID') || '';
const apnsTeamId = Deno.env.get('APNS_TEAM_ID') || '';
const apnsPrivateKey = Deno.env.get('APNS_PRIVATE_KEY') || '';
const apnsBundleId = Deno.env.get('APNS_BUNDLE_ID') || 'com.lifehub.app';
const apnsEnvironment = (Deno.env.get('APNS_ENVIRONMENT') || 'production').toLowerCase();
const cronSecret = Deno.env.get('LIFEHUB_PUSH_SECRET') || '';
const hasWebPush = Boolean(vapidPublicKey && vapidPrivateKey);
const hasNativePush = Boolean(apnsKeyId && apnsTeamId && apnsPrivateKey && apnsBundleId);

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

let apnsJwtCache: { token: string; expiresAt: number } | null = null;
let apnsPrivateKeyPromise: Promise<CryptoKey> | null = null;

if (hasWebPush) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

serve(async (request) => {
  if (request.method !== 'POST') {
    return json({ error: 'Use POST' }, 405);
  }

  if (cronSecret) {
    const token = request.headers.get('x-lifehub-push-secret') || '';
    if (token !== cronSecret) {
      return json({ error: 'Unauthorized' }, 401);
    }
  }

  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: 'Missing Supabase environment variables' }, 500);
  }

  if (!hasWebPush && !hasNativePush) {
    return json({ error: 'Missing Web Push VAPID or Apple APNs environment variables' }, 500);
  }

  await enqueueDueReminders();
  const result = await sendPendingPushes();
  return json(result);
});

async function enqueueDueReminders() {
  const today = new Date();
  const todayIso = toIsoDate(today);
  const limit = new Date(today);
  limit.setDate(limit.getDate() + 2);
  const limitIso = toIsoDate(limit);

  const { data: items, error: itemsError } = await supabase
    .from('lifehub_items')
    .select('workspace_key,id,list,title,category,due_date')
    .eq('done', false)
    .not('due_date', 'is', null)
    .gte('due_date', todayIso)
    .lte('due_date', limitIso);

  if (itemsError) throw itemsError;
  if (!items?.length) return;

  const workspaces = [...new Set(items.map((item) => item.workspace_key))];
  const { data: members, error: membersError } = await supabase
    .from('lifehub_members')
    .select('workspace_key,user_id')
    .in('workspace_key', workspaces);

  if (membersError) throw membersError;
  if (!members?.length) return;

  const rows = items.flatMap((item) => {
    const dueDate = new Date(`${item.due_date}T00:00:00`);
    const days = Math.ceil((dueDate.getTime() - startOfDay(today).getTime()) / 86400000);
    const title = days === 0 ? 'Сегодня срок' : days === 1 ? 'Срок завтра' : `Срок через ${days} дня`;
    const body = [item.title, listLabel(item.list), item.category].filter(Boolean).join(' · ');

    return members
      .filter((member) => member.workspace_key === item.workspace_key)
      .map((member) => ({
        workspace_key: item.workspace_key,
        target_user_id: member.user_id,
        actor_user_id: null,
        type: 'due_reminder',
        title,
        body,
        dedupe_key: `due:${item.id}:${item.due_date}:${todayIso}`,
        payload: {
          item_id: item.id,
          list: item.list,
          due_date: item.due_date,
        },
      }));
  });

  if (!rows.length) return;
  const { error } = await supabase
    .from('lifehub_notifications')
    .upsert(rows, {
      onConflict: 'target_user_id,type,dedupe_key',
      ignoreDuplicates: true,
    });
  if (error) throw error;
}

async function sendPendingPushes() {
  const { data: notifications, error } = await supabase
    .from('lifehub_notifications')
    .select('id,workspace_key,target_user_id,type,title,body,payload,created_at')
    .is('read_at', null)
    .is('pushed_at', null)
    .order('created_at', { ascending: true })
    .limit(100);

  if (error) throw error;
  if (!notifications?.length) {
    return { queued: 0, sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;

  for (const notification of notifications as NotificationRow[]) {
    const payload = JSON.stringify(buildWebPushPayload(notification));
    const errors: string[] = [];
    let attempted = false;

    if (hasWebPush) {
      const webResult = await sendWebPushes(notification, payload, errors);
      sent += webResult.sent;
      failed += webResult.failed;
      attempted = attempted || webResult.attempted;
    }

    if (hasNativePush) {
      const nativeResult = await sendNativePushes(notification, errors);
      sent += nativeResult.sent;
      failed += nativeResult.failed;
      attempted = attempted || nativeResult.attempted;
    }

    if (!attempted) continue;

    await supabase
      .from('lifehub_notifications')
      .update({
        pushed_at: new Date().toISOString(),
        push_error: errors.length ? errors.join('\n').slice(0, 1000) : null,
      })
      .eq('id', notification.id);
  }

  return { queued: notifications.length, sent, failed };
}

function buildWebPushPayload(notification: NotificationRow) {
  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    payload: notification.payload,
    url: './',
    tag: `lifehub-${notification.id}`,
  };
}

async function sendWebPushes(notification: NotificationRow, payload: string, errors: string[]) {
  const { data: subscriptions, error } = await supabase
    .from('lifehub_push_subscriptions')
    .select('id,endpoint,p256dh,auth')
    .eq('user_id', notification.target_user_id)
    .eq('workspace_key', notification.workspace_key)
    .eq('enabled', true);

  if (error) throw error;
  if (!subscriptions?.length) return { attempted: false, sent: 0, failed: 0 };

  let sent = 0;
  let failed = 0;
  for (const subscription of subscriptions) {
    try {
      await webpush.sendNotification({
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      }, payload);
      sent += 1;
    } catch (pushError) {
      failed += 1;
      errors.push(pushError instanceof Error ? pushError.message : String(pushError));
      const statusCode = (pushError as { statusCode?: number }).statusCode;
      if (statusCode === 404 || statusCode === 410) {
        await supabase
          .from('lifehub_push_subscriptions')
          .update({ enabled: false, updated_at: new Date().toISOString() })
          .eq('id', subscription.id);
      }
    }
  }

  return { attempted: true, sent, failed };
}

async function sendNativePushes(notification: NotificationRow, errors: string[]) {
  const { data: tokens, error } = await supabase
    .from('lifehub_native_push_tokens')
    .select('id,token')
    .eq('user_id', notification.target_user_id)
    .eq('workspace_key', notification.workspace_key)
    .eq('platform', 'ios')
    .eq('enabled', true);

  if (error) {
    if (isMissingRelationError(error)) return { attempted: false, sent: 0, failed: 0 };
    throw error;
  }
  if (!tokens?.length) return { attempted: false, sent: 0, failed: 0 };

  let sent = 0;
  let failed = 0;
  for (const row of tokens) {
    try {
      await sendApnsNotification(row.token, notification);
      sent += 1;
    } catch (pushError) {
      failed += 1;
      errors.push(apnsErrorMessage(pushError));
      if (shouldDisableApnsToken(pushError)) {
        await supabase
          .from('lifehub_native_push_tokens')
          .update({ enabled: false, updated_at: new Date().toISOString() })
          .eq('id', row.id);
      }
    }
  }

  return { attempted: true, sent, failed };
}

async function sendApnsNotification(deviceToken: string, notification: NotificationRow) {
  const host = apnsEnvironment === 'sandbox' || apnsEnvironment === 'development'
    ? 'https://api.sandbox.push.apple.com'
    : 'https://api.push.apple.com';
  const token = await getApnsJwt();
  const response = await fetch(`${host}/3/device/${deviceToken}`, {
    method: 'POST',
    headers: {
      authorization: `bearer ${token}`,
      'apns-topic': apnsBundleId,
      'apns-push-type': 'alert',
      'apns-priority': '10',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      aps: {
        alert: {
          title: notification.title || 'LifeHub',
          body: notification.body || '',
        },
        sound: 'default',
      },
      type: notification.type,
      notification_id: String(notification.id),
      payload: notification.payload || {},
    }),
  });

  if (!response.ok) {
    const reason = await readApnsReason(response);
    throw { status: response.status, reason };
  }
}

async function getApnsJwt() {
  const now = Date.now();
  if (apnsJwtCache && apnsJwtCache.expiresAt > now) return apnsJwtCache.token;

  const header = base64UrlEncode(JSON.stringify({ alg: 'ES256', kid: apnsKeyId }));
  const payload = base64UrlEncode(JSON.stringify({
    iss: apnsTeamId,
    iat: Math.floor(now / 1000),
  }));
  const signingInput = `${header}.${payload}`;
  const key = await getApnsPrivateKey();
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(signingInput),
  );
  const jwt = `${signingInput}.${base64UrlEncode(ecdsaSignatureToJose(signature))}`;
  apnsJwtCache = { token: jwt, expiresAt: now + 50 * 60 * 1000 };
  return jwt;
}

function getApnsPrivateKey(): Promise<CryptoKey> {
  if (!apnsPrivateKeyPromise) {
    apnsPrivateKeyPromise = crypto.subtle.importKey(
      'pkcs8',
      pemToArrayBuffer(apnsPrivateKey),
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign'],
    );
  }
  return apnsPrivateKeyPromise;
}

function pemToArrayBuffer(pem: string) {
  const base64 = pem
    .replace(/\\n/g, '\n')
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s/g, '');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}

function ecdsaSignatureToJose(signature: ArrayBuffer) {
  const bytes = new Uint8Array(signature);
  if (bytes.length === 64) return bytes;
  if (bytes[0] !== 0x30) return bytes;

  let offset = 2;
  if (bytes[1] & 0x80) {
    offset = 2 + (bytes[1] & 0x7f);
  }
  if (bytes[offset] !== 0x02) throw new Error('Invalid APNs signature');
  const rLength = bytes[offset + 1];
  const r = bytes.slice(offset + 2, offset + 2 + rLength);
  offset += 2 + rLength;
  if (bytes[offset] !== 0x02) throw new Error('Invalid APNs signature');
  const sLength = bytes[offset + 1];
  const s = bytes.slice(offset + 2, offset + 2 + sLength);

  const jose = new Uint8Array(64);
  jose.set(normalizeEcInteger(r), 0);
  jose.set(normalizeEcInteger(s), 32);
  return jose;
}

function normalizeEcInteger(bytes: Uint8Array) {
  let normalized = bytes;
  while (normalized.length > 32 && normalized[0] === 0) {
    normalized = normalized.slice(1);
  }
  const output = new Uint8Array(32);
  output.set(normalized.slice(-32), 32 - Math.min(normalized.length, 32));
  return output;
}

function base64UrlEncode(value: string | Uint8Array) {
  const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value;
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function readApnsReason(response: Response) {
  const text = await response.text();
  if (!text) return '';
  try {
    const body = JSON.parse(text);
    return body.reason || text;
  } catch {
    return text;
  }
}

function apnsErrorMessage(error: unknown) {
  const details = error as { status?: number; reason?: string };
  if (details?.status || details?.reason) {
    return `APNs ${details.status || ''} ${details.reason || ''}`.trim();
  }
  return error instanceof Error ? error.message : String(error);
}

function shouldDisableApnsToken(error: unknown) {
  const details = error as { status?: number; reason?: string };
  return details?.status === 410
    || details?.reason === 'BadDeviceToken'
    || details?.reason === 'Unregistered'
    || details?.reason === 'DeviceTokenNotForTopic';
}

function isMissingRelationError(error: { code?: string }) {
  return error.code === '42P01' || error.code === 'PGRST205';
}

function listLabel(list: string) {
  if (list === 'tasks') return 'Задачи';
  if (list === 'shopping') return 'Покупки';
  if (list === 'documents') return 'Документы';
  if (list === 'family') return 'Семья';
  return '';
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
    },
  });
}

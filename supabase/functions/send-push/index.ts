import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:hello@example.com';
const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY') || '';
const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY') || '';
const cronSecret = Deno.env.get('LIFEHUB_PUSH_SECRET') || '';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

if (vapidPublicKey && vapidPrivateKey) {
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

  if (!supabaseUrl || !serviceRoleKey || !vapidPublicKey || !vapidPrivateKey) {
    return json({ error: 'Missing Supabase or VAPID environment variables' }, 500);
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

  for (const notification of notifications) {
    const { data: subscriptions, error: subError } = await supabase
      .from('lifehub_push_subscriptions')
      .select('id,endpoint,p256dh,auth')
      .eq('user_id', notification.target_user_id)
      .eq('workspace_key', notification.workspace_key)
      .eq('enabled', true);

    if (subError) throw subError;
    if (!subscriptions?.length) continue;

    const payload = JSON.stringify({
      id: notification.id,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      payload: notification.payload,
      url: './',
      tag: `lifehub-${notification.id}`,
    });

    const errors: string[] = [];
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

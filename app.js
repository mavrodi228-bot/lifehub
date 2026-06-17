const storageKey = 'lifehub-pwa-state-v2';
const legacyStorageKey = 'lifehub-pwa-state-v1';
const cloudConfigKey = 'lifehub-supabase-config-v1';
const storageBucket = 'lifehub-files';
const reminderSeenKey = 'lifehub-reminder-seen-v1';

const labels = {
  home: 'Главная',
  tasks: 'Задачи',
  shopping: 'Покупки',
  documents: 'Документы',
  family: 'Семья',
};

const placeholders = {
  tasks: 'Например: вызвать мастера',
  shopping: 'Например: молоко',
  documents: 'Например: страховка квартиры',
  family: 'Например: Саша',
};

const sectionTitles = {
  tasks: 'Бытовые задачи',
  shopping: 'Список покупок',
  documents: 'Важные документы',
  family: 'Семейное пространство',
};

const defaultState = {
  activeTab: 'home',
  query: '',
  tasks: [
    createItem('Заменить фильтр для воды', 'Дом', daysFromNow(86), 'Раз в три месяца', false),
    createItem('Оплатить интернет', 'Финансы', daysFromNow(8), 'Каждый месяц', false),
    createItem('Проверить аптечку', 'Здоровье', daysFromNow(14), 'Убрать просроченные лекарства', true),
  ],
  shopping: [
    createItem('Стиральный порошок', 'Бытовая химия', daysFromNow(7), 'Заканчивается'),
    createItem('Корм', 'Дом', daysFromNow(3), 'Купить до пятницы'),
    createItem('Батарейки AA', 'Расходники', '', 'Для дома'),
  ],
  documents: [
    createItem('Страховка машины', 'Авто', '2026-11-20', 'Напомнить за месяц'),
    createItem('Гарантия на холодильник', 'Гарантия', '2027-02-14', 'Сервисный чек в папке кухни'),
    createItem('Договор аренды', 'Квартира', daysFromNow(45), 'Проверить условия продления'),
  ],
  family: [
    createItem('Я', 'Владелец', '', 'Главный список'),
    createItem('Мама', 'Здоровье', daysFromNow(10), 'Лекарства и визиты'),
    createItem('Дом', 'Общее', '', 'Поручения без ответственного'),
  ],
};

let state = loadState();

const title = document.querySelector('#screen-title');
const homeScreen = document.querySelector('#home-screen');
const listScreen = document.querySelector('#list-screen');
const listTitle = document.querySelector('#list-title');
const itemList = document.querySelector('#item-list');
const focusList = document.querySelector('#focus-list');
const input = document.querySelector('#item-input');
const dateInput = document.querySelector('#date-input');
const noteInput = document.querySelector('#note-input');
const fileInput = document.querySelector('#file-input');
const fileRow = document.querySelector('#file-row');
const datePresetButtons = Array.from(document.querySelectorAll('.date-presets button'));
const searchInput = document.querySelector('#search-input');
const form = document.querySelector('#add-form');
const tabs = Array.from(document.querySelectorAll('.tab'));
const clearDoneButton = document.querySelector('#clear-done-button');
const inviteFamilyButton = document.querySelector('#invite-family-button');
const exportButton = document.querySelector('#export-button');
const syncButton = document.querySelector('#sync-button');
const authGate = document.querySelector('#auth-gate');
const gateAuthForm = document.querySelector('#gate-auth-form');
const gateAuthEmail = document.querySelector('#gate-auth-email');
const gateAuthCopy = document.querySelector('#gate-auth-copy');
const gateLoginButton = document.querySelector('#gate-login-button');
const inviteScreen = document.querySelector('#invite-screen');
const inviteAuthForm = document.querySelector('#invite-auth-form');
const inviteAuthEmail = document.querySelector('#invite-auth-email');
const inviteLoginButton = document.querySelector('#invite-login-button');
const inviteCopy = document.querySelector('#invite-copy');
const toastStack = document.querySelector('#toast-stack');
const detailDialog = document.querySelector('#detail-dialog');
const detailForm = document.querySelector('#detail-form');
const detailHeading = document.querySelector('#detail-heading');
const detailTitle = document.querySelector('#detail-title');
const detailDate = document.querySelector('#detail-date');
const detailCategory = document.querySelector('#detail-category');
const detailNote = document.querySelector('#detail-note');
const attachmentPanel = document.querySelector('#attachment-panel');
const closeDetailButton = document.querySelector('#close-detail-button');
const deleteDetailButton = document.querySelector('#delete-detail-button');
const syncDialog = document.querySelector('#sync-dialog');
const syncForm = document.querySelector('#sync-form');
const closeSyncButton = document.querySelector('#close-sync-button');
const disconnectSyncButton = document.querySelector('#disconnect-sync-button');
const pullSyncButton = document.querySelector('#pull-sync-button');
const pushSyncButton = document.querySelector('#push-sync-button');
const supabaseUrlInput = document.querySelector('#supabase-url');
const supabaseKeyInput = document.querySelector('#supabase-key');
const workspaceKeyInput = document.querySelector('#workspace-key');
const syncStatus = document.querySelector('#sync-status');
const authEmailInput = document.querySelector('#auth-email');
const authEmailRow = document.querySelector('#auth-email-row');
const authStatus = document.querySelector('#auth-status');
const authActions = document.querySelector('.auth-actions');
const sendLoginButton = document.querySelector('#send-login-button');
const signOutButton = document.querySelector('#sign-out-button');
const invitePanel = document.querySelector('#invite-panel');
const createInviteButton = document.querySelector('#create-invite-button');
const copyInviteButton = document.querySelector('#copy-invite-button');
const inviteLinkInput = document.querySelector('#invite-link');

let selectedAttachment = null;
let editingItem = null;
let cloudConfig = loadCloudConfig();
let supabaseClient = createSupabaseClient();
let currentUser = null;
let authSubscription = null;
let pendingInviteToken = getInviteTokenFromUrl();
let inviteAcceptInFlight = false;
let notificationPollTimer = null;
let isLoadingNotifications = false;
const seenNotificationIds = new Set();

form.addEventListener('submit', (event) => {
  event.preventDefault();
  addItem();
});

searchInput.addEventListener('input', () => {
  state.query = searchInput.value;
  saveState();
  render();
});

clearDoneButton.addEventListener('click', () => {
  state.tasks = state.tasks.filter((item) => !item.done);
  saveState();
  render();
});

exportButton.addEventListener('click', exportData);
syncButton.addEventListener('click', openSyncDialog);
gateAuthForm.addEventListener('submit', (event) => {
  event.preventDefault();
  authEmailInput.value = gateAuthEmail.value;
  sendMagicLink();
});
inviteAuthForm.addEventListener('submit', (event) => {
  event.preventDefault();
  authEmailInput.value = inviteAuthEmail.value;
  gateAuthEmail.value = inviteAuthEmail.value;
  sendMagicLink();
});
inviteFamilyButton.addEventListener('click', () => {
  openSyncDialog();
  inviteLinkInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
});
fileInput.addEventListener('change', handleFileSelection);
dateInput.addEventListener('change', updateDatePresetState);
datePresetButtons.forEach((button) => {
  button.addEventListener('click', () => applyDatePreset(button));
});
detailForm.addEventListener('submit', saveDetail);
closeDetailButton.addEventListener('click', () => detailDialog.close());
deleteDetailButton.addEventListener('click', deleteEditingItem);
detailDialog.addEventListener('close', () => {
  editingItem = null;
});
syncForm.addEventListener('submit', saveCloudConfig);
closeSyncButton.addEventListener('click', () => syncDialog.close());
disconnectSyncButton.addEventListener('click', disconnectCloud);
pullSyncButton.addEventListener('click', pullFromCloud);
pushSyncButton.addEventListener('click', pushToCloud);
sendLoginButton.addEventListener('click', sendMagicLink);
signOutButton.addEventListener('click', signOut);
createInviteButton.addEventListener('click', createInviteLink);
copyInviteButton.addEventListener('click', copyInviteLink);

tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    state.activeTab = tab.dataset.tab;
    state.query = '';
    input.value = '';
    dateInput.value = '';
    noteInput.value = '';
    fileInput.value = '';
    selectedAttachment = null;
    fileRow.querySelector('span').textContent = 'Прикрепить фото или PDF';
    updateDatePresetState();
    searchInput.value = '';
    saveState();
    render();
  });
});

updateCloudBadge();
render();
initAuth();

function createItem(title, category = 'Общее', dueDate = '', note = '', done = false, attachment = null) {
  return {
    id: Date.now() + Math.floor(Math.random() * 100000),
    title,
    category,
    dueDate,
    note,
    done,
    attachment,
    createdAt: new Date().toISOString(),
  };
}

function loadState() {
  try {
    const saved = localStorage.getItem(storageKey) || localStorage.getItem(legacyStorageKey);
    if (!saved) return structuredClone(defaultState);

    const parsed = JSON.parse(saved);
    return {
      ...structuredClone(defaultState),
      ...parsed,
      tasks: normalizeList(parsed.tasks, defaultState.tasks),
      shopping: normalizeList(parsed.shopping, defaultState.shopping),
      documents: normalizeList(parsed.documents, defaultState.documents),
      family: normalizeList(parsed.family, defaultState.family),
      query: '',
    };
  } catch {
    return structuredClone(defaultState);
  }
}

function normalizeList(items, fallback) {
  if (!Array.isArray(items)) return fallback;

  return items.map((item) => ({
    id: item.id || Date.now() + Math.floor(Math.random() * 100000),
    title: item.title || 'Без названия',
    category: item.category || categoryFromMeta(item.meta),
    dueDate: item.dueDate || '',
    note: item.note || noteFromMeta(item.meta),
    done: Boolean(item.done),
    attachment: item.attachment || null,
    createdAt: item.createdAt || new Date().toISOString(),
  }));
}

function categoryFromMeta(meta = '') {
  if (!meta.includes('·')) return 'Общее';
  return meta.split('·').pop().trim() || 'Общее';
}

function noteFromMeta(meta = '') {
  if (!meta) return '';
  return meta.replaceAll('·', ' ').trim();
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function loadCloudConfig() {
  try {
    const productionConfig = window.LIFEHUB_CONFIG || {};
    const saved = localStorage.getItem(cloudConfigKey);
    const savedConfig = saved ? JSON.parse(saved) : {};
    const workspaceKey = savedConfig.workspaceKey || makeWorkspaceKey();
    if (productionConfig.supabaseUrl && productionConfig.supabaseAnonKey) {
      return {
        url: productionConfig.supabaseUrl,
        key: productionConfig.supabaseAnonKey,
        workspaceKey,
      };
    }
    if (!saved) {
      return {
        url: '',
        key: '',
        workspaceKey: makeWorkspaceKey(),
      };
    }
    return JSON.parse(saved);
  } catch {
    return { url: '', key: '', workspaceKey: makeWorkspaceKey() };
  }
}

function makeWorkspaceKey() {
  return globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : `workspace-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function saveCloudConfigToStorage() {
  localStorage.setItem(cloudConfigKey, JSON.stringify({
    workspaceKey: cloudConfig.workspaceKey,
  }));
}

function createSupabaseClient() {
  if (!cloudConfig.url || !cloudConfig.key || !window.supabase?.createClient) return null;
  return window.supabase.createClient(cloudConfig.url, cloudConfig.key, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
}

function isCloudReady() {
  return Boolean(supabaseClient && cloudConfig.workspaceKey);
}

function updateCloudBadge(text) {
  syncButton.textContent = text || (currentUser ? 'Семья' : 'Войти');
  syncButton.classList.toggle('connected', Boolean(currentUser));
}

async function addItem() {
  const tab = state.activeTab;
  const value = input.value.trim();
  if (!value || tab === 'home') return;
  const submitButton = form.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  submitButton.textContent = 'Сохраняю...';
  try {
    const attachment = tab === 'documents' ? await prepareAttachmentForSave() : null;

    const item = createItem(
      value,
      defaultCategory(tab),
      dateInput.value,
      noteInput.value.trim(),
      false,
      attachment,
    );

    state[tab] = [item, ...state[tab]];
    if (isCloudReady() && currentUser) {
      await upsertCloudItem(tab, item);
    }
    input.value = '';
    dateInput.value = '';
    noteInput.value = '';
    fileInput.value = '';
    selectedAttachment = null;
    fileRow.querySelector('span').textContent = 'Прикрепить фото или PDF';
    updateDatePresetState();
    saveState();
    render();
  } catch (error) {
    alert(error.message || 'Не получилось сохранить карточку.');
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Добавить';
  }
}

function defaultCategory(tab) {
  if (tab === 'shopping') return 'Покупка';
  if (tab === 'documents') return 'Документ';
  if (tab === 'family') return 'Семья';
  return 'Дом';
}

function render() {
  const tab = state.activeTab;
  title.textContent = labels[tab];

  tabs.forEach((button) => {
    button.classList.toggle('active', button.dataset.tab === tab);
  });

  homeScreen.classList.toggle('active', tab === 'home');
  listScreen.classList.toggle('active', tab !== 'home');
  renderHome();

  if (tab !== 'home') {
    input.placeholder = placeholders[tab];
    searchInput.value = state.query;
    clearDoneButton.style.display = tab === 'tasks' ? 'block' : 'none';
    inviteFamilyButton.style.display = tab === 'family' ? 'block' : 'none';
    fileRow.classList.toggle('visible', tab === 'documents');
    listTitle.textContent = sectionTitles[tab];
    renderList(tab);
  }

  checkDueReminders();
}

function renderHome() {
  const activeTasks = state.tasks.filter((item) => !item.done);
  const soonItems = allItems().filter((item) => !item.done && item.dueDate && daysUntil(item.dueDate) <= 14);
  const focus = allItems()
    .filter((item) => !item.done)
    .sort(compareByDueDate)
    .slice(0, 5);

  document.querySelector('#task-count').textContent = activeTasks.length;
  document.querySelector('#soon-count').textContent = soonItems.length;
  document.querySelector('#document-count').textContent = state.documents.length;
  document.querySelector('#hero-headline').textContent = `${activeTasks.length} дел ждут внимания`;
  document.querySelector('#hero-copy').textContent =
    focus[0]?.dueDate ? `Ближайшее: ${focus[0].title} · ${formatDue(focus[0].dueDate)}` : 'Сегодня можно спокойно разобрать домашние мелочи.';

  focusList.innerHTML = '';
  if (!focus.length) {
    focusList.appendChild(emptyState('Ближайших дел пока нет.'));
    return;
  }
  focus.forEach((item) => focusList.appendChild(createCard(item, 'home')));
}

function renderList(tab) {
  const query = state.query.trim().toLowerCase();
  const items = state[tab]
    .filter((item) => {
      if (!query) return true;
      return [item.title, item.category, item.note].join(' ').toLowerCase().includes(query);
    })
    .sort(compareByDueDate);

  itemList.innerHTML = '';
  if (!items.length) {
    itemList.appendChild(emptyState(query ? 'Ничего не найдено.' : 'Список пуст.'));
    return;
  }
  items.forEach((item) => itemList.appendChild(createCard(item, tab)));
}

function allItems() {
  return [
    ...state.tasks.map((item) => ({ ...item, source: 'tasks' })),
    ...state.shopping.map((item) => ({ ...item, source: 'shopping' })),
    ...state.documents.map((item) => ({ ...item, source: 'documents' })),
    ...state.family.map((item) => ({ ...item, source: 'family' })),
  ];
}

function createCard(item, mode) {
  const card = document.createElement('article');
  card.className = `card ${item.done ? 'done' : ''}`;

  const marker = document.createElement('button');
  marker.type = 'button';
  marker.className = 'marker';
  marker.textContent = item.done ? '✓' : markerText(item.source || mode);
  marker.addEventListener('click', () => {
    if (mode === 'tasks') toggleTask(item.id);
  });

  const content = document.createElement('div');
  content.className = 'card-main';

  const cardTitle = document.createElement('span');
  cardTitle.className = 'card-title';
  cardTitle.textContent = item.title;

  const meta = document.createElement('span');
  meta.className = 'card-meta';
  meta.textContent = [item.category, item.dueDate ? formatDue(item.dueDate) : 'без даты']
    .filter(Boolean)
    .join(' · ');

  content.append(cardTitle, meta);

  if (item.note) {
    const note = document.createElement('span');
    note.className = 'card-note';
    note.textContent = item.note;
    content.appendChild(note);
  }

  if (item.dueDate) {
    const chip = document.createElement('span');
    chip.className = `status-chip ${statusClass(item.dueDate)}`;
    chip.textContent = statusLabel(item.dueDate);
    content.appendChild(chip);
  }

  if (item.attachment) {
    const attachment = document.createElement('span');
    attachment.className = 'attachment-chip';
    attachment.textContent = item.attachment.type.startsWith('image/') ? 'фото прикреплено' : 'файл прикреплен';
    content.appendChild(attachment);
  }

  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'delete-button';
  remove.textContent = '×';
  remove.addEventListener('click', () => deleteItem(item.id));

  content.addEventListener('click', () => openDetail(item.id));

  card.append(marker, content, remove);
  return card;
}

function markerText(mode) {
  if (mode === 'documents') return 'D';
  if (mode === 'shopping') return 'S';
  if (mode === 'family') return 'F';
  return 'T';
}

async function prepareAttachmentForSave() {
  if (!selectedAttachment) return null;
  if (!selectedAttachment.file) return selectedAttachment;
  return uploadAttachment(selectedAttachment.file);
}

async function uploadAttachment(file) {
  if (!isCloudReady() || !currentUser) throw new Error('Войди в аккаунт перед загрузкой файла.');

  const cleanName = file.name.replace(/[^\w.\-а-яА-ЯёЁ]+/g, '-');
  const path = `${cloudConfig.workspaceKey}/${Date.now()}-${cleanName}`;
  const { error } = await supabaseClient.storage
    .from(storageBucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || 'application/octet-stream',
    });

  if (error) throw error;

  const { data } = supabaseClient.storage.from(storageBucket).getPublicUrl(path);
  return {
    name: file.name,
    type: file.type || 'application/octet-stream',
    size: file.size,
    path,
    url: data.publicUrl,
  };
}

function toggleTask(id) {
  state.tasks = state.tasks.map((task) =>
    task.id === id ? { ...task, done: !task.done } : task,
  );
  const task = state.tasks.find((item) => item.id === id);
  if (task && isCloudReady() && currentUser) {
    upsertCloudItem('tasks', task).catch(console.error);
  }
  saveState();
  render();
}

function deleteItem(id) {
  const found = findItem(id);
  ['tasks', 'shopping', 'documents', 'family'].forEach((key) => {
    state[key] = state[key].filter((item) => item.id !== id);
  });
  if (found && isCloudReady() && currentUser) {
    deleteCloudItem(found.key, found.item).catch(console.error);
  }
  saveState();
  render();
}

function emptyState(text) {
  const empty = document.createElement('div');
  empty.className = 'empty';
  empty.textContent = text;
  return empty;
}

function compareByDueDate(a, b) {
  if (!a.dueDate && !b.dueDate) return newestFirst(a, b);
  if (!a.dueDate) return 1;
  if (!b.dueDate) return -1;
  return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
}

function newestFirst(a, b) {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

function daysFromNow(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function applyDatePreset(button) {
  if (button.hasAttribute('data-clear-date')) {
    dateInput.value = '';
  } else {
    dateInput.value = daysFromNow(Number(button.dataset.days || 0));
  }
  updateDatePresetState();
}

function updateDatePresetState() {
  datePresetButtons.forEach((button) => {
    const expected = button.hasAttribute('data-clear-date')
      ? ''
      : daysFromNow(Number(button.dataset.days || 0));
    button.classList.toggle('active', dateInput.value === expected);
  });
}

function openSyncDialog() {
  supabaseUrlInput.value = cloudConfig.url || '';
  supabaseKeyInput.value = cloudConfig.key ? `${cloudConfig.key.slice(0, 12)}...` : '';
  workspaceKeyInput.value = cloudConfig.workspaceKey || '';
  inviteLinkInput.value = '';
  updateAuthUI();
  setSyncStatus(supabaseClient ? 'Войди по email, чтобы включить семейную синхронизацию.' : 'Приложение еще не подключено к серверу.', !supabaseClient);
  syncDialog.showModal();
}

async function saveCloudConfig(event) {
  event.preventDefault();
  supabaseClient = createSupabaseClient();
  updateCloudBadge();

  if (!supabaseClient) {
    setSyncStatus('Приложение еще не подключено к серверу.', true);
    return;
  }

  try {
    await initAuth();
    setSyncStatus(currentUser ? 'Аккаунт подключен. Семейные дела синхронизируются.' : 'Войди по email, чтобы включить семейную синхронизацию.', false, true);
  } catch (error) {
    setSyncStatus(error.message || 'Не получилось подключиться к аккаунту.', true);
  }
}

async function pushToCloud() {
  if (!isCloudReady() || !currentUser) {
    setSyncStatus('Сначала войди в аккаунт.', true);
    return;
  }

  setSyncStatus('Выгружаю локальные карточки...');
  try {
    const rows = await pushStateToCloud();
    setSyncStatus(`Готово: выгружено ${rows.length} карточек.`, false, true);
  } catch (error) {
    setSyncStatus(error.message || 'Выгрузка не удалась.', true);
  }
}

async function pullFromCloud() {
  if (!isCloudReady() || !currentUser) {
    setSyncStatus('Сначала войди в аккаунт.', true);
    return;
  }

  setSyncStatus('Обновляю семейные данные...');
  try {
    const data = await loadStateFromCloud();
    if (!data.length) {
      setSyncStatus('В облаке пока нет карточек. Локальные данные оставлены на месте.', false, true);
      return;
    }
    setSyncStatus(`Готово: загружено ${data.length} карточек.`, false, true);
  } catch (error) {
    setSyncStatus(error.message || 'Загрузка не удалась.', true);
  }
}

async function syncAfterLogin() {
  await ensureHousehold();
  await pushStateToCloud();
  await loadStateFromCloud();
  startNotificationPolling();
  checkDueReminders();
  setSyncStatus('Аккаунт подключен. Семейные дела синхронизированы.', false, true);
}

async function pushStateToCloud() {
  const rows = ['tasks', 'shopping', 'documents', 'family'].flatMap((list) =>
    state[list].map((item) => itemToRow(list, item)),
  );
  if (rows.length) {
    const { error } = await supabaseClient
      .from('lifehub_items')
      .upsert(rows, { onConflict: 'workspace_key,id' });
    if (error) throw error;
  }
  return rows;
}

async function loadStateFromCloud() {
  const { data, error } = await supabaseClient
    .from('lifehub_items')
    .select('*')
    .eq('workspace_key', cloudConfig.workspaceKey)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  if (!data.length) return data;

  state.tasks = [];
  state.shopping = [];
  state.documents = [];
  state.family = [];
  data.forEach((row) => {
    if (state[row.list]) state[row.list].push(rowToItem(row));
  });
  saveState();
  render();
  checkDueReminders();
  return data;
}

function disconnectCloud() {
  if (supabaseClient) {
    supabaseClient.auth.signOut().catch(console.error);
  }
  currentUser = null;
  stopNotificationPolling();
  updateCloudBadge();
  updateAuthUI();
  setSyncStatus('Ты вышел из аккаунта. Локальные данные остаются на устройстве.');
}

function setSyncStatus(message, isError = false, isOk = false) {
  syncStatus.textContent = message;
  syncStatus.classList.toggle('error', isError);
  syncStatus.classList.toggle('ok', isOk);
}

function showToast(titleText, bodyText = '', type = 'info') {
  if (!toastStack) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const titleLine = document.createElement('strong');
  titleLine.textContent = titleText;
  toast.appendChild(titleLine);

  if (bodyText) {
    const bodyLine = document.createElement('span');
    bodyLine.textContent = bodyText;
    toast.appendChild(bodyLine);
  }

  toastStack.appendChild(toast);
  window.setTimeout(() => {
    toast.classList.add('leaving');
    window.setTimeout(() => toast.remove(), 220);
  }, 5200);
}

async function requestNotificationAccess() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

function notifyBrowser(titleText, bodyText) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  if (document.visibilityState === 'visible') return;
  new Notification(titleText, {
    body: bodyText,
    icon: 'icon.svg',
    badge: 'icon.svg',
  });
}

function startNotificationPolling() {
  if (!currentUser || !isCloudReady()) return;
  stopNotificationPolling();
  loadNotifications().catch(console.error);
  notificationPollTimer = window.setInterval(() => {
    loadNotifications().catch(console.error);
    checkDueReminders();
  }, 30000);
}

function stopNotificationPolling() {
  if (!notificationPollTimer) return;
  window.clearInterval(notificationPollTimer);
  notificationPollTimer = null;
}

async function loadNotifications() {
  if (!currentUser || !isCloudReady() || isLoadingNotifications) return;
  isLoadingNotifications = true;

  try {
    const { data, error } = await supabaseClient
      .from('lifehub_notifications')
      .select('id,type,title,body,payload,created_at')
      .eq('target_user_id', currentUser.id)
      .is('read_at', null)
      .order('created_at', { ascending: true })
      .limit(20);

    if (error) {
      if (['42P01', 'PGRST205'].includes(error.code)) return;
      throw error;
    }

    if (!data?.length) return;

    let shouldRefreshFamily = false;
    data.forEach((notification) => {
      if (seenNotificationIds.has(notification.id)) return;
      seenNotificationIds.add(notification.id);
      showToast(notification.title || 'LifeHub', notification.body || '');
      notifyBrowser(notification.title || 'LifeHub', notification.body || '');
      if (notification.type === 'invite_accepted') shouldRefreshFamily = true;
    });

    const ids = data.map((notification) => notification.id);
    await supabaseClient
      .from('lifehub_notifications')
      .update({ read_at: new Date().toISOString() })
      .in('id', ids)
      .eq('target_user_id', currentUser.id);

    if (shouldRefreshFamily) {
      await loadStateFromCloud();
    }
  } finally {
    isLoadingNotifications = false;
  }
}

function checkDueReminders() {
  const todayKey = new Date().toISOString().slice(0, 10);
  const seen = loadReminderSeen();
  let touched = false;

  allItems()
    .filter((item) => !item.done && item.dueDate)
    .forEach((item) => {
      const days = daysUntil(item.dueDate);
      if (days < 0 || days > 2) return;

      const key = `${todayKey}:${item.source}:${item.id}:${item.dueDate}`;
      if (seen[key]) return;

      const titleText = days === 0
        ? 'Сегодня срок'
        : days === 1
          ? 'Срок завтра'
          : `Срок через ${days} дня`;
      const bodyText = [item.title, labels[item.source], item.category].filter(Boolean).join(' · ');
      showToast(titleText, bodyText, 'reminder');
      notifyBrowser(titleText, bodyText);
      seen[key] = true;
      touched = true;
    });

  if (touched) saveReminderSeen(seen);
}

function loadReminderSeen() {
  try {
    return JSON.parse(localStorage.getItem(reminderSeenKey) || '{}');
  } catch {
    return {};
  }
}

function saveReminderSeen(seen) {
  const entries = Object.entries(seen).slice(-120);
  localStorage.setItem(reminderSeenKey, JSON.stringify(Object.fromEntries(entries)));
}

async function initAuth() {
  if (!supabaseClient) {
    currentUser = null;
    updateAuthUI();
    return;
  }

  if (authSubscription) {
    authSubscription.unsubscribe();
    authSubscription = null;
  }

  const { data } = await supabaseClient.auth.getSession();
  currentUser = data.session?.user || null;
  updateAuthUI();
  if (currentUser) {
    if (pendingInviteToken) {
      await acceptPendingInvite();
    } else {
      await syncAfterLogin();
    }
  }

  const { data: listener } = supabaseClient.auth.onAuthStateChange(async (_event, session) => {
    currentUser = session?.user || null;
    updateAuthUI();
    updateCloudBadge();
    if (currentUser) {
      if (pendingInviteToken) {
        await acceptPendingInvite();
      } else {
        await syncAfterLogin();
      }
    }
  });
  authSubscription = listener.subscription;
}

function updateAuthUI() {
  if (!authStatus) return;
  const hasPendingInvite = Boolean(pendingInviteToken);
  document.body.classList.toggle('invite-active', hasPendingInvite && !currentUser);
  inviteScreen.classList.toggle('visible', hasPendingInvite && !currentUser);
  inviteLoginButton.disabled = !isCloudReady() || Boolean(currentUser);

  if (!isCloudReady()) {
    authGate.classList.add('visible');
    gateAuthCopy.textContent = 'Приложение еще не подключено к серверу. Сообщи владельцу LifeHub.';
    inviteCopy.textContent = 'LifeHub пока не подключен к серверу. Попроси владельца приложения проверить настройки.';
    authStatus.textContent = 'Приложение еще не подключено к серверу.';
    sendLoginButton.disabled = true;
    gateLoginButton.disabled = true;
    inviteLoginButton.disabled = true;
    signOutButton.disabled = true;
    createInviteButton.disabled = true;
    copyInviteButton.disabled = true;
    authEmailRow.hidden = false;
    sendLoginButton.hidden = false;
    signOutButton.hidden = true;
    invitePanel.hidden = true;
    return;
  }

  authGate.classList.toggle('visible', !currentUser);
  gateLoginButton.disabled = Boolean(currentUser);
  gateAuthCopy.textContent = hasPendingInvite
    ? 'Войди по email, чтобы принять приглашение в семью.'
    : 'Мы отправим ссылку на email. Пароль не нужен.';
  inviteCopy.textContent = 'Войди по email, и LifeHub сразу подключит тебя к общим делам, покупкам и документам семьи.';
  sendLoginButton.disabled = false;
  inviteLoginButton.disabled = Boolean(currentUser);
  signOutButton.disabled = !currentUser;
  createInviteButton.disabled = !currentUser;
  copyInviteButton.disabled = !inviteLinkInput.value;
  copyInviteButton.hidden = !inviteLinkInput.value;
  authEmailRow.hidden = Boolean(currentUser);
  sendLoginButton.hidden = Boolean(currentUser);
  signOutButton.hidden = !currentUser;
  invitePanel.hidden = !currentUser;
  authActions.classList.toggle('solo', Boolean(currentUser));
  authStatus.textContent = currentUser
    ? `Вошел: ${currentUser.email || currentUser.id}`
    : 'Войди по email, чтобы создавать семейные ссылки.';
}

async function sendMagicLink() {
  if (!isCloudReady()) {
    setSyncStatus('Приложение еще не подключено к серверу.', true);
    return;
  }

  const email = (authEmailInput.value || gateAuthEmail.value || inviteAuthEmail.value).trim();
  if (!email) {
    setSyncStatus('Введи email для входа.', true);
    if (pendingInviteToken) {
      inviteCopy.textContent = 'Введи email, чтобы принять приглашение.';
    }
    return;
  }
  authEmailInput.value = email;
  gateAuthEmail.value = email;
  inviteAuthEmail.value = email;
  requestNotificationAccess().catch(console.error);

  const { error } = await supabaseClient.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: window.location.href,
    },
  });

  if (error) {
    setSyncStatus(error.message, true);
    return;
  }

  setSyncStatus('Отправил ссылку для входа на email. Открой ее на этом устройстве.', false, true);
  gateAuthCopy.textContent = 'Ссылка отправлена. Проверь почту и открой письмо на этом устройстве.';
  if (pendingInviteToken) {
    inviteCopy.textContent = 'Ссылка отправлена. Открой письмо на этом устройстве, и LifeHub сразу подключит тебя к семье.';
  }
  showToast('Письмо отправлено', 'Открой magic-link на этом же устройстве.');
}

async function signOut() {
  if (!supabaseClient) return;
  await supabaseClient.auth.signOut();
  currentUser = null;
  stopNotificationPolling();
  updateAuthUI();
  updateCloudBadge();
  setSyncStatus('Ты вышел из аккаунта.');
  showToast('Аккаунт отключен', 'Локальные данные остались на устройстве.');
}

async function createInviteLink() {
  if (!isCloudReady()) {
    setSyncStatus('Сначала войди в аккаунт.', true);
    return;
  }
  if (!currentUser) {
    setSyncStatus('Сначала войди по email.', true);
    return;
  }

  try {
    await ensureHousehold();
    await pushStateToCloud();
    const token = makeInviteToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 14);

    const { error } = await supabaseClient.from('lifehub_invites').insert({
      token,
      workspace_key: cloudConfig.workspaceKey,
      created_by: currentUser.id,
      expires_at: expiresAt.toISOString(),
    });
    if (error) throw error;

    inviteLinkInput.value = `${window.location.origin}${window.location.pathname}?invite=${token}`;
    copyInviteButton.disabled = false;
    copyInviteButton.hidden = false;
    setSyncStatus('Инвайт создан. Ссылка действует 14 дней.', false, true);
    showToast('Инвайт готов', 'Ссылка действует 14 дней. После входа участник появится в семье.');
  } catch (error) {
    setSyncStatus(error.message || 'Не получилось создать инвайт.', true);
  }
}

async function copyInviteLink() {
  if (!inviteLinkInput.value) return;
  await navigator.clipboard.writeText(inviteLinkInput.value);
  setSyncStatus('Ссылка скопирована.', false, true);
  showToast('Ссылка скопирована', 'Можно отправлять ее в чат или почту.');
}

async function ensureHousehold() {
  const { error: householdError } = await supabaseClient.from('lifehub_households').upsert({
    workspace_key: cloudConfig.workspaceKey,
    name: 'LifeHub family',
    owner_user_id: currentUser.id,
  }, { onConflict: 'workspace_key' });
  if (householdError) throw householdError;

  const { error: memberError } = await supabaseClient.from('lifehub_members').upsert({
    workspace_key: cloudConfig.workspaceKey,
    user_id: currentUser.id,
    email: currentUser.email || '',
    role: 'owner',
  }, { onConflict: 'workspace_key,user_id' });
  if (memberError) throw memberError;
}

async function acceptPendingInvite() {
  if (!pendingInviteToken || !isCloudReady() || !currentUser || inviteAcceptInFlight) return;

  try {
    inviteAcceptInFlight = true;
    const { data: workspaceKey, error } = await supabaseClient
      .rpc('accept_lifehub_invite', { invite_token: pendingInviteToken });
    if (error) throw error;

    cloudConfig.workspaceKey = workspaceKey;
    workspaceKeyInput.value = cloudConfig.workspaceKey;
    saveCloudConfigToStorage();
    updateCloudBadge();

    await loadStateFromCloud();
    const memberItem = addFamilyMemberFromAuth(currentUser.email || 'Новый участник');
    if (memberItem) await upsertCloudItem('family', memberItem);
    pendingInviteToken = '';
    window.history.replaceState({}, document.title, window.location.pathname);
    updateAuthUI();
    startNotificationPolling();
    checkDueReminders();
    setSyncStatus('Инвайт принят. Ты добавлен в семью.', false, true);
    showToast('Ты в семье', 'Общие дела уже загружены в LifeHub.');
  } catch (error) {
    setSyncStatus(error.message || 'Не получилось принять инвайт.', true);
    inviteCopy.textContent = error.message || 'Не получилось принять приглашение. Попроси новую ссылку.';
  } finally {
    inviteAcceptInFlight = false;
  }
}

function addFamilyMemberFromAuth(email) {
  if (state.family.some((item) => item.title === email)) return null;
  const item = createItem(email, 'Участник', '', 'Добавлен по инвайт-ссылке');
  state.family = [
    item,
    ...state.family,
  ];
  saveState();
  render();
  return item;
}

function getInviteTokenFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('invite') || '';
}

function makeInviteToken() {
  const bytes = new Uint8Array(18);
  globalThis.crypto?.getRandomValues?.(bytes);
  if (bytes.some(Boolean)) {
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function daysUntil(value) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(`${value}T00:00:00`);
  return Math.ceil((date.getTime() - today.getTime()) / 86400000);
}

function statusClass(value) {
  const days = daysUntil(value);
  if (days < 0) return 'overdue';
  if (days <= 14) return 'soon';
  return '';
}

function statusLabel(value) {
  const days = daysUntil(value);
  if (days < 0) return `просрочено ${Math.abs(days)} дн.`;
  if (days === 0) return 'сегодня';
  if (days === 1) return 'завтра';
  if (days <= 14) return `через ${days} дн.`;
  return 'запланировано';
}

function formatDue(value) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`));
}

function handleFileSelection() {
  const file = fileInput.files?.[0];
  if (!file) {
    selectedAttachment = null;
    return;
  }

  const maxSize = isCloudReady() && currentUser ? 10000000 : 1500000;
  if (file.size > maxSize) {
    alert(isCloudReady() && currentUser
      ? 'Файл слишком большой. Для текущего облачного режима выбери файл до 10 МБ.'
      : 'Файл слишком большой. Для локальной версии выбери фото или PDF до 1.5 МБ.');
    fileInput.value = '';
    selectedAttachment = null;
    return;
  }

  if (isCloudReady() && currentUser) {
    selectedAttachment = {
      file,
      name: file.name,
      type: file.type || 'application/octet-stream',
      size: file.size,
    };
    fileRow.querySelector('span').textContent = `Прикреплено: ${file.name}`;
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    selectedAttachment = {
      name: file.name,
      type: file.type || 'application/octet-stream',
      size: file.size,
      dataUrl: reader.result,
    };
    fileRow.querySelector('span').textContent = `Прикреплено: ${file.name}`;
  };
  reader.readAsDataURL(file);
}

function openDetail(id) {
  const found = findItem(id);
  if (!found) return;

  editingItem = found;
  detailHeading.textContent = found.item.title;
  detailTitle.value = found.item.title;
  detailDate.value = found.item.dueDate || '';
  detailCategory.value = found.item.category || '';
  detailNote.value = found.item.note || '';
  renderAttachmentPanel(found.item.attachment);

  if (typeof detailDialog.showModal === 'function') {
    detailDialog.showModal();
  }
}

function findItem(id) {
  for (const key of ['tasks', 'shopping', 'documents', 'family']) {
    const item = state[key].find((entry) => entry.id === id);
    if (item) return { key, item };
  }
  return null;
}

function renderAttachmentPanel(attachment) {
  attachmentPanel.innerHTML = '';
  attachmentPanel.classList.toggle('visible', Boolean(attachment));
  if (!attachment) return;

  const preview = document.createElement('div');
  preview.className = 'attachment-preview';

  if (attachment.type.startsWith('image/')) {
    const image = document.createElement('img');
    image.src = attachment.url || attachment.dataUrl;
    image.alt = attachment.name;
    preview.appendChild(image);
  } else {
    const box = document.createElement('div');
    box.className = 'attachment-thumb';
    box.textContent = 'PDF';
    preview.appendChild(box);
  }

  const info = document.createElement('div');
  const link = document.createElement('a');
  link.href = attachment.url || attachment.dataUrl;
  link.target = '_blank';
  link.rel = 'noreferrer';
  link.textContent = attachment.name;

  const meta = document.createElement('span');
  meta.className = 'card-meta';
  meta.textContent = `${Math.ceil(attachment.size / 1024)} КБ`;

  info.append(link, meta);
  preview.appendChild(info);
  attachmentPanel.appendChild(preview);
}

function itemToRow(list, item) {
  return {
    id: String(item.id),
    workspace_key: cloudConfig.workspaceKey,
    list,
    title: item.title,
    category: item.category,
    due_date: item.dueDate || null,
    note: item.note || '',
    done: Boolean(item.done),
    attachment: item.attachment || null,
    created_at: item.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function rowToItem(row) {
  return {
    id: Number(row.id) || row.id,
    title: row.title,
    category: row.category || 'Общее',
    dueDate: row.due_date || '',
    note: row.note || '',
    done: Boolean(row.done),
    attachment: row.attachment || null,
    createdAt: row.created_at || new Date().toISOString(),
  };
}

async function upsertCloudItem(list, item) {
  if (!isCloudReady() || !currentUser) return;
  const { error } = await supabaseClient
    .from('lifehub_items')
    .upsert(itemToRow(list, item), { onConflict: 'workspace_key,id' });
  if (error) throw error;
}

async function deleteCloudItem(list, item) {
  if (!isCloudReady() || !currentUser) return;
  const { error } = await supabaseClient
    .from('lifehub_items')
    .delete()
    .eq('workspace_key', cloudConfig.workspaceKey)
    .eq('list', list)
    .eq('id', String(item.id));
  if (error) throw error;
}

function saveDetail(event) {
  event.preventDefault();
  if (!editingItem) return;

  const next = {
    ...editingItem.item,
    title: detailTitle.value.trim() || editingItem.item.title,
    dueDate: detailDate.value,
    category: detailCategory.value.trim() || 'Общее',
    note: detailNote.value.trim(),
  };

  state[editingItem.key] = state[editingItem.key].map((item) =>
    item.id === editingItem.item.id ? next : item,
  );
  if (isCloudReady() && currentUser) {
    upsertCloudItem(editingItem.key, next).catch(console.error);
  }
  saveState();
  detailDialog.close();
  editingItem = null;
  render();
}

function deleteEditingItem() {
  if (!editingItem) return;
  deleteItem(editingItem.item.id);
  detailDialog.close();
  editingItem = null;
}

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `lifehub-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

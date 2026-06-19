const storageKey = 'lifehub-pwa-state-v2';
const legacyStorageKey = 'lifehub-pwa-state-v1';
const cloudConfigKey = 'lifehub-supabase-config-v1';
const storageBucket = 'lifehub-files';
const reminderSeenKey = 'lifehub-reminder-seen-v1';
const profileKey = 'lifehub-profile-v1';
const serviceWorkerPath = 'sw.js';

const avatarOptions = [
  { id: 'lime', symbol: '◆', color: '#daff72' },
  { id: 'sky', symbol: '●', color: '#b8d8ff' },
  { id: 'coral', symbol: '✦', color: '#ffb199' },
  { id: 'mint', symbol: '▲', color: '#a9f0d1' },
  { id: 'sun', symbol: '■', color: '#ffe08a' },
  { id: 'rose', symbol: '✚', color: '#ffc6de' },
];

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
const accessScreen = document.querySelector('#access-screen');
const accessKicker = document.querySelector('#access-kicker');
const accessTitle = document.querySelector('#access-title');
const accessCopy = document.querySelector('#access-copy');
const accessModeTabs = document.querySelector('#access-mode-tabs');
const accessModeButtons = Array.from(document.querySelectorAll('[data-auth-mode]'));
const accessAuthForm = document.querySelector('#access-auth-form');
const accessNameRow = document.querySelector('#access-name-row');
const accessProfileName = document.querySelector('#access-profile-name');
const avatarPicker = document.querySelector('#avatar-picker');
const accessAuthEmail = document.querySelector('#access-auth-email');
const accessSubmitButton = document.querySelector('#access-submit-button');
const accessHelper = document.querySelector('#access-helper');
const accessStatus = document.querySelector('#access-status');
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
let localProfile = loadProfile();
let selectedAvatar = localProfile.avatar || randomAvatarId();
let cloudConfig = loadCloudConfig();
let supabaseClient = createSupabaseClient();
let currentUser = null;
let authSubscription = null;
let pendingInviteToken = getInviteTokenFromUrl();
let authMode = pendingInviteToken ? 'invite' : 'login';
let inviteAcceptInFlight = false;
let notificationPollTimer = null;
let isLoadingNotifications = false;
let serviceWorkerRegistration = null;
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

if (exportButton) {
  exportButton.addEventListener('click', exportData);
}
syncButton.addEventListener('click', openSyncDialog);
accessAuthForm.addEventListener('submit', (event) => {
  event.preventDefault();
  authEmailInput.value = accessAuthEmail.value;
  sendMagicLink();
});
accessModeButtons.forEach((button) => {
  button.addEventListener('click', () => {
    authMode = button.dataset.authMode || 'login';
    if (authMode === 'signup' && !accessProfileName.value.trim()) {
      accessProfileName.value = localProfile.name || '';
    }
    updateAuthUI();
  });
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
renderAvatarPicker();
render();
registerServiceWorker();
initAuth();

function createItem(title, category = 'Общее', dueDate = '', note = '', done = false, attachment = null, avatar = '') {
  return {
    id: Date.now() + Math.floor(Math.random() * 100000),
    title,
    category,
    dueDate,
    note,
    done,
    attachment,
    avatar,
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
    avatar: item.avatar || '',
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

function loadProfile() {
  try {
    return JSON.parse(localStorage.getItem(profileKey) || '{}');
  } catch {
    return {};
  }
}

function saveProfile(profile) {
  localStorage.setItem(profileKey, JSON.stringify(profile));
  localProfile = profile;
}

function randomAvatarId(seed = '') {
  if (seed) {
    const sum = [...seed].reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return avatarOptions[sum % avatarOptions.length].id;
  }
  return avatarOptions[Math.floor(Math.random() * avatarOptions.length)].id;
}

function getAvatarById(id) {
  return avatarOptions.find((avatar) => avatar.id === id) || avatarOptions[0];
}

function renderAvatarPicker() {
  if (!avatarPicker) return;
  avatarPicker.innerHTML = '';
  avatarOptions.forEach((avatar) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'avatar-option';
    button.dataset.avatar = avatar.id;
    button.style.setProperty('--avatar-color', avatar.color);
    button.textContent = avatar.symbol;
    button.classList.toggle('active', avatar.id === selectedAvatar);
    button.addEventListener('click', () => {
      selectedAvatar = avatar.id;
      renderAvatarPicker();
    });
    avatarPicker.appendChild(button);
  });
}

function collectAccessProfile(email) {
  const fallbackName = email ? email.split('@')[0] : 'Участник';
  const name = accessProfileName.value.trim() || localProfile.name || fallbackName;
  const avatar = selectedAvatar || localProfile.avatar || randomAvatarId(name || email);
  const profile = { name, avatar };
  saveProfile(profile);
  return profile;
}

function currentUserProfile() {
  const metadata = currentUser?.user_metadata || {};
  const emailName = currentUser?.email ? currentUser.email.split('@')[0] : '';
  const name = localProfile.name || metadata.display_name || metadata.name || emailName || 'Участник';
  const avatar = localProfile.avatar || metadata.avatar || randomAvatarId(name || currentUser?.email || '');
  return { name, avatar };
}

function avatarLabel(avatarId, name = '') {
  const avatar = getAvatarById(avatarId);
  const initial = name.trim().slice(0, 1).toUpperCase();
  return initial || avatar.symbol;
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
      detectSessionInUrl: false,
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
      if (tab !== 'family') {
        notifyHouseholdItemAdded(tab, item).catch(console.error);
      }
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
  const soonItems = allActionItems().filter((item) => !item.done && item.dueDate && daysUntil(item.dueDate) <= 14);
  const focus = allActionItems()
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

function allActionItems() {
  return [
    ...state.tasks.map((item) => ({ ...item, source: 'tasks' })),
    ...state.shopping.map((item) => ({ ...item, source: 'shopping' })),
    ...state.documents.map((item) => ({ ...item, source: 'documents' })),
  ];
}

function createCard(item, mode) {
  const card = document.createElement('article');
  card.className = `card ${item.done ? 'done' : ''}`;
  const cardMode = item.source || mode;

  const marker = document.createElement('button');
  marker.type = 'button';
  marker.className = 'marker';
  if (cardMode === 'family') {
    const avatar = getAvatarById(item.avatar || randomAvatarId(item.title));
    marker.classList.add('avatar-marker');
    marker.style.setProperty('--avatar-color', avatar.color);
    marker.textContent = avatarLabel(avatar.id, item.title);
    marker.disabled = true;
  } else {
    marker.textContent = item.done ? '✓' : markerText(cardMode);
  }
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
  setSyncStatus(
    currentUser
      ? 'Аккаунт подключен. Здесь можно выйти или создать семейную ссылку.'
      : 'Вход и регистрация доступны на стартовом экране.',
    !supabaseClient,
    Boolean(currentUser),
  );
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
  await ensureWorkspaceForCurrentUser();
  const memberItem = ensureCurrentUserFamilyMember('Профиль участника LifeHub');
  if (memberItem) await upsertCloudItem('family', memberItem);
  await pushStateToCloud();
  await loadStateFromCloud();
  await subscribeToPushNotifications();
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

function setAccessStatus(message = '', isError = false, isOk = false) {
  accessStatus.textContent = message;
  accessStatus.classList.toggle('error', isError);
  accessStatus.classList.toggle('ok', isOk);
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

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;

  try {
    if (serviceWorkerRegistration) return serviceWorkerRegistration;
    serviceWorkerRegistration = await navigator.serviceWorker.register(serviceWorkerPath);
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type !== 'lifehub:push') return;
      const notification = event.data.notification || {};
      showToast(notification.title || 'LifeHub', notification.body || '');
      if (notification.type === 'invite_accepted' || notification.type === 'item_added') {
        loadStateFromCloud().catch(console.error);
      }
    });
    if (currentUser) {
      subscribeToPushNotifications().catch(console.error);
    }
    return serviceWorkerRegistration;
  } catch (error) {
    console.warn('Service worker registration failed', error);
    return null;
  }
}

async function subscribeToPushNotifications() {
  if (!currentUser || !isCloudReady()) return false;
  if (!serviceWorkerRegistration) {
    await registerServiceWorker();
  }
  if (!serviceWorkerRegistration || !('PushManager' in window)) return false;

  const vapidPublicKey = getVapidPublicKey();
  if (!vapidPublicKey) return false;

  const allowed = await requestNotificationAccess();
  if (!allowed) return false;

  const subscription = await serviceWorkerRegistration.pushManager.getSubscription()
    || await serviceWorkerRegistration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });

  await savePushSubscription(subscription);
  return true;
}

async function savePushSubscription(subscription) {
  const payload = subscription.toJSON();
  const { error } = await supabaseClient
    .from('lifehub_push_subscriptions')
    .upsert({
      user_id: currentUser.id,
      workspace_key: cloudConfig.workspaceKey,
      endpoint: payload.endpoint,
      p256dh: payload.keys?.p256dh || '',
      auth: payload.keys?.auth || '',
      user_agent: navigator.userAgent,
      enabled: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'endpoint' });

  if (error) {
    if (['42P01', 'PGRST205'].includes(error.code)) return;
    throw error;
  }
}

async function disablePushSubscription() {
  if (!serviceWorkerRegistration || !supabaseClient || !currentUser) return;
  const subscription = await serviceWorkerRegistration.pushManager?.getSubscription?.();
  if (!subscription) return;

  await supabaseClient
    .from('lifehub_push_subscriptions')
    .update({ enabled: false, updated_at: new Date().toISOString() })
    .eq('endpoint', subscription.endpoint)
    .eq('user_id', currentUser.id);
}

function getVapidPublicKey() {
  return (window.LIFEHUB_CONFIG?.vapidPublicKey || '').trim();
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = `${base64String}${padding}`.replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
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

    let shouldRefreshData = false;
    data.forEach((notification) => {
      if (seenNotificationIds.has(notification.id)) return;
      seenNotificationIds.add(notification.id);
      showToast(notification.title || 'LifeHub', notification.body || '');
      notifyBrowser(notification.title || 'LifeHub', notification.body || '');
      if (notification.type === 'invite_accepted' || notification.type === 'item_added') {
        shouldRefreshData = true;
      }
    });

    const ids = data.map((notification) => notification.id);
    await supabaseClient
      .from('lifehub_notifications')
      .update({ read_at: new Date().toISOString() })
      .in('id', ids)
      .eq('target_user_id', currentUser.id);

    if (shouldRefreshData) {
      await loadStateFromCloud();
    }
  } finally {
    isLoadingNotifications = false;
  }
}

async function notifyHouseholdItemAdded(list, item) {
  if (!currentUser || !isCloudReady()) return;

  const { data: members, error } = await supabaseClient
    .from('lifehub_members')
    .select('user_id')
    .eq('workspace_key', cloudConfig.workspaceKey);
  if (error) throw error;

  const recipients = (members || [])
    .map((member) => member.user_id)
    .filter((userId) => userId && userId !== currentUser.id);
  if (!recipients.length) return;

  const actor = currentUserProfile().name;
  const rows = recipients.map((userId) => ({
    workspace_key: cloudConfig.workspaceKey,
    target_user_id: userId,
    actor_user_id: currentUser.id,
    type: 'item_added',
    title: 'Новое дело в LifeHub',
    body: `${actor}: ${item.title} · ${labels[list]}`,
    dedupe_key: `item_added:${item.id}:${userId}`,
    payload: {
      item_id: String(item.id),
      list,
    },
  }));

  const { error: insertError } = await supabaseClient
    .from('lifehub_notifications')
    .insert(rows);
  if (insertError && insertError.code !== '23505') throw insertError;
}

function checkDueReminders() {
  const todayKey = new Date().toISOString().slice(0, 10);
  const seen = loadReminderSeen();
  let touched = false;

  allActionItems()
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

  try {
    await handleAuthRedirect();
  } catch (error) {
    const message = error.message || 'Не получилось войти по ссылке. Попробуй отправить письмо еще раз.';
    setAccessStatus(message, true);
    setSyncStatus(message, true);
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

async function handleAuthRedirect() {
  const url = new URL(window.location.href);
  const hash = new URLSearchParams(url.hash.replace(/^#/, ''));
  const errorDescription = url.searchParams.get('error_description')
    || hash.get('error_description')
    || url.searchParams.get('error');

  if (errorDescription) {
    cleanAuthUrl(url);
    throw new Error(decodeURIComponent(errorDescription));
  }

  const accessToken = hash.get('access_token');
  const refreshToken = hash.get('refresh_token');
  if (accessToken && refreshToken) {
    const { error } = await supabaseClient.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    cleanAuthUrl(url);
    if (error) throw error;
    return;
  }

  const code = url.searchParams.get('code');
  if (code) {
    const { error } = await supabaseClient.auth.exchangeCodeForSession(code);
    cleanAuthUrl(url);
    if (error) throw error;
  }
}

function buildAuthRedirectUrl() {
  const url = new URL(window.location.href);
  removeAuthParams(url);
  url.hash = '';
  return url.toString();
}

function cleanAuthUrl(url = new URL(window.location.href)) {
  removeAuthParams(url);
  url.hash = '';
  const nextUrl = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState({}, document.title, nextUrl || window.location.pathname);
}

function removeAuthParams(url) {
  [
    'code',
    'type',
    'token_hash',
    'access_token',
    'refresh_token',
    'expires_at',
    'expires_in',
    'provider_token',
    'provider_refresh_token',
    'error',
    'error_code',
    'error_description',
  ].forEach((param) => url.searchParams.delete(param));
}

function updateAuthUI() {
  if (!authStatus || !accessScreen) return;
  const hasPendingInvite = Boolean(pendingInviteToken);
  if (hasPendingInvite && !currentUser) {
    authMode = 'invite';
  } else if (authMode === 'invite') {
    authMode = 'login';
  }

  const needsAccess = !currentUser;
  const isInvite = authMode === 'invite';
  const isSignup = authMode === 'signup';
  const wantsProfile = isSignup || isInvite;
  document.body.classList.toggle('access-active', needsAccess);
  accessScreen.classList.toggle('visible', needsAccess);
  accessModeTabs.hidden = isInvite;
  accessNameRow.hidden = !wantsProfile;
  avatarPicker.hidden = !wantsProfile;
  accessModeButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.authMode === authMode);
  });
  if (wantsProfile && !accessProfileName.value.trim()) {
    accessProfileName.value = localProfile.name || '';
  }
  renderAvatarPicker();

  if (!isCloudReady()) {
    accessKicker.textContent = 'LifeHub';
    accessTitle.textContent = 'Сервер не подключен';
    accessCopy.textContent = 'Приложение еще не подключено к серверу. Сообщи владельцу LifeHub.';
    accessHelper.textContent = 'Без подключения к серверу вход, регистрация и семейные инвайты недоступны.';
    accessSubmitButton.textContent = 'Недоступно';
    accessSubmitButton.disabled = true;
    authStatus.textContent = 'Приложение еще не подключено к серверу.';
    sendLoginButton.disabled = true;
    signOutButton.disabled = true;
    createInviteButton.disabled = true;
    copyInviteButton.disabled = true;
    sendLoginButton.hidden = false;
    signOutButton.hidden = true;
    invitePanel.hidden = true;
    return;
  }

  accessSubmitButton.disabled = Boolean(currentUser);
  accessKicker.textContent = isInvite ? 'Приглашение LifeHub' : 'Аккаунт LifeHub';
  accessTitle.textContent = isInvite
    ? 'Тебя пригласили в семью'
    : isSignup
      ? 'Создай аккаунт'
      : 'Войди в LifeHub';
  accessCopy.textContent = isInvite
    ? 'Укажи имя, выбери аватар и введи email. LifeHub сразу подключит тебя к семье после письма.'
    : isSignup
      ? 'Укажи имя, выбери аватар и введи email, чтобы создать семейный аккаунт.'
      : 'Укажи email от своего аккаунта, и мы отправим письмо для входа без пароля.';
  accessSubmitButton.textContent = isInvite
    ? 'Принять приглашение'
    : isSignup
      ? 'Зарегистрироваться'
      : 'Войти';
  accessHelper.textContent = isInvite
    ? 'После письма ты сразу попадешь в семейное пространство.'
    : isSignup
      ? 'Уже есть аккаунт? Выбери «Войти».'
      : 'Нет аккаунта? Выбери «Регистрация».';
  sendLoginButton.disabled = false;
  signOutButton.disabled = !currentUser;
  createInviteButton.disabled = !currentUser;
  copyInviteButton.disabled = !inviteLinkInput.value;
  copyInviteButton.hidden = !inviteLinkInput.value;
  sendLoginButton.hidden = true;
  signOutButton.hidden = !currentUser;
  invitePanel.hidden = !currentUser;
  authActions.classList.toggle('solo', Boolean(currentUser));
  authStatus.textContent = currentUser
    ? `Вошел: ${currentUser.email || currentUser.id}`
    : 'Вход и регистрация доступны на стартовом экране.';
}

async function sendMagicLink() {
  if (!isCloudReady()) {
    setSyncStatus('Приложение еще не подключено к серверу.', true);
    setAccessStatus('Приложение еще не подключено к серверу.', true);
    return;
  }

  const email = (authEmailInput.value || accessAuthEmail.value).trim();
  if (!email) {
    setSyncStatus('Введи email для входа.', true);
    setAccessStatus('Введи email, чтобы продолжить.', true);
    return;
  }
  authEmailInput.value = email;
  accessAuthEmail.value = email;
  const profile = authMode === 'login' ? localProfile : collectAccessProfile(email);
  requestNotificationAccess().catch(console.error);
  accessSubmitButton.disabled = true;
  accessSubmitButton.textContent = 'Отправляем...';
  setAccessStatus('');

  try {
    const { error } = await supabaseClient.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: buildAuthRedirectUrl(),
        shouldCreateUser: authMode !== 'login',
        data: authMode === 'login'
          ? undefined
          : {
              display_name: profile.name,
              name: profile.name,
              avatar: profile.avatar,
            },
      },
    });

    if (error) {
      setSyncStatus(error.message, true);
      setAccessStatus(error.message, true);
      return;
    }

    const successCopy = authMode === 'invite'
      ? 'Письмо отправлено. Открой его на этом устройстве, и LifeHub подключит тебя к семье.'
      : authMode === 'signup'
        ? 'Письмо отправлено. Открой его, чтобы завершить регистрацию.'
        : 'Письмо отправлено. Открой его, чтобы войти.';
    setSyncStatus(successCopy, false, true);
    setAccessStatus(successCopy, false, true);
    showToast('Письмо отправлено', 'Открой письмо на этом же устройстве.');
  } finally {
    updateAuthUI();
  }
}

async function signOut() {
  if (!supabaseClient) return;
  await disablePushSubscription().catch(console.error);
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
    await ensureWorkspaceForCurrentUser();
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
  const profile = currentUserProfile();
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
    display_name: profile.name,
    avatar: profile.avatar,
    role: 'owner',
  }, { onConflict: 'workspace_key,user_id' });
  if (memberError) throw memberError;
}

async function ensureWorkspaceForCurrentUser() {
  const { data, error } = await supabaseClient
    .from('lifehub_members')
    .select('role')
    .eq('workspace_key', cloudConfig.workspaceKey)
    .eq('user_id', currentUser.id)
    .maybeSingle();

  if (error) throw error;
  if (data) return data.role;

  await ensureHousehold();
  return 'owner';
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
    const memberItem = ensureCurrentUserFamilyMember('Добавлен по инвайт-ссылке');
    if (memberItem) await upsertCloudItem('family', memberItem);
    pendingInviteToken = '';
    authMode = 'login';
    window.history.replaceState({}, document.title, window.location.pathname);
    updateAuthUI();
    await subscribeToPushNotifications();
    startNotificationPolling();
    checkDueReminders();
    setSyncStatus('Инвайт принят. Ты добавлен в семью.', false, true);
    showToast('Ты в семье', 'Общие дела уже загружены в LifeHub.');
  } catch (error) {
    setSyncStatus(error.message || 'Не получилось принять инвайт.', true);
    setAccessStatus(error.message || 'Не получилось принять приглашение. Попроси новую ссылку.', true);
  } finally {
    inviteAcceptInFlight = false;
  }
}

function ensureCurrentUserFamilyMember(note = 'Профиль участника LifeHub') {
  if (!currentUser) return null;
  const profile = currentUserProfile();
  const memberId = `member-${currentUser.id}`;
  const existing = state.family.find((item) => String(item.id) === memberId);
  const next = {
    ...(existing || createItem(profile.name, 'Участник', '', note, false, null, profile.avatar)),
    id: memberId,
    title: profile.name,
    category: existing?.category || 'Участник',
    dueDate: '',
    note,
    done: false,
    avatar: profile.avatar,
  };
  state.family = [
    next,
    ...state.family.filter((item) => {
      const sameId = String(item.id) === memberId;
      const duplicateEmail = currentUser.email && item.title === currentUser.email;
      const defaultSelf = item.title === 'Я' && item.category === 'Владелец';
      return !sameId && !duplicateEmail && !defaultSelf;
    }),
  ];
  saveState();
  render();
  return next;
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
    avatar: item.avatar || '',
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
    avatar: row.avatar || '',
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

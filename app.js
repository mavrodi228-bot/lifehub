const storageKey = 'lifehub-pwa-state-v2';
const legacyStorageKey = 'lifehub-pwa-state-v1';
const cloudConfigKey = 'lifehub-supabase-config-v1';
const storageBucket = 'lifehub-files';

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
const exportButton = document.querySelector('#export-button');
const syncButton = document.querySelector('#sync-button');
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

let selectedAttachment = null;
let editingItem = null;
let cloudConfig = loadCloudConfig();
let supabaseClient = createSupabaseClient();

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
    const saved = localStorage.getItem(cloudConfigKey);
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
  localStorage.setItem(cloudConfigKey, JSON.stringify(cloudConfig));
}

function createSupabaseClient() {
  if (!cloudConfig.url || !cloudConfig.key || !window.supabase?.createClient) return null;
  return window.supabase.createClient(cloudConfig.url, cloudConfig.key);
}

function isCloudReady() {
  return Boolean(supabaseClient && cloudConfig.workspaceKey);
}

function updateCloudBadge(text) {
  syncButton.textContent = text || (isCloudReady() ? 'Облако' : 'Локально');
  syncButton.classList.toggle('connected', isCloudReady());
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
    if (isCloudReady()) {
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
    fileRow.classList.toggle('visible', tab === 'documents');
    listTitle.textContent = sectionTitles[tab];
    renderList(tab);
  }
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
  if (!isCloudReady()) throw new Error('Supabase не подключен.');

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
  if (task && isCloudReady()) {
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
  if (found && isCloudReady()) {
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
  supabaseKeyInput.value = cloudConfig.key || '';
  workspaceKeyInput.value = cloudConfig.workspaceKey || '';
  setSyncStatus(isCloudReady() ? 'Облако подключено. Можно выгружать и загружать данные.' : 'Облако не подключено.');
  syncDialog.showModal();
}

async function saveCloudConfig(event) {
  event.preventDefault();
  cloudConfig = {
    url: supabaseUrlInput.value.trim(),
    key: supabaseKeyInput.value.trim(),
    workspaceKey: workspaceKeyInput.value.trim() || makeWorkspaceKey(),
  };
  saveCloudConfigToStorage();
  supabaseClient = createSupabaseClient();
  updateCloudBadge();

  if (!isCloudReady()) {
    setSyncStatus('Заполни Supabase URL и anon key.', true);
    return;
  }

  try {
    await testCloudConnection();
    setSyncStatus('Подключено. Можно нажать “Выгрузить”, чтобы отправить текущие данные в Supabase.', false, true);
  } catch (error) {
    setSyncStatus(error.message || 'Не получилось подключиться к Supabase.', true);
  }
}

async function testCloudConnection() {
  const { error } = await supabaseClient
    .from('lifehub_items')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_key', cloudConfig.workspaceKey);
  if (error) throw error;
}

async function pushToCloud() {
  if (!isCloudReady()) {
    setSyncStatus('Сначала сохрани Supabase URL и key.', true);
    return;
  }

  setSyncStatus('Выгружаю локальные карточки...');
  try {
    const rows = ['tasks', 'shopping', 'documents', 'family'].flatMap((list) =>
      state[list].map((item) => itemToRow(list, item)),
    );
    if (rows.length) {
      const { error } = await supabaseClient
        .from('lifehub_items')
        .upsert(rows, { onConflict: 'workspace_key,id' });
      if (error) throw error;
    }
    setSyncStatus(`Готово: выгружено ${rows.length} карточек.`, false, true);
  } catch (error) {
    setSyncStatus(error.message || 'Выгрузка не удалась.', true);
  }
}

async function pullFromCloud() {
  if (!isCloudReady()) {
    setSyncStatus('Сначала сохрани Supabase URL и key.', true);
    return;
  }

  setSyncStatus('Загружаю данные из Supabase...');
  try {
    const { data, error } = await supabaseClient
      .from('lifehub_items')
      .select('*')
      .eq('workspace_key', cloudConfig.workspaceKey)
      .order('updated_at', { ascending: false });
    if (error) throw error;

    state.tasks = [];
    state.shopping = [];
    state.documents = [];
    state.family = [];
    data.forEach((row) => {
      if (state[row.list]) state[row.list].push(rowToItem(row));
    });
    saveState();
    render();
    setSyncStatus(`Готово: загружено ${data.length} карточек.`, false, true);
  } catch (error) {
    setSyncStatus(error.message || 'Загрузка не удалась.', true);
  }
}

function disconnectCloud() {
  cloudConfig = {
    url: '',
    key: '',
    workspaceKey: cloudConfig.workspaceKey || makeWorkspaceKey(),
  };
  saveCloudConfigToStorage();
  supabaseClient = null;
  updateCloudBadge();
  setSyncStatus('Облако отключено. LifeHub снова работает локально.');
}

function setSyncStatus(message, isError = false, isOk = false) {
  syncStatus.textContent = message;
  syncStatus.classList.toggle('error', isError);
  syncStatus.classList.toggle('ok', isOk);
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

  const maxSize = isCloudReady() ? 10000000 : 1500000;
  if (file.size > maxSize) {
    alert(isCloudReady()
      ? 'Файл слишком большой. Для текущего облачного режима выбери файл до 10 МБ.'
      : 'Файл слишком большой. Для локальной версии выбери фото или PDF до 1.5 МБ.');
    fileInput.value = '';
    selectedAttachment = null;
    return;
  }

  if (isCloudReady()) {
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
  if (!isCloudReady()) return;
  const { error } = await supabaseClient
    .from('lifehub_items')
    .upsert(itemToRow(list, item), { onConflict: 'workspace_key,id' });
  if (error) throw error;
}

async function deleteCloudItem(list, item) {
  if (!isCloudReady()) return;
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
  if (isCloudReady()) {
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

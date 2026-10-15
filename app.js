import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

// ---------- Init Supabase ----------
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---------- DOM ----------
const form       = document.getElementById('noteForm');
const noteIdInput= document.getElementById('noteId');
const titleInput = document.getElementById('title');
const contentInput = document.getElementById('content');
const submitBtn  = document.getElementById('submitBtn');
const cancelBtn  = document.getElementById('cancelBtn');
const notesList  = document.getElementById('notesList');
const statusEl   = document.getElementById('status');

let notes = [];

// ---------- Helpers ----------
const showStatus = (msg, isError = false) => {
  statusEl.textContent = msg;
  statusEl.style.color = isError ? '#e74c3c' : '#27ae60';
  if (msg) setTimeout(() => { statusEl.textContent = ''; }, 2500);
};

const formatDate = (iso) =>
  new Date(iso).toLocaleString('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

// ---------- CREATE (เพิ่ม) ----------
async function createNote(title, content) {
  const { data, error } = await supabase
    .from('notes')
    .insert([{ title, content }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ---------- READ (อ่าน) ----------
async function fetchNotes() {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  notes = data;
  renderNotes();
}

// ---------- UPDATE (อัปเดต) ----------
async function updateNote(id, title, content) {
  const { data, error } = await supabase
    .from('notes')
    .update({ title, content, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ---------- DELETE (ลบ) ----------
async function deleteNote(id) {
  const { error } = await supabase.from('notes').delete().eq('id', id);
  if (error) throw error;
}

// ---------- Render ----------
function renderNotes() {
  if (!notes.length) {
    notesList.innerHTML = '<p style="text-align:center;color:#999;">ยังไม่มีโน้ต</p>';
    return;
  }

  notesList.innerHTML = notes.map(n => `
    <div class="note-card" data-id="${n.id}">
      <h3>${escapeHtml(n.title)}</h3>
      <p>${escapeHtml(n.content || '')}</p>
      <div class="meta">📅 ${formatDate(n.created_at)}</div>
      <div class="actions">
        <button class="btn-edit"   data-action="edit">✏️ แก้ไข</button>
        <button class="btn-delete" data-action="delete">🗑️ ลบ</button>
      </div>
    </div>
  `).join('');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ---------- Event: submit form ----------
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = titleInput.value.trim();
  const content = contentInput.value.trim();
  if (!title) return;

  submitBtn.disabled = true;

  try {
    const id = noteIdInput.value;
    if (id) {
      await updateNote(id, title, content);
      showStatus('✅ อัปเดตโน้ตแล้ว');
    } else {
      await createNote(title, content);
      showStatus('✅ เพิ่มโน้ตแล้ว');
    }
    resetForm();
    await fetchNotes();
  } catch (err) {
    console.error(err);
    showStatus('❌ เกิดข้อผิดพลาด: ' + err.message, true);
  } finally {
    submitBtn.disabled = false;
  }
});

// ---------- Event: cancel ----------
cancelBtn.addEventListener('click', resetForm);

function resetForm() {
  form.reset();
  noteIdInput.value = '';
  submitBtn.textContent = '➕ เพิ่มโน้ต';
  cancelBtn.classList.add('hidden');
}

// ---------- Event: คลิกในรายการ (event delegation) ----------
notesList.addEventListener('click', async (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;

  const card = btn.closest('.note-card');
  const id = card.dataset.id;
  const note = notes.find(n => n.id === id);
  if (!note) return;

  if (btn.dataset.action === 'edit') {
    noteIdInput.value = note.id;
    titleInput.value  = note.title;
    contentInput.value= note.content || '';
    submitBtn.textContent = '💾 บันทึก';
    cancelBtn.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (btn.dataset.action === 'delete') {
    if (!confirm('ต้องการลบโน้ตนี้ใช่ไหม?')) return;
    try {
      await deleteNote(id);
      showStatus('🗑️ ลบโน้ตแล้ว');
      await fetchNotes();
    } catch (err) {
      showStatus('❌ ลบไม่สำเร็จ: ' + err.message, true);
    }
  }
});

// ---------- Start ----------
(async () => {
  try {
    await fetchNotes();
  } catch (err) {
    showStatus('❌ โหลดข้อมูลไม่สำเร็จ: ' + err.message, true);
  }
})();
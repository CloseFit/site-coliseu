// ============================================================
// CONFIG
// ============================================================
const CONFIG = {
    SUPABASE_URL: 'https://gzvflbsjksmriqfaiizr.supabase.co',
    SUPABASE_KEY: 'sb_publishable_RReaq3MLFL3G8_6Q5sqlMw_j80yV-lj',
    DAYS:         ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'],
    DAYS_FULL:    ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'],
    HOURS:        ['05h','06h','07h','08h','09h','10h','11h','12h','16h','17h','18h','19h','20h','21h']
};

// Supabase client (singleton)
const _client = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

// ============================================================
// AUTH
// ============================================================
async function checkAuth() {
    const email    = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    const errEl    = document.getElementById('auth-error');
    const btn      = document.getElementById('auth-btn');

    if (!email || !password) {
        errEl.textContent = 'Preencha e-mail e senha.';
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    errEl.textContent = '';

    const { error } = await _client.auth.signInWithPassword({ email, password });

    if (error) {
        errEl.textContent = 'E-mail ou senha inválidos. Tente novamente.';
        document.getElementById('auth-password').value = '';
        document.getElementById('auth-password').focus();
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-arrow-right"></i>';
    }
    // onAuthStateChange cuida do redirecionamento ao dashboard
}

async function logout() {
    await _client.auth.signOut();
    // onAuthStateChange cuida de mostrar a tela de login
}

document.addEventListener('DOMContentLoaded', () => {
    // Verificar se já existe sessão ativa
    _client.auth.getSession().then(({ data: { session } }) => {
        if (session) {
            showDashboard();
        }
    });

    // Reagir às mudanças de autenticação
    _client.auth.onAuthStateChange((_event, session) => {
        if (session) {
            showDashboard();
        } else {
            showAuthGate();
        }
    });

    // Enter key nos campos de login
    ['auth-email', 'auth-password'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('keydown', e => { if (e.key === 'Enter') checkAuth(); });
    });
});

function showDashboard() {
    document.getElementById('auth-gate').style.display = 'none';
    document.getElementById('dashboard').style.display = 'block';
    if (allStudents.length === 0) init();
}

function showAuthGate() {
    document.getElementById('dashboard').style.display = 'none';
    document.getElementById('auth-gate').style.display = 'flex';
    document.getElementById('auth-password').value = '';
}

// ============================================================
// STATE
// ============================================================
let allStudents = [];
let filteredStudents = [];
let allAvFisica = [];
let filteredAvFisica = [];

// ============================================================
// TABS
// ============================================================
function switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
    
    document.getElementById(`btn-tab-${tabId}`).classList.add('active');
    document.getElementById(`tab-${tabId}`).style.display = 'flex';

    if (tabId === 'avfisica' && allAvFisica.length === 0) {
        fetchAvFisica();
    }
}

// ============================================================
// INIT
// ============================================================
async function init() {
    await fetchStudents();
    renderStats();
    renderHeatmap();
    renderTable(filteredStudents);
}

// ============================================================
// SUPABASE FETCH
// ============================================================
async function fetchStudents() {
    try {
        const { data, error } = await _client
            .from('crossfit_schedule_research')
            .select('student_name, student_whatsapp, student_type, weekly_frequency, schedule_selection, other_sport, other_sport_detail, observations, created_at')
            .order('created_at', { ascending: false });

        if (error) throw error;

        allStudents = data || [];
        filteredStudents = [...allStudents];
    } catch (err) {
        console.error('Erro ao buscar dados:', err);
    }
}

// ============================================================
// STATS
// ============================================================
function renderStats() {
    const total = allStudents.length;
    const normal = allStudents.filter(s => s.student_type === 'Normal').length;
    const pass   = allStudents.filter(s => s.student_type === 'Pass').length;
    const inativo = allStudents.filter(s => s.student_type === 'Inativo').length;
    const freq5x = allStudents.filter(s => s.weekly_frequency === '5x').length;
    const comEsporte = allStudents.filter(s => s.other_sport === 'Sim').length;

    const stats = [
        { icon: '👥', value: total, label: 'Respostas', accent: true },
        { icon: '🏋️', value: normal, label: 'Plano Normal' },
        { icon: '⚡', value: pass, label: 'Plano Pass' },
        { icon: '💤', value: inativo, label: 'Inativos' },
        { icon: '🔥', value: freq5x, label: '5x por semana' },
        { icon: '⚽', value: comEsporte, label: 'Praticam outro esporte' },
    ];

    const container = document.getElementById('stats-row');
    container.innerHTML = stats.map(s => `
        <div class="stat-card ${s.accent ? 'accent' : ''}">
            <div class="stat-icon">${s.icon}</div>
            <div class="stat-value">${s.value}</div>
            <div class="stat-label">${s.label}</div>
        </div>
    `).join('');
}

// ============================================================
// HEATMAP
// ============================================================
function buildHeatmapData() {
    // Matrix: heatData[hour][day] = count
    const heatData = {};
    CONFIG.HOURS.forEach(h => {
        heatData[h] = {};
        CONFIG.DAYS.forEach(d => { heatData[h][d] = 0; });
    });

    allStudents.forEach(s => {
        if (!Array.isArray(s.schedule_selection)) return;
        s.schedule_selection.forEach(slot => {
            if (heatData[slot.time] && heatData[slot.time][slot.day] !== undefined) {
                heatData[slot.time][slot.day]++;
            }
        });
    });

    return heatData;
}

function getHeatLevel(value, max) {
    if (value === 0) return 0;
    const pct = value / max;
    if (pct <= 0.1) return 1;
    if (pct <= 0.3) return 2;
    if (pct <= 0.6) return 3;
    if (pct <= 0.85) return 4;
    return 5;
}

function renderHeatmap() {
    const data = buildHeatmapData();
    const container = document.getElementById('heatmap-table');

    // Find the max value for normalization
    let maxVal = 0;
    CONFIG.HOURS.forEach(h => {
        CONFIG.DAYS.forEach(d => {
            if (data[h][d] > maxVal) maxVal = data[h][d];
        });
    });

    // Col count: 1 (label) + 6 (days)
    const cols = CONFIG.DAYS.length + 1;

    let html = `<div class="heatmap-grid" style="grid-template-columns: 50px repeat(${CONFIG.DAYS.length}, 1fr);">`;

    // Header row
    html += `<div class="heatmap-label"></div>`;
    CONFIG.DAYS_FULL.forEach(d => {
        html += `<div class="heatmap-header-label">${d}</div>`;
    });

    // Data rows
    CONFIG.HOURS.forEach(hour => {
        html += `<div class="heatmap-label">${hour}</div>`;
        CONFIG.DAYS.forEach(day => {
            const count = data[hour][day];
            const level = getHeatLevel(count, maxVal);
            const pct = maxVal > 0 ? Math.round((count / maxVal) * 100) : 0;
            const title = `${CONFIG.DAYS_FULL[CONFIG.DAYS.indexOf(day)]} às ${hour}: ${count} escolha(s)`;
            html += `
                <div class="heat-cell level-${level}" title="${title}">
                    <span class="cell-count">${count > 0 ? count : '·'}</span>
                    ${count > 0 ? `<span class="cell-pct">${pct}%</span>` : ''}
                </div>`;
        });
    });

    html += '</div>';
    container.innerHTML = html;
}

// ============================================================
// TABLE
// ============================================================
function renderTable(students) {
    const tbody = document.getElementById('student-tbody');
    const emptyState = document.getElementById('table-empty');
    const footer = document.getElementById('table-footer');

    if (students.length === 0) {
        tbody.innerHTML = '';
        emptyState.style.display = 'flex';
        footer.textContent = '';
        return;
    }

    emptyState.style.display = 'none';

    tbody.innerHTML = students.map((s, i) => {
        const slots = Array.isArray(s.schedule_selection) ? s.schedule_selection : [];
        const slotsHtml = slots.length
            ? `<div class="slot-tags">${slots.map(sl => `<span class="slot-tag">${sl.day} ${sl.time}</span>`).join('')}</div>`
            : `<span class="slot-empty">Não selecionou</span>`;

        const badgeClass = s.student_type === 'Pass' ? 'badge-pass' : s.student_type === 'Inativo' ? 'badge-inativo' : 'badge-normal';

        const esporte = s.other_sport === 'Sim'
            ? (s.other_sport_detail ? `✅ ${s.other_sport_detail}` : '✅ Sim')
            : '—';

        return `<tr>
            <td>${i + 1}</td>
            <td class="td-name">${escapeHtml(s.student_name?.trim() || '—')}</td>
            <td>${escapeHtml(s.student_whatsapp || '—')}</td>
            <td><span class="badge ${badgeClass}">${s.student_type || '?'}</span></td>
            <td>${s.weekly_frequency || '—'}</td>
            <td>${slotsHtml}</td>
            <td style="font-size:12px; color:var(--text-2);">${escapeHtml(esporte)}</td>
            <td><div class="obs-text">${s.observations ? escapeHtml(s.observations) : '—'}</div></td>
        </tr>`;
    }).join('');

    footer.textContent = `Exibindo ${students.length} de ${allStudents.length} alunos`;
}

// ============================================================
// FILTERS
// ============================================================
function applyFilters() {
    const type   = document.getElementById('filter-type').value;
    const freq   = document.getElementById('filter-freq').value;
    const search = document.getElementById('filter-search').value.toLowerCase().trim();

    filteredStudents = allStudents.filter(s => {
        const matchType   = !type || s.student_type === type;
        const matchFreq   = !freq || s.weekly_frequency === freq;
        const matchSearch = !search || (s.student_name || '').toLowerCase().includes(search);
        return matchType && matchFreq && matchSearch;
    });

    renderTable(filteredStudents);
}

// ============================================================
// AVALIAÇÕES FÍSICAS (TAB 2)
// ============================================================
async function fetchAvFisica() {
    try {
        const { data, error } = await _client
            .from('clube_coliseu_bookings')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        allAvFisica = data || [];
        filteredAvFisica = [...allAvFisica];
        renderAvFisicaTable(filteredAvFisica);
    } catch (err) {
        console.error('Erro ao buscar avaliações:', err);
    }
}

function renderAvFisicaTable(bookings) {
    const tbody = document.getElementById('avfisica-tbody');
    const emptyState = document.getElementById('avfisica-empty');
    const footer = document.getElementById('avfisica-footer');

    if (bookings.length === 0) {
        tbody.innerHTML = '';
        emptyState.style.display = 'flex';
        footer.textContent = '';
        return;
    }

    emptyState.style.display = 'none';

    tbody.innerHTML = bookings.map(b => {
        // Formatar riscos em badges
        const risks = Array.isArray(b.risks) ? b.risks : [];
        const riskHtml = risks.length > 0
            ? `<div class="slot-tags">${risks.map(r => `<span class="slot-tag" style="background:rgba(227,27,35,0.1); border-color:#E31B23; color:#E31B23;">${r}</span>`).join('')}</div>`
            : `<span class="slot-empty">Nenhum</span>`;

        // Objetivo principal + outro
        const obj = b.main_goal === 'Outro' ? b.goal_other : b.main_goal;
        const obstacles = b.main_obstacle === 'Outro' ? b.obstacle_other : b.main_obstacle;

        return `<tr>
            <td>
                <strong>${b.date ? b.date.split('-').reverse().join('/') : '—'}</strong><br>
                <span style="color:var(--text-2); font-size:11px;">às ${b.time || '—'}</span>
            </td>
            <td class="td-name">${escapeHtml(b.name || '—')}</td>
            <td>${escapeHtml(b.whatsapp || '—')}</td>
            <td><div class="obs-text">
                <strong style="color:var(--text);">${escapeHtml(obj || '—')}</strong><br>
                <span title="Dificuldade principal">⚠️ ${escapeHtml(obstacles || '—')}</span>
            </div></td>
            <td><span class="badge badge-normal">${escapeHtml(b.experience_level || '—')}</span></td>
            <td>
                ${riskHtml}
                ${b.limitations ? `<div class="obs-text" style="margin-top:6px; color:#FFC107;">Limitações: ${escapeHtml(b.limitations)}</div>` : ''}
                ${b.medications ? `<div class="obs-text" style="margin-top:4px; color:#1E90FF;">Medicamentos: ${escapeHtml(b.medications)}</div>` : ''}
            </td>
        </tr>`;
    }).join('');

    footer.textContent = `Exibindo ${bookings.length} de ${allAvFisica.length} agendamentos`;
}

function applyAvFisicaFilters() {
    const search = document.getElementById('avfisica-search').value.toLowerCase().trim();

    filteredAvFisica = allAvFisica.filter(b => {
        return !search || (b.name || '').toLowerCase().includes(search) || (b.whatsapp || '').includes(search);
    });

    renderAvFisicaTable(filteredAvFisica);
}

// ============================================================
// CSV EXPORT
// ============================================================
function exportCSV() {
    const headers = ['Nome', 'WhatsApp', 'Plano', 'Frequência', 'Horários', 'Outro Esporte', 'Detalhe', 'Observações', 'Data Inscrição'];
    const rows = allStudents.map(s => {
        const slots = Array.isArray(s.schedule_selection) ? s.schedule_selection.map(sl => `${sl.day} ${sl.time}`).join(' | ') : '';
        const date = s.created_at ? new Date(s.created_at).toLocaleDateString('pt-BR') : '';
        return [
            s.student_name?.trim() || '',
            s.student_whatsapp || '',
            s.student_type || '',
            s.weekly_frequency || '',
            slots,
            s.other_sport || '',
            s.other_sport_detail || '',
            s.observations || '',
            date
        ].map(v => `"${String(v).replace(/"/g, '""')}"`);
    });

    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const bom = '\uFEFF'; // UTF-8 BOM for Excel
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `coliseu-pesquisa-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

// ============================================================
// UTILS
// ============================================================
function escapeHtml(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

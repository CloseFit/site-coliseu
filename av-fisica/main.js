// Configuration
const CONFIG = {
    TOTAL_STEPS: 5,
    SUPABASE_URL: 'https://gzvflbsjksmriqfaiizr.supabase.co',
    SUPABASE_KEY: 'sb_publishable_RReaq3MLFL3G8_6Q5sqlMw_j80yV-lj',
    SLOT_DURATION: 20, // minutes
    SCHEDULE_RULE: {
        2: { start: '07:00', end: '11:00' }, // Terça
        4: { start: '13:00', end: '18:00' }, // Quinta
        6: { start: '06:30', end: '11:00' }  // Sábado
    }
};

// Application State
const state = {
    currentStep: 1,
    selectedDate: null,
    selectedTime: null,
    isSubmitting: false,
    bookedSlots: [] // Fetched from Supabase
};

// DOM Cache
const UI = {
    form: document.getElementById('assessment-form'),
    steps: document.querySelectorAll('.quiz-step'),
    progressBar: document.getElementById('progress-bar'),
    stepIndicator: document.getElementById('step-indicator'),
    prevBtn: document.getElementById('prev-btn'),
    nextBtn: document.getElementById('next-btn'),
    submitBtn: document.getElementById('submit-btn'),
    dateSelector: document.getElementById('date-selector'),
    slotsContainer: document.getElementById('slots-container'),
    successModal: document.getElementById('success-modal')
};

/**
 * Initialization
 */
async function init() {
    setupDateSelector();
    setupEventListeners();
    updateUI();
    
    // Fetch booked slots from Supabase (optional initial call)
    await fetchBookedSlots();
}

function setupDateSelector() {
    const selector = UI.dateSelector;
    const today = new Date();
    
    // Generate dates for the next 3 weeks
    for (let i = 0; i < 21; i++) {
        const date = new Date();
        date.setDate(today.getDate() + i);
        const dayOfWeek = date.getDay();
        
        if (CONFIG.SCHEDULE_RULE[dayOfWeek]) {
            const opt = document.createElement('option');
            const dateStr = date.toISOString().split('T')[0];
            opt.value = dateStr;
            opt.textContent = formatDate(date);
            selector.appendChild(opt);
        }
    }
}

function formatDate(date) {
    const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${days[date.getDay()]}, ${date.getDate()} de ${months[date.getMonth()]}`;
}

function setupEventListeners() {
    UI.dateSelector.onchange = (e) => {
        state.selectedDate = e.target.value;
        renderSlots();
    };

    UI.nextBtn.onclick = () => navigate(1);
    UI.prevBtn.onclick = () => navigate(-1);
    UI.form.onsubmit = handleSubmit;
}

/**
 * Slot Generation Logic
 */
function renderSlots() {
    UI.slotsContainer.innerHTML = '';
    if (!state.selectedDate) return;

    const dateObj = new Date(state.selectedDate + 'T00:00:00');
    const rule = CONFIG.SCHEDULE_RULE[dateObj.getDay()];
    
    const slots = generateTimeSlots(rule.start, rule.end);
    
    slots.forEach(time => {
        const isBooked = isSlotBooked(state.selectedDate, time);
        const btn = document.createElement('div');
        btn.className = `slot-item ${isBooked ? 'booked' : ''}`;
        btn.innerText = time;
        
        if (!isBooked) {
            btn.onclick = () => selectSlot(time, btn);
        }
        
        UI.slotsContainer.appendChild(btn);
    });
}

function generateTimeSlots(start, end) {
    const times = [];
    let current = parseTime(start);
    const endTime = parseTime(end);

    while (current < endTime) {
        times.push(formatTime(current));
        current.setMinutes(current.getMinutes() + CONFIG.SLOT_DURATION);
    }
    return times;
}

function parseTime(t) {
    const [h, m] = t.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
}

function formatTime(d) {
    return d.getHours().toString().padStart(2, '0') + ':' + 
           d.getMinutes().toString().padStart(2, '0');
}

function isSlotBooked(date, time) {
    return state.bookedSlots.some(s => s.date === date && s.time === time);
}

function selectSlot(time, element) {
    document.querySelectorAll('.slot-item').forEach(el => el.classList.remove('selected'));
    element.classList.add('selected');
    state.selectedTime = time;
    document.getElementById('selected-slot').value = time;
}

/**
 * Navigation
 */
function navigate(direction) {
    if (direction === 1 && !validateStep(state.currentStep)) return;
    
    state.currentStep += direction;
    updateUI();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateUI() {
    UI.steps.forEach(step => {
        step.classList.toggle('active', parseInt(step.dataset.step) === state.currentStep);
    });

    // Progress bar
    const progress = (state.currentStep / CONFIG.TOTAL_STEPS) * 100;
    UI.progressBar.style.width = `${progress}%`;
    UI.stepIndicator.innerText = `Passo ${state.currentStep} de ${CONFIG.TOTAL_STEPS}`;

    // Buttons
    UI.prevBtn.style.display = state.currentStep === 1 ? 'none' : 'block';
    
    if (state.currentStep === CONFIG.TOTAL_STEPS) {
        UI.nextBtn.style.display = 'none';
        UI.submitBtn.style.display = 'block';
    } else {
        UI.nextBtn.style.display = 'block';
        UI.submitBtn.style.display = 'none';
    }

    // Video Control (Pause if not on video step)
    if (state.currentStep !== 1) document.getElementById('video-intro-1')?.pause();
    if (state.currentStep !== 4) document.getElementById('video-step-2')?.pause();
}

function validateStep(step) {
    const activeStep = document.querySelector(`.quiz-step[data-step="${step}"]`);
    const inputs = activeStep.querySelectorAll('input[required], select[required]');
    
    for (let input of inputs) {
        if (!input.value.trim()) {
            showToast('Por favor, preencha este campo.', 'warning');
            input.focus();
            return false;
        }
    }

    if (step === 3 && !state.selectedTime) {
        showToast('Selecione um horário para continuar.', 'warning');
        return false;
    }

    return true;
}

/**
 * Video Functions
 */
window.handleVideoPlay = (step) => {
    const videoId = step === 1 ? 'video-intro-1' : 'video-step-2';
    const video = document.getElementById(videoId);
    const overlay = document.getElementById(`overlay-${step}`);
    if (video && overlay) {
        video.play();
        overlay.classList.add('hidden');
    }
};

/**
 * Supabase Logic
 */
async function fetchBookedSlots() {
    try {
        const { createClient } = supabase;
        const client = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
        const { data, error } = await client
            .from('clube_coliseu_bookings')
            .select('date, time');
        
        if (error) throw error;
        state.bookedSlots = data || [];
    } catch (err) {
        console.error('Error fetching slots:', err);
    }
}

async function handleSubmit(e) {
    e.preventDefault();
    if (state.isSubmitting) return;

    const formData = {
        name: document.getElementById('name').value,
        whatsapp: document.getElementById('whatsapp').value,
        date: state.selectedDate,
        time: state.selectedTime,
        goal: document.getElementById('main_goal').value,
        limitations: document.getElementById('limitations').value || 'Nenhuma',
        medications: document.getElementById('medications').value || 'Nenhum',
        risks: Array.from(document.querySelectorAll('input[name="health_risk"]:checked')).map(i => i.value),
        created_at: new Date()
    };

    state.isSubmitting = true;
    UI.submitBtn.innerText = 'ENVIANDO...';

    try {
        const { createClient } = supabase;
        const client = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

        // 1. Transactional check (Simple version for MVP)
        // In a real app, use a Supabase RPC to avoid race conditions.
        const { data: existing } = await client
            .from('clube_coliseu_bookings')
            .select('*')
            .eq('date', formData.date)
            .eq('time', formData.time);

        if (existing && existing.length > 0) {
            alert('Desculpe, este horário acabou de ser preenchido por outra pessoa. Por favor, escolha outro.');
            state.isSubmitting = false;
            UI.submitBtn.innerText = 'Finalizar Agendamento';
            state.currentStep = 3;
            updateUI();
            await fetchBookedSlots();
            renderSlots();
            return;
        }

        // 2. Insert Booking
        const { error } = await client
            .from('clube_coliseu_bookings')
            .insert([formData]);

        if (error) throw error;

        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
        UI.successModal.style.display = 'flex';
    } catch (err) {
        showToast('Erro ao salvar: ' + err.message, 'error');
        state.isSubmitting = false;
        UI.submitBtn.innerText = 'Finalizar Agendamento';
    }
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type} show`;
    toast.innerText = message;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

document.addEventListener('DOMContentLoaded', init);

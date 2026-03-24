// Video Helper — must be global and defined first
function toggleVideo(id) {
    const video = document.getElementById(id === 1 ? 'video-intro-1' : 'video-step-2');
    const overlay = document.getElementById(`overlay-${id}`);
    
    if (video && overlay) {
        if (video.paused) {
            video.play().catch(() => {});
            overlay.style.opacity = '0';
            overlay.style.pointerEvents = 'none';
            
            // Iniciar timer de delay
            startVideoDelayTimer(id);
        } else {
            video.pause();
            overlay.style.opacity = '1';
            overlay.style.pointerEvents = 'all';
        }
    }
}

function startVideoDelayTimer(id) {
    if (id === 1) {
        if (state.videoTimerStarted || state.videoDelayPassed) return;
        state.videoTimerStarted = true;
        
        setTimeout(() => {
            state.videoDelayPassed = true;
            if (state.currentStep === 1) {
                unlockButtonUI(1);
            }
        }, CONFIG.VIDEO_DELAY);
    } else if (id === 2) {
        if (state.video2TimerStarted || state.video2DelayPassed) return;
        state.video2TimerStarted = true;
        
        setTimeout(() => {
            state.video2DelayPassed = true;
            if (state.currentStep === 3) {
                unlockButtonUI(2);
            }
        }, CONFIG.VIDEO_DELAY);
    }
}

function unlockButtonUI(videoNum) {
    UI.nextBtn.classList.remove('locked-delayed');
    const instructionId = videoNum === 1 ? 'video-instruction' : 'video-instruction-2';
    const instruction = document.getElementById(instructionId);
    if (instruction) instruction.classList.add('hidden');
    showToast('Botão Continuar liberado!', 'success');
}

// Configuration
const CONFIG = {
    TOTAL_STEPS: 4,
    SUPABASE_URL: 'https://gzvflbsjksmriqfaiizr.supabase.co',
    SUPABASE_KEY: 'sb_publishable_RReaq3MLFL3G8_6Q5sqlMw_j80yV-lj',
    GOOGLE_SHEETS_WEBHOOK: 'https://script.google.com/macros/s/AKfycbxc_sYz4SpGpWUIGuhDHV28QLrlkWa8aVoA87V7UFJmRhCkHeHPRcTkC4w3u-25yS8kBQ/exec',
    VIDEO_DELAY: 30000,
    SLOT_DURATION: 20, // minutes
    SCHEDULE_RULE: {
        2: { start: '07:00', end: '11:00' }, // Terça
        4: { start: '13:00', end: '18:00' }, // Quinta
        6: { start: '06:30', end: '11:00' }  // Sábado
    }
};

// Application State
let state = {
    currentStep: 1,
    selectedDate: '',
    selectedTime: '',
    isSubmitting: false,
    videoTimerStarted: false,
    videoDelayPassed: false,
    video2TimerStarted: false,
    video2DelayPassed: false,
    bookingInProgress: false,
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

    // Video overlay click listeners moved to onclick in HTML to match Phase 1
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

    // Abrir Modal de Confirmação
    openConfirmModal(time);
}

function openConfirmModal(time) {
    const modal = document.getElementById('confirm-modal');
    const details = document.getElementById('confirm-details');
    const dateText = formatDate(new Date(state.selectedDate + 'T00:00:00'));
    
    details.innerText = `${dateText} às ${time}`;
    modal.style.display = 'flex';
}

window.closeConfirmModal = () => {
    document.getElementById('confirm-modal').style.display = 'none';
};

window.confirmAndNext = () => {
    const nameInput = document.getElementById('name');
    if (!nameInput.value.trim()) {
        showToast('Por favor, informe seu nome e sobrenome.', 'warning');
        nameInput.focus();
        return;
    }
    
    // Fecha modal e navega
    closeConfirmModal();
    navigate(1);
};

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
    } else if (state.currentStep === 2) {
        // No passo de agendamento, a navegação ocorre pelo modal
        UI.nextBtn.style.display = 'none';
        UI.submitBtn.style.display = 'none';
    } else {
        UI.nextBtn.style.display = 'block';
        UI.submitBtn.style.display = 'none';
        
        // 30s Delay Logic for Step 1
        const instruction1 = document.getElementById('video-instruction');
        const instruction2 = document.getElementById('video-instruction-2');
        
        if (state.currentStep === 1 && !state.videoDelayPassed) {
            UI.nextBtn.classList.add('locked-delayed');
            if (instruction1) instruction1.classList.remove('hidden');
        } else if (state.currentStep === 3 && !state.video2DelayPassed) {
            UI.nextBtn.classList.add('locked-delayed');
            if (instruction2) instruction2.classList.remove('hidden');
        } else {
            UI.nextBtn.classList.remove('locked-delayed');
            if (instruction1) instruction1.classList.add('hidden');
            if (instruction2) instruction2.classList.add('hidden');
        }
    }

    // Video Control (Pause if not on video step)
    if (state.currentStep !== 1) document.getElementById('video-intro-1')?.pause();
    if (state.currentStep !== 3) document.getElementById('video-step-2')?.pause();
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

// Toggle Other Goal Field
function toggleOtherGoal(value) {
    const container = document.getElementById('goal_other_container');
    const input = document.getElementById('goal_other');
    if (value === 'Outro') {
        container.style.display = 'block';
        input.setAttribute('required', 'true');
    } else {
        container.style.display = 'none';
        input.removeAttribute('required');
        input.value = '';
    }
}

// Toggle Other Obstacle Field
function toggleOtherObstacle(value) {
    const container = document.getElementById('obstacle_other_container');
    const input = document.getElementById('obstacle_other');
    if (value === 'Outro') {
        container.style.display = 'block';
        input.setAttribute('required', 'true');
    } else {
        container.style.display = 'none';
        input.removeAttribute('required');
        input.value = '';
    }
}

// Handle Form Submission
async function handleSubmit(e) {
    if (e) e.preventDefault();
    
    // Validação Manual (Evita dependência de 'required' HTML que falha em campos ocultos ou no mobile)
    if (!validateStep(state.currentStep)) return;

    if (state.isSubmitting) return;

    // Captura os riscos de saúde dos novos seletores Sim/Não
    const health_heart = document.querySelector('input[name="health_heart"]:checked')?.value === 'sim';
    const health_dizzy = document.querySelector('input[name="health_dizzy"]:checked')?.value === 'sim';
    const health_risks = [];
    if (health_heart) health_risks.push('heart');
    if (health_dizzy) health_risks.push('dizzy');

    const formData = {
        name: document.getElementById('name').value,
        whatsapp: 'N/A', 
        date: state.selectedDate,
        time: state.selectedTime,
        main_goal: document.getElementById('main_goal').value,
        goal_other: document.getElementById('goal_other').value || '',
        experience_level: document.getElementById('experience_level').value,
        weekly_frequency: document.getElementById('weekly_frequency').value,
        main_obstacle: document.getElementById('main_obstacle').value,
        obstacle_other: document.getElementById('obstacle_other').value || '',
        other_sports: document.getElementById('other_sports').value || '',
        health_history: document.getElementById('health_history')?.value || 'N/A',
        limitations: document.getElementById('limitations').value || 'Nenhuma',
        medications: document.getElementById('medications').value || 'Nenhum',
        risks: health_risks,
        created_at: new Date().toISOString()
    };

    state.isSubmitting = true;
    const btn = UI.submitBtn || document.getElementById('submit-btn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
    btn.disabled = true;

    try {
        const { createClient } = supabase;
        const client = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

        // 1. Insert Booking (The database unique constraint unique_booking_slot handles availability)
        const { error } = await client
            .from('clube_coliseu_bookings')
            .insert([formData]);

        if (error) {
            // Check for Postgres Unique Violation (code 23505)
            if (error.code === '23505') {
                alert('Desculpe, este horário acabou de ser preenchido por outra pessoa. Por favor, escolha outro.');
                state.isSubmitting = false;
                btn.innerHTML = originalText;
                btn.disabled = false;
                state.currentStep = 2; // Volta para o passo do calendário
                updateUI();
                await fetchBookedSlots();
                renderSlots();
                return;
            }
            throw error;
        }

        // Confetti!
        confetti({ 
            particleCount: 150, 
            spread: 70, 
            origin: { y: 0.6 },
            colors: ['#E31B23', '#ffffff', '#000000']
        });

        // Integração Google Sheets (Webhook CRM)
        try {
            await fetch(CONFIG.GOOGLE_SHEETS_WEBHOOK, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    formSource: 'av-fisica',
                    data: formData
                })
            });
        } catch (webhookErr) {
            console.error('Erro na integração com Sheets, mas os dados estão seguros no Supabase:', webhookErr);
        }

        // WhatsApp Redirect Setup
        const waNumber = '5573999911525';
        const waMessage = encodeURIComponent(
            `Olá! Acabei de agendar minha Avaliação Física no Clube Coliseu. 📅\n\n` +
            `*Nome:* ${formData.name}\n` +
            `*Data:* ${formData.date}\n` +
            `*Horário:* ${formData.time}\n\n` +
            `Aguardo o retorno para confirmação!`
        );
        const waUrl = `https://wa.me/${waNumber}?text=${waMessage}`;
        
        // Update conclusion button
        const conclusionBtn = document.querySelector('#success-modal .btn-primary');
        if (conclusionBtn) {
            conclusionBtn.innerHTML = '<i class="fab fa-whatsapp"></i> Confirmar no WhatsApp';
            conclusionBtn.onclick = () => window.location.href = waUrl;
        }

        UI.successModal.style.display = 'flex';

        // Auto-redirect after 5 seconds
        setTimeout(() => {
            if (UI.successModal.style.display === 'flex') {
                window.location.href = waUrl;
            }
        }, 5000);
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

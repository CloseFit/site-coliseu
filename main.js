// Configuration & Constants
const CONFIG = {
    TOTAL_STEPS: 5,
    HOURS: ['05h', '06h', '07h', '08h', '09h', '10h', '11h', '12h', '16h', '17h', '18h', '19h', '20h', '21h'],
    SUPABASE_URL: 'https://gzvflbsjksmriqfaiizr.supabase.co',
    SUPABASE_KEY: 'sb_publishable_RReaq3MLFL3G8_6Q5sqlMw_j80yV-lj'
};

// Application State
const state = {
    currentStep: 1,
    selections: [],
    isSubmitting: false
};

// DOM Cache
const UI = {
    form: document.getElementById('quiz-form'),
    steps: document.querySelectorAll('.quiz-step'),
    progressBar: document.getElementById('progress-bar'),
    stepIndicator: document.getElementById('step-indicator'),
    prevBtn: document.getElementById('prev-btn'),
    nextBtn: document.getElementById('next-btn'),
    submitBtn: document.getElementById('submit-btn'),
    daySelector: document.getElementById('day-selector'),
    timeSelector: document.getElementById('time-selector'),
    addScheduleBtn: document.getElementById('add-schedule-btn'),
    preferenceList: document.getElementById('preference-list'),
    selectionFooter: document.getElementById('selection-footer'),
    observations: document.getElementById('observations'),
    successModal: document.getElementById('success-modal')
};

/**
 * Initialization
 */
function init() {
    setupTimeSelector();
    setupEventListeners();
    updateUI();
}

function setupTimeSelector() {
    if (!UI.timeSelector) return;
    CONFIG.HOURS.forEach(hour => {
        const opt = document.createElement('option');
        opt.value = hour;
        opt.textContent = hour;
        UI.timeSelector.appendChild(opt);
    });
}

function setupEventListeners() {
    if (UI.addScheduleBtn) {
        UI.addScheduleBtn.onclick = handleAddSchedule;
    }

    if (UI.nextBtn) {
        UI.nextBtn.onclick = () => navigate(1);
    }

    if (UI.prevBtn) {
        UI.prevBtn.onclick = () => navigate(-1);
    }

    if (UI.form) {
        UI.form.onsubmit = handleSubmit;
    }
}

function handleAddSchedule() {
    const day = UI.daySelector.value;
    const time = UI.timeSelector.value;

    if (!day || !time) {
        showToast('Selecione o Dia e o Horário!', 'error');
        return;
    }

    const isDuplicate = state.selections.some(s => s.day === day && s.time === time);
    if (isDuplicate) {
        showToast('Este horário já foi adicionado!', 'warning');
        return;
    }

    state.selections.push({ day, time });
    renderList();
    
    UI.daySelector.selectedIndex = 0;
    UI.timeSelector.selectedIndex = 0;
}

/**
 * Navigation & UI Updates
 */
function navigate(direction) {
    if (direction === 1 && !validateStep(state.currentStep)) return;
    
    state.currentStep += direction;
    updateUI();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateUI() {
    // Steps Visibility
    UI.steps.forEach(step => {
        const isActive = parseInt(step.dataset.step) === state.currentStep;
        step.classList.toggle('active', isActive);
    });

    // Progress
    const progress = (state.currentStep / CONFIG.TOTAL_STEPS) * 100;
    if (UI.progressBar) UI.progressBar.style.width = `${progress}%`;
    if (UI.stepIndicator) UI.stepIndicator.innerText = `Passo ${state.currentStep} de ${CONFIG.TOTAL_STEPS}`;

    // Nav Buttons
    UI.prevBtn.style.display = state.currentStep === 1 ? 'none' : 'block';
    
    if (state.currentStep === CONFIG.TOTAL_STEPS) {
        UI.nextBtn.style.display = 'none';
        UI.submitBtn.style.display = 'block';
    } else {
        UI.nextBtn.style.display = 'block';
        UI.submitBtn.style.display = 'none';
    }
}

/**
 * Validation
 */
function validateStep(step) {
    const activeStep = document.querySelector(`.quiz-step[data-step="${step}"]`);
    if (!activeStep) return true;

    const inputs = activeStep.querySelectorAll('input[required]');
    
    for (let input of inputs) {
        if (input.type === 'radio') {
            const name = input.name;
            const checked = activeStep.querySelector(`input[name="${name}"]:checked`);
            if (!checked) {
                showToast('Ops! Selecione uma opção para continuar.', 'warning');
                return false;
            }
        } else if (!input.value.trim()) {
            input.focus();
            showToast('Por favor, preencha este campo.', 'warning');
            return false;
        }
    }

    if (step === 4 && state.selections.length === 0) {
        return confirm('Você não selecionou nenhum horário. Deseja continuar assim mesmo?');
    }

    return true;
}

/**
 * Rendering
 */
function renderList() {
    if (!UI.preferenceList) return;
    
    UI.preferenceList.innerHTML = '';
    
    if (state.selections.length === 0) {
        UI.selectionFooter.innerText = 'Nenhum horário adicionado';
    } else {
        UI.selectionFooter.innerText = `${state.selections.length} horário(s) selecionado(s)`;
    }

    state.selections.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'preference-item';
        div.innerHTML = `
            <div class="preference-info">
                <span>${getDayFull(item.day)}</span> às ${item.time}
            </div>
            <button type="button" class="btn-remove" onclick="removeSchedule(${index})">✕</button>
        `;
        UI.preferenceList.appendChild(div);
    });
}

function getDayFull(short) {
    const days = { 'SEG': 'Segunda', 'TER': 'Terça', 'QUA': 'Quarta', 'QUI': 'Quinta', 'SEX': 'Sexta', 'SAB': 'Sábado' };
    return days[short] || short;
}

window.removeSchedule = (index) => {
    state.selections.splice(index, 1);
    renderList();
};

/**
 * Form Submission
 */
async function handleSubmit(e) {
    e.preventDefault();
    if (state.isSubmitting) return;

    const formData = {
        student_name: document.getElementById('name').value,
        student_whatsapp: document.getElementById('whatsapp').value,
        student_type: UI.form.plan_type.value,
        weekly_frequency: UI.form.frequency.value,
        schedule_selection: state.selections,
        observations: UI.observations.value
    };

    toggleLoading(true);

    try {
        const { createClient } = supabase;
        const client = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
        
        const { error } = await client
            .from('crossfit_schedule_research')
            .insert([formData]);

        if (error) throw error;

        UI.successModal.style.display = 'flex';
    } catch (err) {
        showToast('Erro ao enviar: ' + err.message, 'error');
        toggleLoading(false);
    }
}

function toggleLoading(isLoading) {
    state.isSubmitting = isLoading;
    UI.submitBtn.disabled = isLoading;
    UI.submitBtn.innerText = isLoading ? 'ENVIANDO...' : 'Enviar Pesquisa';
}

/**
 * Toast System
 */
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerText = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }, 100);
}

init();
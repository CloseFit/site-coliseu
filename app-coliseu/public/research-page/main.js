// Configuration & Constants
const CONFIG = {
    TOTAL_STEPS: 7,
    HOURS: ['05h', '06h', '07h', '08h', '09h', '10h', '11h', '12h', '16h', '17h', '18h', '19h', '20h', '21h'],
    SUPABASE_URL: 'https://gzvflbsjksmriqfaiizr.supabase.co',
    SUPABASE_KEY: 'sb_publishable_RReaq3MLFL3G8_6Q5sqlMw_j80yV-lj',
    STORAGE_KEY: 'coliseu_quiz_draft',
    WHATSAPP_OFFICIAL: '5573999911525',
    VIDEO_DELAY: 30000, // 30s
    GOOGLE_SHEETS_WEBHOOK: 'https://script.google.com/macros/s/AKfycbxc_sYz4SpGpWUIGuhDHV28QLrlkWa8aVoA87V7UFJmRhCkHeHPRcTkC4w3u-25yS8kBQ/exec'
};

// Application State
const state = {
    currentStep: 1,
    selections: [],
    isSubmitting: false,
    videoTimerStarted: false,
    videoDelayPassed: false
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
    successModal: document.getElementById('success-modal'),
    videoInstruction: document.getElementById('video-instruction')
};

/**
 * Initialization
 */
function init() {
    setupTimeSelector();
    setupEventListeners();
    restoreDraft();   // Auto-Save: restaura dados do localStorage
    updateUI();

    // Iniciar vídeo se existir (muted por padrão para autoplay, mas agora usaremos o overlay)
    const video = document.getElementById('intro-video');
    if (video) {
        // Garantimos que o vídeo comece pausado para o overlay aparecer
        video.pause();
    }
}

/**
 * Lógica Customizada de Vídeo
 */
function handleVideoPlay() {
    const video = document.getElementById('intro-video');
    const overlay = document.getElementById('video-overlay');
    
    if (video && overlay) {
        video.muted = false; 
        video.play();
        overlay.classList.add('hidden');
        
        startVideoDelayTimer();
    }
}

function toggleVideo() {
    const video = document.getElementById('intro-video');
    const overlay = document.getElementById('video-overlay');
    
    if (video && overlay) {
        if (video.paused) {
            video.play();
            overlay.classList.add('hidden');
            startVideoDelayTimer();
        } else {
            video.pause();
            overlay.classList.remove('hidden');
        }
    }
}

function startVideoDelayTimer() {
    if (state.videoTimerStarted) return;
    
    state.videoTimerStarted = true;
    setTimeout(() => {
        state.videoDelayPassed = true;
        if (state.currentStep === 1) {
            UI.nextBtn.classList.remove('locked-delayed');
            if (UI.videoInstruction) UI.videoInstruction.classList.add('hidden');
        }
    }, CONFIG.VIDEO_DELAY);
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

    // WhatsApp Mask
    const whatsappInput = document.getElementById('whatsapp');
    if (whatsappInput) {
        whatsappInput.addEventListener('input', applyWhatsAppMask);
        whatsappInput.addEventListener('blur', () => validateFieldInline(whatsappInput));
    }

    // Real-time validation on Name
    const nameInput = document.getElementById('name');
    if (nameInput) {
        nameInput.addEventListener('blur', () => validateFieldInline(nameInput));
        nameInput.addEventListener('input', () => {
            if (nameInput.classList.contains('field-error')) validateFieldInline(nameInput);
        });
    }

    // Auto-Save: persiste dados a cada mudança no formulário
    if (UI.form) {
        UI.form.addEventListener('change', saveDraft);
        UI.form.addEventListener('input', saveDraft);
    }

    // Condicional: mostra campo de detalhe quando "Sim" é selecionado
    if (UI.form) {
        UI.form.addEventListener('change', (e) => {
            if (e.target.name === 'other_sport') {
                const field = document.getElementById('other-sport-field');
                if (field) {
                    const isYes = e.target.value === 'Sim';
                    field.classList.toggle('visible', isYes);
                    const detail = document.getElementById('other_sport_detail');
                    if (!isYes && detail) detail.value = '';
                }
            }
        });
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
    saveDraft();
    
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

    // Renderiza resumo ao entrar no último passo
    if (state.currentStep === CONFIG.TOTAL_STEPS) {
        renderReviewCard();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateUI() {
    // Steps Visibility
    UI.steps.forEach(step => {
        const isActive = parseInt(step.dataset.step) === state.currentStep;
        step.classList.toggle('active', isActive);
    });

    // Pause video when leaving Step 1
    const video = document.getElementById('intro-video');
    if (video && state.currentStep !== 1) {
        video.pause();
        const overlay = document.getElementById('video-overlay');
        if (overlay) overlay.classList.remove('hidden');
    }

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
        
        // Lógica de Delay no Passo 1 (Vídeo)
        if (state.currentStep === 1 && !state.videoDelayPassed) {
            UI.nextBtn.classList.add('locked-delayed');
            if (UI.videoInstruction) UI.videoInstruction.classList.remove('hidden');
        } else {
            UI.nextBtn.classList.remove('locked-delayed');
            if (UI.videoInstruction) UI.videoInstruction.classList.add('hidden');
        }
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

    // Validação de Nome: Mínimo 2 palavras
    if (step === 2) {
        const nameInput = document.getElementById('name');
        if (nameInput) {
            const words = nameInput.value.trim().split(/\s+/);
            if (words.length < 2) {
                nameInput.focus();
                nameInput.classList.add('field-error');
                showToast('Por favor, informe seu nome completo.', 'warning');
                return false;
            }
        }
    }

    // Validação específica do WhatsApp: mínimo 10 dígitos (DDD + número)
    if (step === 2) {
        const whatsappInput = document.getElementById('whatsapp');
        if (whatsappInput) {
            const digits = whatsappInput.value.replace(/\D/g, '');
            if (digits.length < 10) {
                whatsappInput.focus();
                whatsappInput.classList.add('field-error');
                whatsappInput.classList.remove('field-ok');
                showToast('WhatsApp inválido. Informe DDD + número completo.', 'error');
                return false;
            }
        }
    }

    if (step === 5 && state.selections.length === 0) {
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

/**
 * Review Card
 */
function renderReviewCard() {
    const card = document.getElementById('review-card');
    if (!card) return;

    const name    = document.getElementById('name')?.value || '—';
    const phone   = document.getElementById('whatsapp')?.value || '—';
    const planRaw = UI.form.plan_type?.value;
    const plan    = planRaw === 'Inativo' ? 'Não estou treinando' : (planRaw || '—');
    const freq    = UI.form.frequency?.value || '—';
    const sport   = UI.form.other_sport?.value || '—';
    const detail  = document.getElementById('other_sport_detail')?.value;

    const scheduleHTML = state.selections.length
        ? state.selections.map(s =>
            `<span class="review-tag">${getDayFull(s.day)} às ${s.time}</span>`
          ).join('')
        : '<span class="review-empty">Nenhum horário selecionado</span>';

    card.innerHTML = `
        <div class="review-row">
            <span class="review-label">Nome</span>
            <span class="review-value">${name}</span>
        </div>
        <div class="review-row">
            <span class="review-label">WhatsApp</span>
            <span class="review-value">${phone}</span>
        </div>
        <div class="review-row">
            <span class="review-label">Plano</span>
            <span class="review-value">${plan}</span>
        </div>
        <div class="review-row">
            <span class="review-label">Frequência</span>
            <span class="review-value">${freq} por semana</span>
        </div>
        <div class="review-row">
            <span class="review-label">Horários</span>
            <div class="review-tags">${scheduleHTML}</div>
        </div>
        <div class="review-row">
            <span class="review-label">Outro esporte</span>
            <span class="review-value">${sport}${detail ? ' — ' + detail : ''}</span>
        </div>
    `;
}

window.removeSchedule = (index) => {
    state.selections.splice(index, 1);
    renderList();
    saveDraft();
};

/**
 * WhatsApp Mask
 */
function applyWhatsAppMask(e) {
    let v = e.target.value.replace(/\D/g, '');
    
    // Limita a 11 dígitos
    if (v.length > 11) v = v.slice(0, 11);
    
    if (v.length === 0) {
        e.target.value = v;
    } else if (v.length <= 2) {
        e.target.value = '(' + v;
    } else if (v.length <= 6) {
        e.target.value = '(' + v.slice(0, 2) + ') ' + v.slice(2);
    } else if (v.length <= 10) {
        e.target.value = '(' + v.slice(0, 2) + ') ' + v.slice(2, 6) + '-' + v.slice(6);
    } else {
        e.target.value = '(' + v.slice(0, 2) + ') ' + v.slice(2, 7) + '-' + v.slice(7);
    }
    
    validateFieldInline(e.target);
}

/**
 * Real-time Inline Validation
 */
function validateFieldInline(input) {
    const isValid = input.value.trim().length > 0;
    input.classList.toggle('field-error', !isValid);
    input.classList.toggle('field-ok', isValid);
}

/**
 * Auto-Save (localStorage)
 */
function saveDraft() {
    try {
        const draft = {
            name: document.getElementById('name')?.value || '',
            whatsapp: document.getElementById('whatsapp')?.value || '',
            selections: state.selections
        };
        localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(draft));
    } catch (_) { /* Silencia erros de storage (ex: modo privado restrito) */ }
}

function restoreDraft() {
    try {
        const raw = localStorage.getItem(CONFIG.STORAGE_KEY);
        if (!raw) return;

        const draft = JSON.parse(raw);

        const nameInput = document.getElementById('name');
        const whatsappInput = document.getElementById('whatsapp');

        if (draft.name && nameInput) {
            nameInput.value = draft.name;
            validateFieldInline(nameInput);
        }
        if (draft.whatsapp && whatsappInput) {
            whatsappInput.value = draft.whatsapp;
            validateFieldInline(whatsappInput);
        }
        if (Array.isArray(draft.selections) && draft.selections.length > 0) {
            state.selections = draft.selections;
            renderList();
        }
    } catch (_) { /* Dados corrompidos: ignora silenciosamente */ }
}

/**
 * Form Submission
 */
async function handleSubmit(e) {
    e.preventDefault();
    if (state.isSubmitting) return;

    const otherSportRadio = UI.form.other_sport;
    const formData = {
        student_name: document.getElementById('name').value,
        student_whatsapp: document.getElementById('whatsapp').value,
        student_type: UI.form.plan_type.value,
        weekly_frequency: UI.form.frequency.value,
        schedule_selection: state.selections,
        other_sport: otherSportRadio ? otherSportRadio.value : null,
        other_sport_detail: document.getElementById('other_sport_detail')?.value || null,
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

        // Limpa o rascunho salvo após envio bem-sucedido
        localStorage.removeItem(CONFIG.STORAGE_KEY);
        
        // Dispara envio para o Google Sheets em background (CRM da Recepção)
        fetch(CONFIG.GOOGLE_SHEETS_WEBHOOK, {
            method: 'POST',
            mode: 'no-cors', // Evita problemas de CORS com o Apps Script
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        }).catch(e => console.error("Erro ao enviar para a planilha:", e));

        // Efeito WOW: Confetti
        triggerSuccessConfetti();

        // Configura redirecionamento WhatsApp
        setupWhatsAppRedirect(formData);

        UI.successModal.style.display = 'flex';
    } catch (err) {
        showToast('Erro ao enviar: ' + err.message, 'error');
        toggleLoading(false);
    }
}

function triggerSuccessConfetti() {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    const randomInRange = (min, max) => Math.random() * (max - min) + min;

    const interval = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
            return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);
}

function setupWhatsAppRedirect(data) {
    const btn = document.getElementById('whatsapp-redirect-btn');
    if (!btn) return;

    const phone = CONFIG.WHATSAPP_OFFICIAL;
    
    const text = `Olá Coliseu! Acabei de preencher minha pesquisa de grade inteligente.`;

    btn.onclick = () => {
        const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    };
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

document.addEventListener('DOMContentLoaded', init);
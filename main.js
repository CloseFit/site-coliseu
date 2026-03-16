// State Management
let currentStep = 1;
const totalSteps = 5;
let selections = []; // Array of {day, time}

// Constants
const HOURS = ['05h', '06h', '07h', '08h', '09h', '10h', '11h', '12h', '16h', '17h', '18h', '19h', '20h', '21h'];

// DOM Elements
const quizForm = document.getElementById('quiz-form');
const steps = document.querySelectorAll('.quiz-step');
const progressBar = document.getElementById('progress-bar');
const stepIndicator = document.getElementById('step-indicator');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const submitBtn = document.getElementById('submit-btn');

// Preference List Elements
const daySelector = document.getElementById('day-selector');
const timeSelector = document.getElementById('time-selector');
const addScheduleBtn = document.getElementById('add-schedule-btn');
const preferenceList = document.getElementById('preference-list');
const selectionFooter = document.getElementById('selection-footer');

// Init
function init() {
    // Populate Time Selector
    if (timeSelector) {
        HOURS.forEach(hour => {
            const opt = document.createElement('option');
            opt.value = hour;
            opt.textContent = hour;
            timeSelector.appendChild(opt);
        });
    }

    // Add Schedule Event
    if (addScheduleBtn) {
        addScheduleBtn.onclick = () => {
            const day = daySelector.value;
            const time = timeSelector.value;

            if (!day || !time) {
                alert('Selecione o Dia e o Horário!');
                return;
            }

            // Check Duplicate
            const isDuplicate = selections.some(s => s.day === day && s.time === time);
            if (isDuplicate) {
                alert('Este horário já foi adicionado!');
                return;
            }

            // Add to state
            selections.push({ day, time });
            renderList();
            
            // Reset selectors
            daySelector.selectedIndex = 0;
            timeSelector.selectedIndex = 0;
        };
    }

    updateUI();
}

// Navigation Logic
nextBtn.onclick = () => {
    if (validateStep(currentStep)) {
        if (currentStep < totalSteps) {
            currentStep++;
            updateUI();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }
};

prevBtn.onclick = () => {
    if (currentStep > 1) {
        currentStep--;
        updateUI();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
};

function updateUI() {
    // Update Steps Visibility
    steps.forEach(step => {
        step.classList.remove('active');
        if (parseInt(step.dataset.step) === currentStep) {
            step.classList.add('active');
        }
    });

    // Progress Bar
    if (progressBar) {
        const progress = (currentStep / totalSteps) * 100;
        progressBar.style.width = `${progress}%`;
    }
    
    if (stepIndicator) {
        stepIndicator.innerText = `Passo ${currentStep} de ${totalSteps}`;
    }

    // Nav Buttons
    prevBtn.style.display = currentStep === 1 ? 'none' : 'block';
    if (currentStep === totalSteps) {
        nextBtn.style.display = 'none';
        submitBtn.style.display = 'block';
    } else {
        nextBtn.style.display = 'block';
        submitBtn.style.display = 'none';
    }
}

function validateStep(step) {
    const activeStep = document.querySelector(`.quiz-step[data-step="${step}"]`);
    if (!activeStep) return true;

    const inputs = activeStep.querySelectorAll('input[required]');
    
    for (let input of inputs) {
        if (input.type === 'radio') {
            const name = input.name;
            const checked = activeStep.querySelector(`input[name="${name}"]:checked`);
            if (!checked) {
                alert('Ops! Selecione uma opção para continuar.');
                return false;
            }
        } else if (!input.value.trim()) {
            input.focus();
            alert('Por favor, preencha este campo.');
            return false;
        }
    }

    // Step 4: Schedule Validation
    if (step === 4 && selections.length === 0) {
        return confirm('Você não selecionou nenhum horário. Deseja continuar assim mesmo?');
    }

    return true;
}

function renderList() {
    if (!preferenceList) return;
    
    preferenceList.innerHTML = '';
    
    if (selections.length === 0) {
        selectionFooter.innerText = 'Nenhum horário adicionado';
    } else {
        selectionFooter.innerText = `${selections.length} horário(s) selecionado(s)`;
    }

    selections.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'preference-item';
        div.innerHTML = `
            <div class="preference-info">
                <span>${getDayFull(item.day)}</span> às ${item.time}
            </div>
            <button type="button" class="btn-remove" onclick="removeSchedule(${index})">✕</button>
        `;
        preferenceList.appendChild(div);
    });
}

function getDayFull(short) {
    const days = {
        'SEG': 'Segunda',
        'TER': 'Terça',
        'QUA': 'Quarta',
        'QUI': 'Quinta',
        'SEX': 'Sexta',
        'SAB': 'Sábado'
    };
    return days[short] || short;
}

window.removeSchedule = (index) => {
    selections.splice(index, 1);
    renderList();
};

// Form Submission
quizForm.onsubmit = async (e) => {
    e.preventDefault();
    
    const formData = {
        student_name: document.getElementById('name').value,
        student_whatsapp: document.getElementById('whatsapp').value,
        student_type: quizForm.plan_type.value,
        weekly_frequency: quizForm.frequency.value,
        schedule_selection: selections,
        observations: document.getElementById('observations').value
    };

    submitBtn.disabled = true;
    submitBtn.innerText = 'ENVIANDO...';

    // SUPABASE INTEGRATION
    const supabaseUrl = 'https://gzvflbsjksmriqfaiizr.supabase.co'; 
    const supabaseKey = 'sb_publishable_RReaq3MLFL3G8_6Q5sqlMw_j80yV-lj';

    try {
        if (supabaseUrl && supabaseKey) {
            const { createClient } = supabase;
            const _supabase = createClient(supabaseUrl, supabaseKey);
            const { error } = await _supabase
                .from('crossfit_schedule_research')
                .insert([formData]);

            if (error) throw error;
        } else {
            console.log('Dados Enviados (Simulação):', formData);
            await new Promise(r => setTimeout(r, 1000));
        }

        document.getElementById('success-modal').style.display = 'flex';
    } catch (err) {
        alert('Erro ao enviar: ' + err.message);
        submitBtn.disabled = false;
        submitBtn.innerText = 'Enviar Pesquisa';
    }
};

init();

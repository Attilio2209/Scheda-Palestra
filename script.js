document.addEventListener('DOMContentLoaded', () => {
    // Riferimenti agli elementi del DOM
    const views = document.querySelectorAll('.view');
    const daySelector = document.getElementById('day-selector');
    const showWorkoutBtn = document.getElementById('show-workout-btn');
    const goToEditorBtn = document.getElementById('go-to-editor-btn');
    
    const listDayTitle = document.getElementById('list-day-title');
    const exerciseList = document.getElementById('exercise-list');
    const backToDaySelectionBtn = document.getElementById('back-to-day-selection-btn');

    const detailExerciseName = document.getElementById('detail-exercise-name');
    const detailPhoto = document.getElementById('detail-photo');
    const detailView = document.getElementById('view-exercise-detail');
    
    const markAsDoneBtn = document.getElementById('mark-as-done-btn');
    const backToListBtn = document.getElementById('back-to-list-btn');

    const addExerciseForm = document.getElementById('add-exercise-form');
    const existingExercisesList = document.getElementById('existing-exercises-list');
    const backFromEditorBtn = document.getElementById('back-from-editor-btn');
    
    const creationDateEl = document.getElementById('creation-date');
    const usageCountEl = document.getElementById('usage-count');

    let workoutPlan = {};
    let sessionState = {};
    let currentDay = '';
    let currentExerciseId = null;

    // Funzione per navigare tra le viste
    function showView(viewId) {
        views.forEach(view => view.classList.remove('active'));
        document.getElementById(viewId).classList.add('active');
    }

    // Funzione per caricare la scheda dal localStorage
    function loadPlan() {
        const savedPlan = localStorage.getItem('workoutPlan');
        if (savedPlan) {
            workoutPlan = JSON.parse(savedPlan);
        } else {
            workoutPlan = {
                metadata: { creationDate: new Date().toLocaleDateString('it-IT'), usageCount: 0 },
                schedule: { "Lunedì": [], "Martedì": [], "Mercoledì": [], "Giovedì": [], "Venerdì": [], "Sabato": [], "Domenica": [] }
            };
            savePlan();
        }
        updateMetadata();
    }

    // Funzione per salvare la scheda nel localStorage
    function savePlan() {
        localStorage.setItem('workoutPlan', JSON.stringify(workoutPlan));
        updateMetadata();
    }

    function updateMetadata() {
        creationDateEl.textContent = workoutPlan.metadata.creationDate || '--';
        usageCountEl.textContent = workoutPlan.metadata.usageCount || '0';
    }
    
    function renderExerciseList(day) {
        currentDay = day;
        listDayTitle.textContent = `Allenamento di ${day}`;
        exerciseList.innerHTML = ''; 

        sessionState.exercises = JSON.parse(JSON.stringify(workoutPlan.schedule[day] || []));
        sessionState.exercises.forEach(ex => ex.eseguito = false);

        const exercisesToShow = sessionState.exercises.filter(ex => !ex.eseguito);

        if (exercisesToShow.length === 0) {
            exerciseList.innerHTML = '<li>Nessun esercizio per oggi, o hai già finito tutto! 🎉</li>';
        } else {
            exercisesToShow.forEach((exercise) => {
                const li = document.createElement('li');
                li.textContent = exercise.nome;
                li.dataset.id = exercise.id;
                li.addEventListener('click', () => {
                    currentExerciseId = exercise.id;
                    renderExerciseDetail();
                });
                exerciseList.appendChild(li);
            });
        }
        showView('view-exercise-list');
    }

    function renderExerciseDetail() {
        const exercise = sessionState.exercises.find(ex => ex.id === currentExerciseId);
        if (!exercise) return;

        detailExerciseName.textContent = exercise.nome;
        detailPhoto.src = exercise.foto || 'https://via.placeholder.com/300x200.png?text=Nessuna+Immagine';
        
        // Popola i valori
        document.getElementById('detail-sets').textContent = exercise.set;
        document.getElementById('detail-reps').value = exercise.ripetute;
        document.getElementById('detail-duration').value = exercise.durata || '';
        document.getElementById('detail-weight').textContent = exercise.peso || '0';
        document.getElementById('detail-recovery').textContent = exercise.recupero;
        
        showView('view-exercise-detail');
    }

    // Gestione unificata degli eventi di modifica
    detailView.addEventListener('click', (event) => {
        const target = event.target;
        if (target.matches('.stepper-btn')) {
            const field = target.dataset.field;
            const step = parseFloat(target.dataset.step);
            updateExerciseValue(field, step);
        }
    });

    detailView.addEventListener('change', (event) => {
        const target = event.target;
        if (target.matches('.editable-field')) {
            const field = target.id.replace('detail-', '');
            updateExerciseValue(field, target.value);
        }
    });

    function updateExerciseValue(field, value) {
        const masterExercise = workoutPlan.schedule[currentDay].find(ex => ex.id === currentExerciseId);
        if (!masterExercise) return;

        const sessionExercise = sessionState.exercises.find(ex => ex.id === currentExerciseId);

        if (typeof value === 'number' && !isNaN(value)) { // Stepper
            let currentValue = parseFloat(masterExercise[field] || 0);
            let newValue = currentValue + value;
            if (newValue < 0) newValue = 0;
            
            masterExercise[field] = (field === 'peso') ? newValue.toFixed(1) : String(Math.round(newValue));
        } else { // Campo di testo
            masterExercise[field] = value;
        }

        sessionExercise[field] = masterExercise[field];
        savePlan();
        renderExerciseDetail(); // Ridisegna la vista con i nuovi valori
    }

    function markAsDone() {
        const exerciseIndex = sessionState.exercises.findIndex(ex => ex.id === currentExerciseId);
        if (exerciseIndex !== -1) {
            sessionState.exercises[exerciseIndex].eseguito = true;
        }

        if (!sessionState.usageCounted) {
             workoutPlan.metadata.usageCount = (workoutPlan.metadata.usageCount || 0) + 1;
             sessionState.usageCounted = true;
             savePlan();
        }
        
        renderExerciseList(currentDay); 
        showView('view-exercise-list');
    }

    function addExercise(event) {
        event.preventDefault();
        const formData = new FormData(event.target);
        const exercise = {
            id: Date.now(),
            giorno: formData.get('giorno'),
            nome: formData.get('nome'),
            set: formData.get('set'),
            ripetute: formData.get('ripetute'),
            durata: formData.get('durata'),
            peso: formData.get('peso'),
            recupero: formData.get('recupero'),
            foto: formData.get('foto'),
            eseguito: false
        };
        workoutPlan.schedule[exercise.giorno].push(exercise);
        savePlan();
        renderEditor();
        event.target.reset();
    }
    
    function deleteExercise(day, exerciseId) {
        workoutPlan.schedule[day] = workoutPlan.schedule[day].filter(ex => ex.id !== exerciseId);
        savePlan();
        renderEditor();
    }

    function renderEditor() {
        existingExercisesList.innerHTML = '';
        Object.keys(workoutPlan.schedule).forEach(day => {
            if (workoutPlan.schedule[day].length > 0) {
                const dayHeader = document.createElement('h4');
                dayHeader.textContent = day;
                existingExercisesList.appendChild(dayHeader);

                workoutPlan.schedule[day].forEach(exercise => {
                    const itemDiv = document.createElement('div');
                    itemDiv.className = 'exercise-item';
                    itemDiv.innerHTML = `<span>${exercise.nome}</span>`;
                    
                    const deleteBtn = document.createElement('button');
                    deleteBtn.className = 'delete-btn';
                    deleteBtn.textContent = 'Elimina';
                    deleteBtn.addEventListener('click', () => deleteExercise(day, exercise.id));
                    
                    itemDiv.appendChild(deleteBtn);
                    existingExercisesList.appendChild(itemDiv);
                });
            }
        });
        showView('view-editor');
    }

    // Event listeners
    showWorkoutBtn.addEventListener('click', () => {
        const selectedDay = daySelector.value;
        sessionState.usageCounted = false;
        renderExerciseList(selectedDay);
    });

    markAsDoneBtn.addEventListener('click', markAsDone);
    addExerciseForm.addEventListener('submit', addExercise);
    
    backToDaySelectionBtn.addEventListener('click', () => showView('view-day-selection'));
    backToListBtn.addEventListener('click', () => renderExerciseList(currentDay)); // Ricarica la lista per sicurezza
    goToEditorBtn.addEventListener('click', renderEditor);
    backFromEditorBtn.addEventListener('click', () => showView('view-day-selection'));

    // Inizializzazione
    loadPlan();
    showView('view-day-selection');
});
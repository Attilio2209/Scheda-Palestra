// ==================================================================
//               INIZIA A COPIARE DA QUI
// ==================================================================

document.addEventListener('DOMContentLoaded', () => {

    // --- 1. INIZIALIZZAZIONE FIREBASE E VARIABILI GLOBALI ---
    const firebaseConfig = {
        apiKey: "AIzaSyAP7t7sIq_IQb-R2ZYoSrBdFOCJiN3kifE",
        authDomain: "scheda-palestra-app.firebaseapp.com",
        projectId: "scheda-palestra-app",
        storageBucket: "scheda-palestra-app.firebasestorage.app",
        messagingSenderId: "72763855410",
        appId: "1:72763855410:web:280b8c2902f7bb60f2a22b",
        measurementId: "G-LZBSX8FSPN"
    };
    const app = firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const db = firebase.firestore(app);

    // Riferimenti agli elementi del DOM
    const elements = {
        views: document.querySelectorAll('.view'),
        daySelector: document.getElementById('day-selector'),
        showWorkoutBtn: document.getElementById('show-workout-btn'),
        goToEditorBtn: document.getElementById('go-to-editor-btn'),
        listDayTitle: document.getElementById('list-day-title'),
        exerciseList: document.getElementById('exercise-list'),
        backToDaySelectionBtn: document.getElementById('back-to-day-selection-btn'),
        detailExerciseName: document.getElementById('detail-exercise-name'),
        detailPhoto: document.getElementById('detail-photo'),
        detailView: document.getElementById('view-exercise-detail'),
        markAsDoneBtn: document.getElementById('mark-as-done-btn'),
        backToListBtn: document.getElementById('back-to-list-btn'),
        addExerciseForm: document.getElementById('add-exercise-form'),
        existingExercisesList: document.getElementById('existing-exercises-list'),
        backFromEditorBtn: document.getElementById('back-from-editor-btn'),
        creationDateEl: document.getElementById('creation-date'),
        usageCountEl: document.getElementById('usage-count'),
        loginBtn: document.getElementById('login-btn'),
        logoutBtn: document.getElementById('logout-btn'),
        authContainer: document.getElementById('auth-container'),
        schedaContainer: document.querySelector('.container'),
        userName: document.getElementById('user-name'),
        userInfo: document.getElementById('user-info')
    };

    // Variabili di stato
    let workoutPlan = {};
    let sessionState = {};
    let currentDay = '';
    let currentExerciseId = null;
    let currentUserId = null;

    // --- 2. FUNZIONI DELL'APPLICAZIONE ---
    function showView(viewId) {
        elements.views.forEach(view => view.classList.remove('active'));
        const viewToShow = document.getElementById(viewId);
        if (viewToShow) {
            viewToShow.classList.add('active');
        }
    }

    function updateMetadata() {
        if (workoutPlan && workoutPlan.metadata) {
            elements.creationDateEl.textContent = workoutPlan.metadata.creationDate || '--';
            elements.usageCountEl.textContent = workoutPlan.metadata.usageCount || '0';
        }
    }

    function renderExerciseList(day) {
        currentDay = day;
        elements.listDayTitle.textContent = `Allenamento di ${day}`;
        elements.exerciseList.innerHTML = '';
        if (!workoutPlan.schedule || !workoutPlan.schedule[day] || workoutPlan.schedule[day].length === 0) {
            elements.exerciseList.innerHTML = '<li>Nessun esercizio definito per questo giorno.</li>';
            return;
        }
        
        // Se è la prima volta che si visualizza la lista per questa sessione, inizializza lo stato
        if (!sessionState.day || sessionState.day !== day) {
            sessionState = {
                day: day,
                exercises: JSON.parse(JSON.stringify(workoutPlan.schedule[day])),
                usageCounted: false
            };
        }

        const exercisesToShow = sessionState.exercises.filter(ex => !ex.eseguito);
        
        if (exercisesToShow.length === 0) {
            elements.exerciseList.innerHTML = '<li>Hai già finito tutti gli esercizi per oggi! 🎉</li>';
        } else {
            exercisesToShow.forEach(exercise => {
                const li = document.createElement('li');
                const isDone = sessionState.exercises.find(ex => ex.id === exercise.id)?.eseguito || false;
                const checkmark = isDone ? '<span class="completed-check">✅</span>' : '';
                li.innerHTML = `${exercise.nome} ${checkmark}`;
                li.dataset.id = exercise.id;
                li.addEventListener('click', () => { 
                    currentExerciseId = exercise.id; 
                    renderExerciseDetail(); 
                });
                elements.exerciseList.appendChild(li);
            });
        }
        showView('view-exercise-list');
    }

    // SOSTITUISCI L'INTERA FUNZIONE renderExerciseDetail con questa
function renderExerciseDetail() {
    const exercise = sessionState.exercises.find(ex => ex.id === currentExerciseId);
    if (!exercise) {
        console.error("Esercizio non trovato in sessionState!");
        return;
    }
    
    // Popola i campi
    elements.detailExerciseName.textContent = exercise.nome;
    elements.detailPhoto.src = exercise.foto || 'https://via.placeholder.com/300x200.png?text=Nessuna+Immagine';
    
    // Popola le note salvate (dall'editor)
    document.getElementById('detail-description').textContent = exercise.note || 'Nessuna descrizione.';
    
    // Pulisce le note di sessione ogni volta che si apre il dettaglio
    document.getElementById('detail-session-notes').value = '';

    // Popola il resto dei dati
    document.getElementById('detail-sets').textContent = exercise.set;
    document.getElementById('detail-reps').value = exercise.ripetute;
    document.getElementById('detail-duration').value = exercise.durata || '';
    document.getElementById('detail-weight').textContent = exercise.peso || '0';
    document.getElementById('detail-recovery').textContent = exercise.recupero;
    
    showView('view-exercise-detail');
}

    function updateExerciseValue(field, value) {
        const masterExercise = workoutPlan.schedule[currentDay].find(ex => ex.id === currentExerciseId);
        if (!masterExercise) return;
        
        const sessionExercise = sessionState.exercises.find(ex => ex.id === currentExerciseId);
        
        if (typeof value === 'number' && !isNaN(value)) {
            let currentValue = parseFloat(masterExercise[field] || 0);
            let newValue = currentValue + value;
            if (newValue < 0) newValue = 0;
            masterExercise[field] = (field === 'peso') ? newValue.toFixed(1) : String(Math.round(newValue));
        } else {
            masterExercise[field] = value;
        }
        
        if(sessionExercise) sessionExercise[field] = masterExercise[field];
        
        savePlanToFirebase();
        renderExerciseDetail();
    }
    
    function markAsDone() {
        const exerciseIndex = sessionState.exercises.findIndex(ex => ex.id === currentExerciseId);
        if (exerciseIndex !== -1) {
            sessionState.exercises[exerciseIndex].eseguito = true;
        }
        
        if (!sessionState.usageCounted) {
             workoutPlan.metadata.usageCount = (workoutPlan.metadata.usageCount || 0) + 1;
             sessionState.usageCounted = true;
             savePlanToFirebase();
        }
        renderExerciseList(currentDay); 
    }

    function addExercise(event) {
        event.preventDefault();
        const formData = new FormData(event.target);
        const day = formData.get('giorno');
        const exercise = {
            id: Date.now(),
            giorno: day,
            nome: formData.get('nome'),
            set: formData.get('set'),
            ripetute: formData.get('ripetute'),
            durata: formData.get('durata'),
            peso: formData.get('peso'),
            recupero: formData.get('recupero'),
            foto: formData.get('foto'),
            note: formData.get('note'),
            eseguito: false
        };

        if (!workoutPlan.schedule) {
            workoutPlan.schedule = { "Lunedì": [], "Martedì": [], "Mercoledì": [], "Giovedì": [], "Venerdì": [], "Sabato": [], "Domenica": [] };
        }
        if (!workoutPlan.schedule[day]) {
            workoutPlan.schedule[day] = [];
        }

        workoutPlan.schedule[day].push(exercise);
        savePlanToFirebase();
        renderEditor();
        event.target.reset();
    }

    function deleteExercise(day, exerciseId) {
        if (workoutPlan && workoutPlan.schedule && workoutPlan.schedule[day]) {
            workoutPlan.schedule[day] = workoutPlan.schedule[day].filter(ex => ex.id !== exerciseId);
            savePlanToFirebase();
            renderEditor();
        }
    }
  
    function renderEditor() {
        elements.existingExercisesList.innerHTML = '';
        if (!workoutPlan || !workoutPlan.schedule) {
            showView('view-editor');
            return;
        }

        Object.keys(workoutPlan.schedule).forEach(day => {
            if (workoutPlan.schedule[day] && workoutPlan.schedule[day].length > 0) {
                const dayHeader = document.createElement('h4');
                dayHeader.textContent = day;
                elements.existingExercisesList.appendChild(dayHeader);
                
                workoutPlan.schedule[day].forEach(exercise => {
                    const itemDiv = document.createElement('div');
                    itemDiv.className = 'exercise-item';
                    itemDiv.innerHTML = `<span>${exercise.nome}</span>`;
                    const deleteBtn = document.createElement('button');
                    deleteBtn.className = 'delete-btn';
                    deleteBtn.textContent = 'Elimina';
                    deleteBtn.addEventListener('click', () => deleteExercise(day, exercise.id));
                    itemDiv.appendChild(deleteBtn);
                    elements.existingExercisesList.appendChild(itemDiv);
                });
            }
        });
        showView('view-editor');
    }

    // --- 3. LOGICA FIREBASE ---
    function savePlanToFirebase() {
        if (currentUserId) {
            db.collection('userPlans').doc(currentUserId).set(workoutPlan)
                .catch(err => console.error("Errore salvataggio:", err));
        }
    }

    async function loadPlan(userId) {
        const docRef = db.collection('userPlans').doc(userId);
        try {
            const doc = await docRef.get();
            if (doc.exists && doc.data().schedule) {
                workoutPlan = doc.data();
            } else {
                workoutPlan = {
                    metadata: { creationDate: new Date().toLocaleDateString('it-IT'), usageCount: 0 },
                    schedule: { "Lunedì": [], "Martedì": [], "Mercoledì": [], "Giovedì": [], "Venerdì": [], "Sabato": [], "Domenica": [] }
                };
                await savePlanToFirebase();
            }
        } catch (error) {
            console.error("Errore caricamento dati:", error);
        }
    }

    function resetAppState() {
        workoutPlan = {};
        sessionState = {};
        currentDay = '';
        currentExerciseId = null;
        console.log("Stato dell'applicazione resettato.");
    }

    // --- 4. GESTORE AUTENTICAZIONE ---
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            currentUserId = user.uid;
            elements.authContainer.classList.add('logged-in');
            elements.userName.textContent = user.displayName;
            elements.schedaContainer.style.display = 'block';
            
            await loadPlan(user.uid);
            updateMetadata();
            showView('view-day-selection');
            
        } else {
            currentUserId = null;
            elements.authContainer.classList.remove('logged-in');
            elements.schedaContainer.style.display = 'none';
            resetAppState();
        }
    });

    // --- 5. EVENT LISTENERS ---
    elements.loginBtn.addEventListener('click', () => auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()));
    elements.logoutBtn.addEventListener('click', () => auth.signOut());
    elements.showWorkoutBtn.addEventListener('click', () => renderExerciseList(elements.daySelector.value));
    elements.goToEditorBtn.addEventListener('click', renderEditor);
    elements.backToDaySelectionBtn.addEventListener('click', () => showView('view-day-selection'));
    elements.backToListBtn.addEventListener('click', () => renderExerciseList(currentDay));
    elements.backFromEditorBtn.addEventListener('click', () => showView('view-day-selection'));
    elements.markAsDoneBtn.addEventListener('click', markAsDone);
    elements.addExerciseForm.addEventListener('submit', addExercise);
    
    elements.detailView.addEventListener('click', (e) => {
        if (e.target.matches('.stepper-btn')) { 
            updateExerciseValue(e.target.dataset.field, parseFloat(e.target.dataset.step)); 
        }
    });
    
    elements.detailView.addEventListener('change', (e) => {
        if (e.target.matches('.editable-field')) { 
            updateExerciseValue(e.target.id.replace('detail-', ''), e.target.value); 
        }
    });
});

// ==================================================================
//               FINISCI DI COPIARE QUI
// ==================================================================
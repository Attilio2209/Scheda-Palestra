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
    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const db = firebase.firestore();

    // Riferimenti agli elementi del DOM (dal tuo codice originale)
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
    // Elementi di login
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const authContainer = document.getElementById('auth-container');
    const schedaContainer = document.querySelector('.container');
    const userName = document.getElementById('user-name');
    const userInfo = document.getElementById('user-info');
    
    // Variabili di stato
    let workoutPlan = {};
    let sessionState = {};
    let currentDay = '';
    let currentExerciseId = null;
    let currentUserId = null; 

    // --- 2. FUNZIONI DELLA TUA APP (logica originale) ---
    function showView(viewId) {
        views.forEach(view => view.classList.remove('active'));
        const viewToShow = document.getElementById(viewId);
        if(viewToShow) viewToShow.classList.add('active');
    }
    
    function updateMetadata() {
        if (workoutPlan && workoutPlan.metadata) {
            creationDateEl.textContent = workoutPlan.metadata.creationDate || '--';
            usageCountEl.textContent = workoutPlan.metadata.usageCount || '0';
        }
    }
    
    function renderExerciseList(day) {
        currentDay = day;
        listDayTitle.textContent = `Allenamento di ${day}`;
        exerciseList.innerHTML = ''; 
        if (!workoutPlan.schedule || !workoutPlan.schedule[day]) {
            exerciseList.innerHTML = '<li>Nessun esercizio definito per questo giorno.</li>';
        } else {
            sessionState.exercises = JSON.parse(JSON.stringify(workoutPlan.schedule[day]));
            sessionState.exercises.forEach(ex => ex.eseguito = false);
            const exercisesToShow = sessionState.exercises.filter(ex => !ex.eseguito);
            if (exercisesToShow.length === 0) {
                exerciseList.innerHTML = '<li>Nessun esercizio per oggi, o hai già finito tutto! 🎉</li>';
            } else {
                exercisesToShow.forEach((exercise) => {
                    const li = document.createElement('li');
                    li.textContent = exercise.nome;
                    li.dataset.id = exercise.id;
                    li.addEventListener('click', () => { currentExerciseId = exercise.id; renderExerciseDetail(); });
                    exerciseList.appendChild(li);
                });
            }
        }
        showView('view-exercise-list');
    }

    function renderExerciseDetail() {
        const exercise = sessionState.exercises.find(ex => ex.id === currentExerciseId);
        if (!exercise) return;
        detailExerciseName.textContent = exercise.nome;
        detailPhoto.src = exercise.foto || 'https://via.placeholder.com/300x200.png?text=Nessuna+Immagine';
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
        sessionExercise[field] = masterExercise[field];
        savePlanToFirebase();
        renderExerciseDetail();
    }

    function markAsDone() {
        const exerciseIndex = sessionState.exercises.findIndex(ex => ex.id === currentExerciseId);
        if (exerciseIndex !== -1) sessionState.exercises[exerciseIndex].eseguito = true;
        if (!sessionState.usageCounted) {
             workoutPlan.metadata.usageCount = (workoutPlan.metadata.usageCount || 0) + 1;
             sessionState.usageCounted = true;
             savePlanToFirebase();
        }
        renderExerciseList(currentDay); 
        showView('view-exercise-list');
    }

    function addExercise(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const day = formData.get('giorno');

    // --- CORREZIONE FINALE ---
    // 1. Controlliamo se 'schedule' esiste. Se no, lo creiamo.
    if (!workoutPlan.schedule) {
        workoutPlan.schedule = {};
    }

    // 2. Controlliamo se l'array per il giorno specifico esiste. Se no, lo creiamo.
    //    (Questo controllo ora è sicuro perché sappiamo che .schedule esiste)
    if (!workoutPlan.schedule[day]) {
        workoutPlan.schedule[day] = [];
    }
    // --- FINE CORREZIONE ---

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
        eseguito: false
    };

    workoutPlan.schedule[day].push(exercise);
    
    savePlanToFirebase();
    renderEditor();
    event.target.reset();
}
    
    function deleteExercise(day, exerciseId) {
        workoutPlan.schedule[day] = workoutPlan.schedule[day].filter(ex => ex.id !== exerciseId);
        savePlanToFirebase();
        renderEditor();
    }

    function renderEditor() {
        existingExercisesList.innerHTML = '';
        const schedule = workoutPlan.schedule || {};
        Object.keys(schedule).forEach(day => {
            if (schedule[day].length > 0) {
                const dayHeader = document.createElement('h4');
                dayHeader.textContent = day;
                existingExercisesList.appendChild(dayHeader);
                schedule[day].forEach(exercise => {
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

    // --- 3. LOGICA FIREBASE ---
    function savePlanToFirebase() {
        if (currentUserId) {
            db.collection('userPlans').doc(currentUserId).set(workoutPlan)
                .catch(err => console.error("Errore salvataggio:", err));
        }
    }

    function loadPlanFromFirebase(userId) {
        const docRef = db.collection('userPlans').doc(userId);
        docRef.get().then(doc => {
            if (doc.exists) {
                workoutPlan = doc.data();
            } else {
                workoutPlan = {
                    metadata: { creationDate: new Date().toLocaleDateString('it-IT'), usageCount: 0 },
                    schedule: { "Lunedì": [], "Martedì": [], "Mercoledì": [], "Giovedì": [], "Venerdì": [], "Sabato": [], "Domenica": [] }
                };
                savePlanToFirebase();
            }
            updateMetadata();
            showView('view-day-selection');
        }).catch(err => console.error("Errore caricamento:", err));
    }

    // --- 4. CUORE DELL'APP: GESTORE AUTENTICAZIONE ---
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUserId = user.uid;
            authContainer.classList.add('logged-in');
            userName.textContent = user.displayName;
            schedaContainer.style.display = 'block';
            loadPlanFromFirebase(user.uid);
        } else {
            currentUserId = null;
            authContainer.classList.remove('logged-in');
            schedaContainer.style.display = 'none';
            // Non chiamiamo showView qui per non mostrare nulla quando si è sloggati
        }
    });

    // --- 5. EVENT LISTENERS (Originali + Login) ---
    loginBtn.addEventListener('click', () => {
        auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
    });
    logoutBtn.addEventListener('click', () => auth.signOut());
    
    showWorkoutBtn.addEventListener('click', () => renderExerciseList(daySelector.value));
    goToEditorBtn.addEventListener('click', renderEditor);
    backToDaySelectionBtn.addEventListener('click', () => showView('view-day-selection'));
    backToListBtn.addEventListener('click', () => renderExerciseList(currentDay));
    backFromEditorBtn.addEventListener('click', () => showView('view-day-selection'));
    markAsDoneBtn.addEventListener('click', markAsDone);
    addExerciseForm.addEventListener('submit', addExercise);

    detailView.addEventListener('click', (e) => {
        if (e.target.matches('.stepper-btn')) {
            updateExerciseValue(e.target.dataset.field, parseFloat(e.target.dataset.step));
        }
    });
    detailView.addEventListener('change', (e) => {
        if (e.target.matches('.editable-field')) {
            updateExerciseValue(e.target.id.replace('detail-', ''), e.target.value);
        }
    });
});
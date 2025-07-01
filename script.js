// --- 1. INIZIALIZZAZIONE DI FIREBASE ---
// Questa parte è corretta e la teniamo
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

// --- 2. GESTIONE DELL'INTERFACCIA UTENTE (UI) ---
// Raggruppiamo tutti gli elementi dell'interfaccia qui
const ui = {
    loginBtn: document.getElementById('login-btn'),
    logoutBtn: document.getElementById('logout-btn'),
    userInfo: document.getElementById('user-info'),
    userName: document.getElementById('user-name'),
    schedaContainer: document.getElementById('scheda-container')
};

// Funzione per aggiornare la UI in base allo stato di login
function updateUI(user) {
    if (user) {
        // Mostra gli elementi per l'utente loggato
        ui.loginBtn.style.display = 'none';
        ui.logoutBtn.style.display = 'block';
        ui.userInfo.style.display = 'block';
        ui.userName.textContent = user.displayName;
        if (ui.schedaContainer) ui.schedaContainer.style.display = 'block';
    } else {
        // Mostra gli elementi per l'utente non loggato
        ui.loginBtn.style.display = 'block';
        ui.logoutBtn.style.display = 'none';
        ui.userInfo.style.display = 'none';
        if (ui.schedaContainer) ui.schedaContainer.style.display = 'none';
    }
}

// --- 3. LOGICA DI AUTENTICAZIONE ---
ui.loginBtn.addEventListener('click', () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch(error => console.error("Errore Login:", error));
});

ui.logoutBtn.addEventListener('click', () => {
    auth.signOut().catch(error => console.error("Errore Logout:", error));
});

// --- 4. GESTIONE DEI DATI DELLA SCHEDA ---

// !! IMPORTANTE: PERSONALIZZA QUESTA LISTA CON GLI ID DEI TUOI CAMPI !!
const campiDaSalvare = ['peso-panca', 'peso-squat', 'peso-rematore']; // <-- MODIFICA QUESTA!

// Funzione che "attacca" gli eventi di salvataggio ai campi.
// Verrà chiamata SOLO DOPO il login.
function setupEventListeners(userId) {
    campiDaSalvare.forEach(id => {
        const inputElement = document.getElementById(id);
        if (inputElement) {
            inputElement.addEventListener('change', (event) => {
                const datiDaSalvare = { [id]: event.target.value };
                db.collection('schede').doc(userId).set(datiDaSalvare, { merge: true })
                  .then(() => console.log(`Salvato ${id}: ${event.target.value}`))
                  .catch(error => console.error("Errore nel salvataggio:", error));
            });
        }
    });
}

// Funzione che carica i dati e li mette nei campi.
function loadUserData(userId) {
    const docRef = db.collection('schede').doc(userId);
    docRef.get().then(doc => {
        if (doc.exists) {
            const datiSalvati = doc.data();
            console.log("Dati caricati da Firebase:", datiSalvati);
            campiDaSalvare.forEach(id => {
                const inputElement = document.getElementById(id);
                if (inputElement && datiSalvati[id] !== undefined) {
                    inputElement.value = datiSalvati[id];
                }
            });
        } else {
            console.log("Nessun dato pre-esistente per questo utente.");
        }
    }).catch(error => console.error("Errore nel caricamento dati:", error));
}


// --- 5. CUORE DELL'APPLICAZIONE ---
// Questo gestore centrale orchestra tutto.
auth.onAuthStateChanged(user => {
    updateUI(user); // Aggiorna sempre la UI

    if (user) {
        // Se l'utente è loggato:
        console.log("Utente loggato:", user.displayName, user.uid);
        loadUserData(user.uid);      // 1. Carica i suoi dati
        setupEventListeners(user.uid); // 2. Attiva il salvataggio automatico
    } else {
        // Se l'utente non è loggato:
        console.log("Nessun utente loggato.");
        // Non facciamo nient'altro, la UI è già a posto.
    }
});
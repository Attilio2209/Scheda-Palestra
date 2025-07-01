// =========================================================================
// ========= CODICE NUOVO E COMPLETO (CHE SOSTITUISCE QUELLO VECCHIO) ========
// =========================================================================

// --- 1. INIZIALIZZAZIONE DI FIREBASE ---
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


// --- 2. SELETTORI PER GLI ELEMENTI HTML ---
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const userInfo = document.getElementById('user-info');
const userName = document.getElementById('user-name');
// Aggiungi un id="scheda-container" al div che contiene tutta la tua scheda nell'HTML
const schedaContainer = document.getElementById('scheda-container');


// --- 3. LOGICA DI AUTENTICAZIONE ---
loginBtn.addEventListener('click', () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider).catch(error => console.error("Errore Login:", error));
});

logoutBtn.addEventListener('click', () => {
  auth.signOut().catch(error => console.error("Errore Logout:", error));
});


// --- 4. GESTORE PRINCIPALE (IL CUORE DELL'APP) ---
auth.onAuthStateChanged(user => {
  if (user) { // Utente loggato
    console.log("Utente loggato:", user.displayName);
    loginBtn.style.display = 'none';
    logoutBtn.style.display = 'block';
    userInfo.style.display = 'block';
    userName.textContent = user.displayName;
    schedaContainer.style.display = 'block';
    caricaDati(user.uid); // Carica i dati per questo utente
  } else { // Utente non loggato
    console.log("Nessun utente loggato.");
    loginBtn.style.display = 'block';
    logoutBtn.style.display = 'none';
    userInfo.style.display = 'none';
    schedaContainer.style.display = 'none';
  }
});


// --- 5. LOGICA DI SALVATAGGIO E CARICAMENTO DATI SU FIREBASE ---

// La lista degli ID che vogliamo salvare (nota che è ancora qui, ma usata in modo diverso!)
const campiDaSalvare = ['peso-panca', 'peso-squat', 'peso-rematore']; // PERSONALIZZA QUESTA LISTA!

function salvaDati(userId) {
  const datiScheda = {};
  campiDaSalvare.forEach(id => {
    const inputElement = document.getElementById(id);
    if (inputElement) datiScheda[id] = inputElement.value;
  });
  console.log("Salvataggio su Firebase:", datiScheda);
  db.collection('schede').doc(userId).set(datiScheda, { merge: true })
    .catch(error => console.error("Errore nel salvataggio:", error));
}

function caricaDati(userId) {
  db.collection('schede').doc(userId).onSnapshot(doc => {
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
  });
}

// Aggiungiamo gli "ascoltatori" ai campi per triggerare il salvataggio
campiDaSalvare.forEach(id => {
  const inputElement = document.getElementById(id);
  if (inputElement) {
    inputElement.addEventListener('change', () => {
      const currentUser = auth.currentUser;
      if (currentUser) {
        salvaDati(currentUser.uid);
      }
    });
  }
});

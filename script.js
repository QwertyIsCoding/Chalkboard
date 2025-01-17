// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyC2rV2E0BujE6b17pKbfGbN7jUPcKWMGak",
    authDomain: "chalkboard-2d89c.firebaseapp.com",
    projectId: "chalkboard-2d89c",
    storageBucket: "chalkboard-2d89c.firebasestorage.app",
    messagingSenderId: "416242146566",
    appId: "1:416242146566:web:739d2ad2c3f4d8104a5287",
    measurementId: "G-4EGX29H7WY"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// DOM elements
const loginModal = document.getElementById('loginModal');
const settingsModal = document.getElementById('settingsModal');
const noteList = document.getElementById('noteList');
const noteContent = document.getElementById('noteContent');
const noteTitle = document.getElementById('noteTitle');
const noteBody = document.getElementById('noteBody');
const noteMetadata = document.getElementById('noteMetadata');

// Global variables
let currentUser = null;
let currentNote = null;
let encryptionKey = null;

// Event listeners
document.getElementById('createNoteBtn').addEventListener('click', createNote);
document.getElementById('saveNoteBtn').addEventListener('click', saveNote);
document.getElementById('deleteNoteBtn').addEventListener('click', deleteNote);
document.getElementById('exportNoteBtn').addEventListener('click', exportNote);
document.getElementById('shareNoteBtn').addEventListener('click', shareNote);
document.getElementById('syncNoteBtn').addEventListener('click', syncNote);
document.getElementById('textToSpeechBtn').addEventListener('click', readNoteAloud);
document.getElementById('settingsBtn').addEventListener('click', openSettings);
document.getElementById('logoutBtn').addEventListener('click', logout);
document.getElementById('loginBtn').addEventListener('click', login);
document.getElementById('signupBtn').addEventListener('click', signup);
document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);
document.getElementById('deleteAccountBtn').addEventListener('click', deleteAccount);

// Authentication functions
function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    auth.signInWithEmailAndPassword(username, password)
        .then((userCredential) => {
            currentUser = userCredential.user;
            loginModal.style.display = 'none';
            loadNotes();
        })
        .catch((error) => {
            console.error('Login error:', error);
            alert('Login failed. Please check your credentials.');
        });
}

firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        loadNotes();
    } else {
        currentUser = null;
        showLoginModal();
    }
});

function showLoginModal() {
    // Display your login modal here
    loginModal.style.display = 'block';
}


function signup() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    auth.createUserWithEmailAndPassword(username, password)
        .then((userCredential) => {
            currentUser = userCredential.user;
            loginModal.style.display = 'none';
            setupEncryption();
        })
        .catch((error) => {
            console.error('Signup error:', error);
            alert('Signup failed. Please try again.');
        });
}

function logout() {
    auth.signOut()
        .then(() => {
            currentUser = null;
            loginModal.style.display = 'block';
            clearNoteDisplay();
        })
        .catch((error) => {
            console.error('Logout error:', error);
        });
}

// Note management functions
function createNote() {
    currentNote = {
        id: Date.now().toString(),
        title: '',
        body: '',
        createdAt: new Date(),
        updatedAt: new Date(),
        author: currentUser.email,
        shared: false
    };
    displayNote(currentNote);
}

function saveNote() {
    if (!currentUser || !currentNote) return;

    const noteData = {
        title: noteTitle.value,
        body: noteBody.value,
        updatedAt: firebase.firestore.Timestamp.now(),
        author: currentUser.email,
        shared: currentNote.shared || false
    };

    db.collection('notes').doc(currentNote.id).set(noteData)
        .then(() => {
            console.log('Note saved successfully');
            loadNotes();
        })
        .catch((error) => {
            console.error('Error saving note:', error);
        });
}


function deleteNote() {
    if (!currentNote) return;

    db.collection('notes').doc(currentNote.id).delete()
        .then(() => {
            alert('Note deleted successfully');
            currentNote = null;
            clearNoteDisplay();
            loadNotes();
        })
        .catch((error) => {
            console.error('Error deleting note:', error);
            alert('Failed to delete note');
        });
}

function loadNotes() {
    if (!currentUser) return;

    db.collection('notes').where('author', '==', currentUser.email).get()
        .then((querySnapshot) => {
            noteList.innerHTML = '';
            querySnapshot.forEach((doc) => {
                const note = doc.data();
                const noteElement = document.createElement('div');
                noteElement.textContent = note.title || 'Untitled';
                noteElement.addEventListener('click', () => displayNote(note));
                noteList.appendChild(noteElement);
            });
        })
        .catch((error) => {
            console.error('Error loading notes:', error);
        });
}


function displayNote(note) {
    currentNote = note;
    noteTitle.value = note.title;
    noteBody.value = note.body;
    noteMetadata.textContent = `Created: ${note.createdAt.toLocaleString()} | Updated: ${note.updatedAt.toLocaleString()} | Author: ${note.author}`;
    document.getElementById('syncNoteBtn').style.display = note.shared ? 'inline-block' : 'none';
}

function clearNoteDisplay() {
    noteTitle.value = '';
    noteBody.value = '';
    noteMetadata.textContent = '';
    document.getElementById('syncNoteBtn').style.display = 'none';
}

// Advanced features
function exportNote() {
    if (!currentNote) return;

    const noteContent = `# ${currentNote.title}\n\n${currentNote.body}`;
    const blob = new Blob([noteContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentNote.title || 'Untitled'}.md`;
    a.click();
    URL.revokeObjectURL(url);
}

function shareNote() {
    if (!currentNote) return;

    const shareCode = Math.random().toString(36).substring(2, 8);
    currentNote.shared = true;
    currentNote.shareCode = shareCode;

    saveNote();
    alert(`Share this code with others: ${shareCode}`);
}

function syncNote() {
    if (!currentNote || !currentNote.shared) return;

    // Implement sync logic here
    alert('Sync feature not implemented in this example');
}

function readNoteAloud() {
    if (!currentNote) return;

    const speech = new SpeechSynthesisUtterance(currentNote.body);
    window.speechSynthesis.speak(speech);
}

// Settings and account management
function openSettings() {
    settingsModal.style.display = 'block';
}

function saveSettings() {
    const bgColor = document.getElementById('bgColor').value;
    const fontColor = document.getElementById('fontColor').value;
    const fontStyle = document.getElementById('fontStyle').value;
    const textToSpeech = document.getElementById('textToSpeech').checked;

    document.body.style.backgroundColor = bgColor;
    document.body.style.color = fontColor;
    document.body.style.fontFamily = fontStyle;
    document.getElementById('textToSpeechBtn').style.display = textToSpeech ? 'inline-block' : 'none';

    // Save settings to user's profile in Firebase
    db.collection('users').doc(currentUser.uid).set({
        settings: { bgColor, fontColor, fontStyle, textToSpeech }
    }, { merge: true })
        .then(() => {
            alert('Settings saved successfully');
            settingsModal.style.display = 'none';
        })
        .catch((error) => {
            console.error('Error saving settings:', error);
            alert('Failed to save settings');
        });
}

function deleteAccount() {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) return;

    // Delete user's notes
    db.collection('notes').where('author', '==', currentUser.email).get()
        .then((querySnapshot) => {
            const batch = db.batch();
            querySnapshot.forEach((doc) => {
                batch.delete(doc.ref);
            });
            return batch.commit();
        })
        .then(() => {
            // Delete user's account
            return currentUser.delete();
        })
        .then(() => {
            alert('Account deleted successfully');
            logout();
        })
        .catch((error) => {
            console.error('Error deleting account:', error);
            alert('Failed to delete account');
        });
}

// Encryption functions
function setupEncryption() {
    encryptionKey = prompt('Enter a key for encrypting your notes. Keep this safe!');
    if (!encryptionKey) {
        alert('Encryption not set up. Your notes will not be encrypted.');
    }
}

function encryptData(data) {
    if (!encryptionKey) return data;
    // Implement encryption logic here (e.g., using Web Crypto API)
    return data; // Placeholder
}

function decryptData(data) {
    if (!encryptionKey) return data;
    // Implement decryption logic here
    return data; // Placeholder
}

// Initialize app
auth.onAuthStateChange

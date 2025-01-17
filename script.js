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
document.getElementById('closeSettingsBtn').addEventListener('click', function () {
    document.getElementById('settingsModal').style.display = 'none';
});
// Add these global variables at the top with your other variables
let selectedNotes = new Set();
let isReadingAloud = false;

// Add these new event listeners with your other event listeners
document.getElementById('deleteSelectedBtn').addEventListener('click', deleteSelectedNotes);
document.getElementById('deleteAllBtn').addEventListener('click', deleteAllNotes);
document.getElementById('readSelectedBtn').addEventListener('click', readSelectedNotes);
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
    const now = firebase.firestore.Timestamp.now();
    currentNote = {
        id: Date.now().toString(),
        title: '',
        body: '',
        createdAt: now,
        updatedAt: now,
        author: currentUser.email,
        shared: false
    };
    displayNote(currentNote);
}

function saveNote() {
    if (!currentUser || !currentNote) {
        alert('Please create a note first');
        return;
    }

    // Create note data with proper timestamp handling
    const noteData = {
        id: currentNote.id,
        title: noteTitle.value || 'Untitled',
        body: noteBody.value || '',
        createdAt: currentNote.createdAt || firebase.firestore.Timestamp.now(),
        updatedAt: firebase.firestore.Timestamp.now(),
        author: currentUser.email,
        shared: currentNote.shared || false,
        encrypted: encryptionKey ? true : false,
        content: encryptionKey ? encryptData(noteBody.value) : noteBody.value
    };

    // Save to Firestore with proper error handling
    db.collection('notes')
        .doc(noteData.id)
        .set(noteData)
        .then(() => {
            currentNote = noteData;
            alert('Note saved successfully!');
            loadNotes(); // Refresh the note list
        })
        .catch((error) => {
            console.error('Error saving note:', error);
            alert('Failed to save note. Please try again.');
        });
}
function deleteNote() {
    if (!currentNote || !currentNote.id) {
        alert('No note selected to delete');
        return;
    }

    if (!confirm('Are you sure you want to delete this note? This action cannot be undone.')) {
        return;
    }

    db.collection('notes')
        .doc(currentNote.id)
        .delete()
        .then(() => {
            alert('Note deleted successfully');
            currentNote = null;
            clearNoteDisplay();
            loadNotes(); // Refresh the note list
        })
        .catch((error) => {
            console.error('Error deleting note:', error);
            alert('Failed to delete note. Please try again.');
        });
}

function loadNotes() {
    if (!currentUser) return;

    db.collection('notes')
        .where('author', '==', currentUser.email)
        .orderBy('updatedAt', 'desc')
        .get()
        .then((querySnapshot) => {
            noteList.innerHTML = '';
            const bulkActions = document.querySelector('.bulk-actions');

            // First add the bulk actions section
            if (querySnapshot.size > 0) {
                bulkActions.classList.add('visible');
            } else {
                bulkActions.classList.remove('visible');
            }

            querySnapshot.forEach((doc) => {
                const note = doc.data();
                const noteElement = document.createElement('div');
                noteElement.className = 'note-item';
                noteElement.dataset.id = note.id;

                // Add checkbox
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'note-checkbox';
                checkbox.addEventListener('change', (e) => {
                    e.stopPropagation();
                    handleNoteSelection(note.id, e.target.checked);
                });
                checkbox.checked = selectedNotes.has(note.id);

                // Add note title
                const titleSpan = document.createElement('span');
                titleSpan.textContent = note.title || 'Untitled';

                noteElement.appendChild(checkbox);
                noteElement.appendChild(titleSpan);

                // Click handler for the whole note item
                noteElement.addEventListener('click', (e) => {
                    if (e.target !== checkbox) {
                        displayNote(note);
                    }
                });

                noteList.appendChild(noteElement);
            });
            updateSelectedCount();
        })
        .catch((error) => {
            console.error('Error loading notes:', error);
        });
}

// Add these new functions for handling selections
function handleNoteSelection(noteId, isSelected) {
    if (isSelected) {
        selectedNotes.add(noteId);
    } else {
        selectedNotes.delete(noteId);
    }
    updateSelectedCount();
    highlightSelectedNotes();
}

function updateSelectedCount() {
    const count = selectedNotes.size;
    const selectedCount = document.getElementById('selectedCount');
    selectedCount.textContent = count ? `${count} note(s) selected` : '';
}

function highlightSelectedNotes() {
    document.querySelectorAll('.note-item').forEach(noteItem => {
        const isSelected = selectedNotes.has(noteItem.dataset.id);
        noteItem.classList.toggle('selected', isSelected);
    });
}

// Add these new deletion functions
function deleteSelectedNotes() {
    if (selectedNotes.size === 0) {
        alert('Please select notes to delete');
        return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedNotes.size} selected note(s)?`)) {
        return;
    }

    const batch = db.batch();
    selectedNotes.forEach(noteId => {
        const noteRef = db.collection('notes').doc(noteId);
        batch.delete(noteRef);
    });

    batch.commit()
        .then(() => {
            alert('Selected notes deleted successfully');
            selectedNotes.clear();
            clearNoteDisplay();
            loadNotes();
        })
        .catch((error) => {
            console.error('Error deleting notes:', error);
            alert('Failed to delete selected notes');
        });
}

function deleteAllNotes() {
    if (!confirm('Are you sure you want to delete ALL notes? This action cannot be undone!')) {
        return;
    }

    db.collection('notes')
        .where('author', '==', currentUser.email)
        .get()
        .then((querySnapshot) => {
            const batch = db.batch();
            querySnapshot.forEach((doc) => {
                batch.delete(doc.ref);
            });
            return batch.commit();
        })
        .then(() => {
            alert('All notes deleted successfully');
            selectedNotes.clear();
            clearNoteDisplay();
            loadNotes();
        })
        .catch((error) => {
            console.error('Error deleting all notes:', error);
            alert('Failed to delete all notes');
        });
}

// Update the read aloud functionality to handle multiple notes
function readSelectedNotes() {
    if (selectedNotes.size === 0) {
        alert('Please select notes to read');
        return;
    }

    if (!window.speechSynthesis) {
        alert('Text-to-speech is not supported in your browser');
        return;
    }

    // Cancel any ongoing speech
    stopReading();

    // Get all selected notes
    const notesToRead = [];
    db.collection('notes')
        .where('author', '==', currentUser.email)
        .get()
        .then((querySnapshot) => {
            querySnapshot.forEach((doc) => {
                if (selectedNotes.has(doc.id)) {
                    notesToRead.push(doc.data());
                }
            });
            startReading(notesToRead);
        });
}

function startReading(notes) {
    let currentIndex = 0;
    isReadingAloud = true;

    function readNext() {
        if (currentIndex < notes.length && isReadingAloud) {
            const note = notes[currentIndex];
            const speech = new SpeechSynthesisUtterance(
                `Note ${currentIndex + 1} of ${notes.length}. Title: ${note.title || 'Untitled'}. Content: ${note.body || 'Empty note'}`
            );

            speech.onend = () => {
                currentIndex++;
                readNext();
            };

            window.speechSynthesis.speak(speech);
        }
    }

    // Add speech controls
    const controls = document.createElement('div');
    controls.id = 'speech-controls';
    controls.innerHTML = `
        <div style="position: fixed; bottom: 20px; right: 20px; background: white; 
                    padding: 10px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.3);">
            <button onclick="pauseReading()">Pause</button>
            <button onclick="resumeReading()">Resume</button>
            <button onclick="stopReading()">Stop</button>
            <div>Reading note ${currentIndex + 1} of ${notes.length}</div>
        </div>
    `;

    // Remove existing controls if any
    const existingControls = document.getElementById('speech-controls');
    if (existingControls) {
        document.body.removeChild(existingControls);
    }

    document.body.appendChild(controls);
    readNext();
}

function pauseReading() {
    window.speechSynthesis.pause();
}

function resumeReading() {
    window.speechSynthesis.resume();
}

function stopReading() {
    isReadingAloud = false;
    window.speechSynthesis.cancel();
    const controls = document.getElementById('speech-controls');
    if (controls) {
        document.body.removeChild(controls);
    }
}

function displayNote(note) {
    if (!note) return;

    currentNote = note;
    noteTitle.value = note.title || '';
    noteBody.value = note.body || '';

    const createdDate = note.createdAt ? note.createdAt.toDate().toLocaleString() : 'Unknown';
    const updatedDate = note.updatedAt ? note.updatedAt.toDate().toLocaleString() : 'Unknown';

    noteMetadata.textContent = `Created: ${createdDate} | Updated: ${updatedDate} | Author: ${note.author}`;
    document.getElementById('syncNoteBtn').style.display = note.shared ? 'inline-block' : 'none';
}

function clearNoteDisplay() {
    noteTitle.value = '';
    noteBody.value = '';
    noteMetadata.textContent = '';
    document.getElementById('syncNoteBtn').style.display = 'none';
}

// Rest of the functions remain the same...
function clearNoteDisplay() {
    noteTitle.value = '';
    noteBody.value = '';
    noteMetadata.textContent = '';
    document.getElementById('syncNoteBtn').style.display = 'none';
    showLogo();
}
// Advanced features
function exportNote() {
    if (!currentNote) {
        alert('Please select a note to export');
        return;
    }

    const title = noteTitle.value || 'Untitled';
    const body = noteBody.value || '';
    const metadata = `Created: ${currentNote.createdAt.toDate().toLocaleString()}\nAuthor: ${currentNote.author}\n\n`;

    // Create export options
    const exportOptions = document.createElement('div');
    exportOptions.innerHTML = `
        <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                    background: white; padding: 20px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.3);">
            <h3>Export Format</h3>
            <button onclick="exportAs('markdown')">Markdown</button>
            <button onclick="exportAs('pdf')">PDF</button>
            <button onclick="exportAs('txt')">Text</button>
            <button onclick="document.body.removeChild(this.parentElement.parentElement)">Cancel</button>
        </div>
    `;
    document.body.appendChild(exportOptions);

    // Export function
    window.exportAs = function (format) {
        let content = '';
        let fileName = '';
        let fileType = '';

        switch (format) {
            case 'markdown':
                content = `# ${title}\n\n${metadata}${body}`;
                fileName = `${title}.md`;
                fileType = 'text/markdown';
                break;
            case 'txt':
                content = `${title}\n\n${metadata}${body}`;
                fileName = `${title}.txt`;
                fileType = 'text/plain';
                break;
            case 'pdf':
                // For PDF, we'll use html2pdf library
                const element = document.createElement('div');
                element.innerHTML = `<h1>${title}</h1><small>${metadata}</small><p>${body}</p>`;
                html2pdf().from(element).save(`${title}.pdf`);
                document.body.removeChild(exportOptions);
                return;
        }

        // Create and trigger download
        const blob = new Blob([content], { type: fileType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        document.body.removeChild(exportOptions);
    };
}

// Modify the shareNote function (around line 208):
function shareNote() {
    if (!currentNote) return;

    const shareCode = Math.random().toString(36).substring(2, 8);

    db.collection('notes').doc(currentNote.id).update({
        shared: true,
        shareCode: shareCode,
        sharedAt: firebase.firestore.Timestamp.now()
    })
        .then(() => {
            currentNote.shared = true;
            currentNote.shareCode = shareCode;
            document.getElementById('syncNoteBtn').style.display = 'inline-block';
            alert(`Share this code with others: ${shareCode}\nThey can access this note using the code.`);
        })
        .catch((error) => {
            console.error('Error sharing note:', error);
            alert('Failed to share note');
        });
}

// Enhance the syncNote function (around line 219):
function syncNote() {
    if (!currentNote || !currentNote.shared) return;

    db.collection('notes').doc(currentNote.id).get()
        .then((doc) => {
            if (doc.exists) {
                const updatedNote = { id: doc.id, ...doc.data() };
                displayNote(updatedNote);
                alert('Note synced successfully!');
            }
        })
        .catch((error) => {
            console.error('Error syncing note:', error);
            alert('Failed to sync note');
        });
}


function readNoteAloud() {
    if (!currentNote) {
        alert('Please select a note to read');
        return;
    }

    // Check if speech synthesis is supported
    if (!window.speechSynthesis) {
        alert('Text-to-speech is not supported in your browser');
        return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    // Create speech content
    const title = noteTitle.value || 'Untitled';
    const body = noteBody.value || '';
    const content = `${title}. ${body}`;

    // Create and configure speech utterance
    const speech = new SpeechSynthesisUtterance(content);
    speech.rate = 1.0;
    speech.pitch = 1.0;
    speech.volume = 1.0;

    // Add speech controls
    const controls = document.createElement('div');
    controls.id = 'speech-controls';
    controls.innerHTML = `
        <div style="position: fixed; bottom: 20px; right: 20px; background: white; 
                    padding: 10px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.3);">
            <button onclick="window.speechSynthesis.pause()">Pause</button>
            <button onclick="window.speechSynthesis.resume()">Resume</button>
            <button onclick="window.speechSynthesis.cancel(); document.body.removeChild(this.parentElement.parentElement)">Stop</button>
        </div>
    `;

    // Remove existing controls if any
    const existingControls = document.getElementById('speech-controls');
    if (existingControls) {
        document.body.removeChild(existingControls);
    }

    // Add new controls
    document.body.appendChild(controls);

    // Start speaking
    window.speechSynthesis.speak(speech);

    // Clean up when done
    speech.onend = function () {
        const controls = document.getElementById('speech-controls');
        if (controls) {
            document.body.removeChild(controls);
        }
    };
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
    return btoa(unescape(encodeURIComponent(data)) + encryptionKey);
}

function decryptData(data) {
    if (!encryptionKey) return data;
    return decodeURIComponent(escape(atob(data.replace(encryptionKey, ''))));
}
// Add these new functions:
function closeSettings() {
    settingsModal.style.display = 'none';
}


// Modify the closeCurrentNote function to handle both panels
function closeCurrentNote(isSecond = false) {
    if (isSecond) {
        secondCurrentNote = null;
        document.getElementById('secondNoteTitle').value = '';
        document.getElementById('secondNoteBody').value = '';
        document.getElementById('secondNoteMetadata').textContent = '';
        document.getElementById('secondSyncNoteBtn').style.display = 'none';
    } else {
        currentNote = null;
        document.getElementById('noteTitle').value = '';
        document.getElementById('noteBody').value = '';
        document.getElementById('noteMetadata').textContent = '';
        document.getElementById('syncNoteBtn').style.display = 'none';
    }

    if (!currentNote && !secondCurrentNote) {
        showLogo();
    }
}

function showLogo() {
    document.getElementById('appLogo').style.display = 'block';
    document.getElementById('noteEditor').style.display = 'none';
    document.getElementById('noteActions').style.display = 'none';
}

function hideLogo() {
    document.getElementById('appLogo').style.display = 'none';
    document.getElementById('noteEditor').style.display = 'flex';
    document.getElementById('noteActions').style.display = 'block';
}

// Initialize app
// Add this function to initialize the app state:
function initializeApp() {
    showLogo();
    if (currentUser) {
        loadNotes();
    } else {
        showLoginModal();
    }
}

document.addEventListener('DOMContentLoaded', initializeApp);
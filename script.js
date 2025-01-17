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
// Add these global variables at the top with your other variables
let selectedNotes = new Set();
let isReadingAloud = false;

// Add these new event listeners with your other event listeners
document.getElementById('deleteSelectedBtn').addEventListener('click', deleteSelectedNotes);
document.getElementById('deleteAllBtn').addEventListener('click', deleteAllNotes);
document.getElementById('readSelectedBtn').addEventListener('click', readSelectedNotes);
// Authentication functions
async function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const encryptionKeyInput = document.getElementById('encryptionKey').value;

    try {
        // First, authenticate with Firebase
        const userCredential = await auth.signInWithEmailAndPassword(username, password);
        currentUser = userCredential.user;

        // Get user's encryption data from Firestore
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        const userData = userDoc.data();

        if (userData && userData.encryptionSalt) {
            if (!encryptionKeyInput) {
                await logout();
                alert('Encryption key is required to access your notes');
                return;
            }

            // Derive the key using the stored salt
            encryptionKey = encryptionUtils.deriveKey(encryptionKeyInput, userData.encryptionSalt);

            // Test the encryption key by trying to decrypt a test value
            if (userData.testEncrypted) {
                try {
                    encryptionUtils.decrypt(userData.testEncrypted, encryptionKey);
                } catch (error) {
                    await logout();
                    alert('Invalid encryption key');
                    return;
                }
            }
        }

        loginModal.style.display = 'none';
        loadNotes();
    } catch (error) {
        console.error('Login error:', error);
        if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
            alert('Invalid email or password');
        } else {
            alert('Login failed. Please check your credentials.');
        }
    }
}

function showLoginModal() {
    // Clear previous values
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    document.getElementById('encryptionKey').value = '';

    // Show the modal
    loginModal.style.display = 'block';
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

async function signup() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const userCredential = await auth.createUserWithEmailAndPassword(username, password);
        currentUser = userCredential.user;

        // Set up encryption
        encryptionKey = await setupEncryption();

        loginModal.style.display = 'none';
        loadNotes();
    } catch (error) {
        console.error('Signup error:', error);
        alert('Signup failed. Please try again.');
    }
}

function logout() {
    encryptionKey = null; // Clear the encryption key
    auth.signOut()
        .then(() => {
            currentUser = null;
            showLoginModal();
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

async function saveNote() {
    if (!currentUser || !currentNote) {
        alert('Please create a note first');
        return;
    }

    try {
        const noteData = {
            id: currentNote.id,
            title: noteTitle.value || 'Untitled',
            createdAt: currentNote.createdAt || firebase.firestore.Timestamp.now(),
            updatedAt: firebase.firestore.Timestamp.now(),
            author: currentUser.email,
            shared: currentNote.shared || false
        };

        // Encrypt the note content if encryption is enabled
        if (encryptionKey) {
            noteData.encrypted = true;
            noteData.title = encryptionUtils.encrypt(noteData.title, encryptionKey);
            noteData.body = encryptionUtils.encrypt(noteBody.value || '', encryptionKey);
        } else {
            noteData.encrypted = false;
            noteData.body = noteBody.value || '';
        }

        await db.collection('notes').doc(noteData.id).set(noteData);
        currentNote = noteData;
        alert('Note saved successfully!');
        loadNotes();
    } catch (error) {
        console.error('Error saving note:', error);
        alert('Failed to save note. Please try again.');
    }
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
    try {
        if (note.encrypted && encryptionKey) {
            // Decrypt the note content
            noteTitle.value = encryptionUtils.decrypt(note.title, encryptionKey);
            noteBody.value = encryptionUtils.decrypt(note.body, encryptionKey);
        } else {
            noteTitle.value = note.title || '';
            noteBody.value = note.body || '';
        }

        const createdDate = note.createdAt ? note.createdAt.toDate().toLocaleString() : 'Unknown';
        const updatedDate = note.updatedAt ? note.updatedAt.toDate().toLocaleString() : 'Unknown';

        noteMetadata.textContent = `Created: ${createdDate} | Updated: ${updatedDate} | Author: ${note.author} ${note.encrypted ? '| 🔒 Encrypted' : ''}`;
        document.getElementById('syncNoteBtn').style.display = note.shared ? 'inline-block' : 'none';
    } catch (error) {
        console.error('Error displaying note:', error);
        alert('Failed to decrypt note. Please check your encryption key.');
        clearNoteDisplay();
    }
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
    // Implement encryption logic here (e.g., using Web Crypto API)
    return data; // Placeholder
}

function decryptData(data) {
    if (!encryptionKey) return data;
    // Implement decryption logic here
    return data; // Placeholder
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
// Encryption utilities
const encryptionUtils = {
    generateSalt: () => {
        return CryptoJS.lib.WordArray.random(128 / 8).toString();
    },

    deriveKey: (password, salt) => {
        return CryptoJS.PBKDF2(password, salt, {
            keySize: 256 / 32,
            iterations: 1000
        }).toString();
    },

    encrypt: (data, key) => {
        try {
            const encrypted = CryptoJS.AES.encrypt(JSON.stringify(data), key);
            return encrypted.toString();
        } catch (error) {
            console.error('Encryption error:', error);
            throw new Error('Failed to encrypt data');
        }
    },

    decrypt: (encryptedData, key) => {
        try {
            const decrypted = CryptoJS.AES.decrypt(encryptedData, key);
            return JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));
        } catch (error) {
            console.error('Decryption error:', error);
            throw new Error('Failed to decrypt data');
        }
    }
};

// Modified encryption setup function
function setupEncryption() {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        `;

        const content = document.createElement('div');
        content.style.cssText = `
            background: white;
            padding: 20px;
            border-radius: 8px;
            max-width: 400px;
            width: 90%;
        `;

        content.innerHTML = `
            <h3>Set Up Encryption</h3>
            <p>Enter an encryption key for your notes. This key will be required to read your notes. 
               Please store it safely - if you lose it, you won't be able to recover your notes!</p>
            <input type="password" id="encryptionKey" placeholder="Enter encryption key" style="width: 100%; margin: 10px 0;">
            <input type="password" id="confirmEncryptionKey" placeholder="Confirm encryption key" style="width: 100%; margin: 10px 0;">
            <div style="display: flex; justify-content: space-between; margin-top: 15px;">
                <button id="cancelEncryption">Skip Encryption</button>
                <button id="confirmEncryptionSetup">Set Encryption Key</button>
            </div>
        `;

        modal.appendChild(content);
        document.body.appendChild(modal);

        document.getElementById('cancelEncryption').onclick = () => {
            document.body.removeChild(modal);
            resolve(null);
        };

        document.getElementById('confirmEncryptionSetup').onclick = () => {
            // Inside the confirmEncryptionSetup onclick handler, after generating the salt:
            const testValue = "test";
            const encryptedTest = encryptionUtils.encrypt(testValue, derivedKey);

            // Store both the salt and the test value
            db.collection('users').doc(currentUser.uid).set({
                encryptionSalt: salt,
                testEncrypted: encryptedTest
            }, { merge: true });

            const key = document.getElementById('encryptionKey').value;
            const confirmKey = document.getElementById('confirmEncryptionKey').value;

            if (!key) {
                alert('Please enter an encryption key');
                return;
            }

            if (key !== confirmKey) {
                alert('Encryption keys do not match');
                return;
            }

            if (key.length < 8) {
                alert('Encryption key must be at least 8 characters long');
                return;
            }

            document.body.removeChild(modal);

            // Generate a salt and derive the final encryption key
            const salt = encryptionUtils.generateSalt();
            const derivedKey = encryptionUtils.deriveKey(key, salt);

            // Store the salt in the user's profile
            db.collection('users').doc(currentUser.uid).set({
                encryptionSalt: salt
            }, { merge: true });

            resolve(derivedKey);
        };
    });
}
document.addEventListener('DOMContentLoaded', initializeApp);
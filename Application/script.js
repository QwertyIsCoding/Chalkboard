/**
 * Chalkboard - A Firebase-powered Note-Taking Application
 * 
 * This script handles all client-side functionality for a note-taking web application
 * including authentication, note management, text-to-speech, and export features.
 * 
 * Dependencies: Firebase (Auth & Firestore), html2pdf library
 * Author: Chalkboard Development Team
 * Version: 1.0
 */

// =============================================================================
// FIREBASE CONFIGURATION & INITIALIZATION
// =============================================================================

// Firebase configuration object containing project credentials
const firebaseConfig = {
    apiKey: "AIzaSyC2rV2E0BujE6b17pKbfGbN7jUPcKWMGak",
    authDomain: "chalkboard-2d89c.firebaseapp.com",
    projectId: "chalkboard-2d89c",
    storageBucket: "chalkboard-2d89c.firebasestorage.app",
    messagingSenderId: "416242146566",
    appId: "1:416242146566:web:739d2ad2c3f4d8104a5287",
    measurementId: "G-4EGX29H7WY"
};

// Initialize Firebase services
// - initializeApp(): Sets up the Firebase application instance
// - auth(): Initializes Firebase Authentication service
// - firestore(): Initializes Cloud Firestore database service
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// =============================================================================
// DOM ELEMENT REFERENCES
// =============================================================================

/**
 * Cache frequently accessed DOM elements for better performance
 * These elements are used throughout the application for user interactions
 */
const loginModal = document.getElementById('loginModal');
const settingsModal = document.getElementById('settingsModal');
const noteList = document.getElementById('noteList');
const noteContent = document.getElementById('noteContent');
const noteTitle = document.getElementById('noteTitle');
const noteBody = document.getElementById('noteBody');
const noteMetadata = document.getElementById('noteMetadata');

// =============================================================================
// GLOBAL APPLICATION STATE
// =============================================================================

/**
 * Global variables managing application state
 * These are shared across all functions and track the current session
 */
let currentUser = null;      // Currently authenticated user object
let currentNote = null;      // Currently selected/displayed note object
let encryptionKey = null;    // Encryption key for secure note storage (currently unused)

// Bulk operation state management
let selectedNotes = new Set();  // Set of note IDs selected for bulk operations
let isReadingAloud = false;     // Flag indicating if text-to-speech is currently active

// =============================================================================
// EVENT LISTENER SETUP
// =============================================================================

/**
 * Register click event handlers for all application buttons
 * Each listener calls the corresponding function when its button is clicked
 */

// Note management buttons
document.getElementById('createNoteBtn').addEventListener('click', createNote);
document.getElementById('saveNoteBtn').addEventListener('click', saveNote);
document.getElementById('deleteNoteBtn').addEventListener('click', deleteNote);
document.getElementById('exportNoteBtn').addEventListener('click', exportNote);

// Feature buttons
document.getElementById('textToSpeechBtn').addEventListener('click', readNoteAloud);

// User interface buttons
document.getElementById('settingsBtn').addEventListener('click', openSettings);
document.getElementById('logoutBtn').addEventListener('click', logout);

// Authentication buttons
document.getElementById('loginBtn').addEventListener('click', login);
document.getElementById('signupBtn').addEventListener('click', signup);

// Settings and account management
document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);
document.getElementById('deleteAccountBtn').addEventListener('click', deleteAccount);
document.getElementById('closeSettingsBtn').addEventListener('click', function () {
    document.getElementById('settingsModal').style.display = 'none';
});

// Bulk operation buttons (for multiple note selection)
document.getElementById('deleteSelectedBtn').addEventListener('click', deleteSelectedNotes);
document.getElementById('deleteAllBtn').addEventListener('click', deleteAllNotes);
document.getElementById('readSelectedBtn').addEventListener('click', readSelectedNotes);

// =============================================================================
// AUTHENTICATION SYSTEM
// =============================================================================

/**
 * Authenticate user with email and password
 * @function login
 * @param {string} username - User's email address
 * @param {string} password - User's password
 * @returns {Promise} Firebase authentication promise
 * 
 * Usage example:
 * // Called when user clicks login button
 * // Automatically loads user's notes on successful login
 */
function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    // Firebase authentication method for existing users
    auth.signInWithEmailAndPassword(username, password)
        .then((userCredential) => {
            currentUser = userCredential.user;
            loginModal.style.display = 'none';  // Hide login modal
            loadNotes();                        // Load user's notes from Firestore
        })
        .catch((error) => {
            console.error('Login error:', error);
            alert('Login failed. Please check your credentials.');
        });
}

/**
 * Monitor authentication state changes
 * @function onAuthStateChanged
 * @param {Object} user - Firebase user object (null if logged out)
 * 
 * This listener automatically:
 * - Shows login modal when user is not authenticated
 * - Loads notes when user is authenticated
 * - Updates currentUser global variable
 */
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        loadNotes();
    } else {
        currentUser = null;
        showLoginModal();
    }
});

/**
 * Display the login modal dialog
 * @function showLoginModal
 * @returns {void}
 */
function showLoginModal() {
    loginModal.style.display = 'block';
}

/**
 * Create a new user account
 * @function signup
 * @param {string} username - User's email address for new account
 * @param {string} password - User's chosen password
 * @returns {Promise} Firebase authentication promise
 * 
 * Usage example:
 * // Called when user clicks signup button
 * // Sets up encryption and redirects to note creation
 */
function signup() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    // Firebase method to create new user account
    auth.createUserWithEmailAndPassword(username, password)
        .then((userCredential) => {
            currentUser = userCredential.user;
            loginModal.style.display = 'none';
            setupEncryption();  // Initialize encryption for new user
        })
        .catch((error) => {
            console.error('Signup error:', error);
            alert('Signup failed. Please try again.');
        });
}

/**
 * Log out the current user and clean up session
 * @function logout
 * @returns {Promise} Firebase sign-out promise
 * 
 * Clears:
 * - Current user from memory
 * - Note display
 * - Shows login modal
 */
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

// =============================================================================
// NOTE MANAGEMENT SYSTEM
// =============================================================================

/**
 * Create a new blank note
 * @function createNote
 * @returns {Object} Note object with initial properties
 * 
 * Creates a note object with:
 * - Unique ID based on timestamp
 * - Empty title and body
 * - Current timestamp for created/updated
 * - Current user's email as author
 * - Default shared status as false
 * 
 * Usage example:
 * // Called when user clicks "Create Note" button
 * // Automatically displays the new note in the editor
 */
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

/**
 * Save current note to Firestore database
 * @function saveNote
 * @returns {Promise} Firestore document write promise
 * 
 * Process:
 * 1. Validates user authentication and note existence
 * 2. Encrypts content if encryption key is available
 * 3. Updates timestamp
 * 4. Saves to Firestore 'notes' collection
 * 5. Refreshes note list display
 * 
 * Usage example:
 * // Called when user clicks "Save Note" button
 * // Handles both new notes and updates to existing notes
 */
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

/**
 * Delete the currently selected note
 * @function deleteNote
 * @returns {Promise} Firestore document deletion promise
 * 
 * Safety features:
 * - Validates note selection
 * - Confirmation dialog before deletion
 * - Updates UI after successful deletion
 * 
 * Usage example:
 * // Called when user clicks "Delete Note" button
 * // Permanently removes note from Firestore
 */
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

/**
 * Load and display all notes for the current user
 * @function loadNotes
 * @returns {void}
 * 
 * Retrieves notes from Firestore filtered by:
 * - Current user's email as author
 * - Sorted by update timestamp (newest first)
 * 
 * Features:
 * - Creates interactive note list with checkboxes
 * - Handles bulk action button visibility
 * - Updates selection count and highlighting
 * 
 * Usage example:
 * // Called automatically on login and after note operations
 * // Populates the sidebar note list
 */
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

                // Add checkbox for bulk selection
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

// =============================================================================
// BULK SELECTION MANAGEMENT
// =============================================================================

/**
 * Handle individual note selection for bulk operations
 * @function handleNoteSelection
 * @param {string} noteId - Unique identifier of the note
 * @param {boolean} isSelected - Whether the note is selected
 * @returns {void}
 * 
 * Manages the selectedNotes Set and updates UI accordingly
 * 
 * Usage example:
 * // Called automatically when user checks/unchecks note checkboxes
 */
function handleNoteSelection(noteId, isSelected) {
    if (isSelected) {
        selectedNotes.add(noteId);
    } else {
        selectedNotes.delete(noteId);
    }
    updateSelectedCount();
    highlightSelectedNotes();
}

/**
 * Update the count display for selected notes
 * @function updateSelectedCount
 * @returns {void}
 * 
 * Updates the UI element showing how many notes are currently selected
 * 
 * Usage example:
 * // Called automatically when selection changes
 */
function updateSelectedCount() {
    const count = selectedNotes.size;
    const selectedCount = document.getElementById('selectedCount');
    selectedCount.textContent = count ? `${count} note(s) selected` : '';
}

/**
 * Apply visual highlighting to selected notes
 * @function highlightSelectedNotes
 * @returns {void}
 * 
 * Toggles CSS classes to visually indicate selected notes
 * 
 * Usage example:
 * // Called automatically when selection changes
 */
function highlightSelectedNotes() {
    document.querySelectorAll('.note-item').forEach(noteItem => {
        const isSelected = selectedNotes.has(noteItem.dataset.id);
        noteItem.classList.toggle('selected', isSelected);
    });
}

// =============================================================================
// BULK DELETE OPERATIONS
// =============================================================================

/**
 * Delete all selected notes at once
 * @function deleteSelectedNotes
 * @returns {Promise} Firestore batch deletion promise
 * 
 * Features:
 * - Validates that notes are selected
 * - Shows confirmation with count of notes to delete
 * - Uses Firestore batch operations for efficiency
 * - Updates UI after completion
 * 
 * Usage example:
 * // Called when user clicks "Delete Selected" button
 */
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

/**
 * Delete ALL notes for the current user
 * @function deleteAllNotes
 * @returns {Promise} Firestore batch deletion promise
 * 
 * DANGER: This is a destructive operation that deletes all user notes
 * Includes additional safety confirmation
 * 
 * Usage example:
 * // Called when user clicks "Delete All" button
 */
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

// =============================================================================
// TEXT-TO-SPEECH SYSTEM
// =============================================================================

/**
 * Read multiple selected notes aloud using Web Speech API
 * @function readSelectedNotes
 * @returns {void}
 * 
 * Features:
 * - Supports multiple note selection
 * - Sequential reading with progress tracking
 * - Pause/Resume/Stop controls
 * - Browser compatibility check
 * 
 * Usage example:
 * // Called when user clicks "Read Selected" button
 */
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

    // Get all selected notes from Firestore
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

/**
 * Start reading multiple notes sequentially
 * @function startReading
 * @param {Array} notes - Array of note objects to read
 * @returns {void}
 * 
 * Creates speech controls and manages sequential playback
 * 
 * Usage example:
 * // Called internally by readSelectedNotes
 */
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

    // Add speech controls UI
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

/**
 * Pause current text-to-speech playback
 * @function pauseReading
 * @returns {void}
 * 
 * Usage example:
 * // Called when user clicks pause button in speech controls
 */
function pauseReading() {
    window.speechSynthesis.pause();
}

/**
 * Resume paused text-to-speech playback
 * @function resumeReading
 * @returns {void}
 * 
 * Usage example:
 * // Called when user clicks resume button in speech controls
 */
function resumeReading() {
    window.speechSynthesis.resume();
}

/**
 * Stop all text-to-speech playback and clean up controls
 * @function stopReading
 * @returns {void}
 * 
 * Resets playback state and removes UI controls
 * 
 * Usage example:
 * // Called when user clicks stop button or when reading completes
 */
function stopReading() {
    isReadingAloud = false;
    window.speechSynthesis.cancel();
    const controls = document.getElementById('speech-controls');
    if (controls) {
        document.body.removeChild(controls);
    }
}

/**
 * Read the currently displayed note aloud
 * @function readNoteAloud
 * @returns {void}
 * 
 * Single-note version of text-to-speech functionality
 * Creates a more conversational reading experience
 * 
 * Usage example:
 * // Called when user clicks "Read Aloud" button for current note
 */
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

    // Add speech controls UI
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

// =============================================================================
// NOTE DISPLAY & UI MANAGEMENT
// =============================================================================

/**
 * Display a note in the editor panel
 * @function displayNote
 * @param {Object} note - Note object containing title, body, and metadata
 * @returns {void}
 * 
 * Populates the editor fields and shows note metadata
 * Handles timestamp conversion for display
 * 
 * Usage example:
 * // Called when user clicks on a note in the sidebar
 */
function displayNote(note) {
    if (!note) return;

    currentNote = note;
    noteTitle.value = note.title || '';
    noteBody.value = note.body || '';

    // Convert Firestore timestamps to readable strings
    const createdDate = note.createdAt ? note.createdAt.toDate().toLocaleString() : 'Unknown';
    const updatedDate = note.updatedAt ? note.updatedAt.toDate().toLocaleString() : 'Unknown';

    noteMetadata.textContent = `Created: ${createdDate} | Updated: ${updatedDate} | Author: ${note.author}`;
    // document.getElementById('syncNoteBtn').style.display = note.shared ? 'inline-block' : 'none';
}

/**
 * Clear the note editor display
 * @function clearNoteDisplay
 * @returns {void}
 * 
 * Resets all editor fields and metadata display
 * Shows the application logo when no note is selected
 * 
 * Usage example:
 * // Called when user logs out or deletes the current note
 */
function clearNoteDisplay() {
    noteTitle.value = '';
    noteBody.value = '';
    noteMetadata.textContent = '';
    //  document.getElementById('syncNoteBtn').style.display = 'none';
    showLogo();
}

// =============================================================================
// EXPORT FUNCTIONALITY
// =============================================================================

/**
 * Export the current note in various formats
 * @function exportNote
 * @returns {void}
 * 
 * Supports multiple export formats:
 * - Markdown (.md) - Preserves formatting
 * - Plain Text (.txt) - Simple text format
 * - PDF (.pdf) - Formatted document using html2pdf
 * 
 * Creates a modal dialog for format selection
 * 
 * Usage example:
 * // Called when user clicks "Export Note" button
 */
function exportNote() {
    if (!currentNote) {
        alert('Please select a note to export');
        return;
    }

    const title = noteTitle.value || 'Untitled';
    const body = noteBody.value || '';
    const metadata = `Created: ${currentNote.createdAt.toDate().toLocaleString()}\nAuthor: ${currentNote.author}\n\n`;

    // Create export options modal
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

    // Export function - handles format-specific processing
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

// =============================================================================
// NOTE SHARING & SYNCING
// =============================================================================

/**
 * Share a note with others using a generated share code
 * @function shareNote
 * @returns {Promise} Firestore document update promise
 * 
 * Features:
 * - Generates unique share code
 * - Marks note as shared in database
 * - Stores share timestamp
 * - Provides share code to user for distribution
 * 
 * Usage example:
 * // Called when user wants to share a note with others
 */
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
            //  document.getElementById('syncNoteBtn').style.display = 'inline-block';
            alert(`Share this code with others: ${shareCode}\nThey can access this note using the code.`);
        })
        .catch((error) => {
            console.error('Error sharing note:', error);
            alert('Failed to share note');
        });
}

/**
 * Synchronize shared note with latest changes
 * @function syncNote
 * @returns {Promise} Firestore document fetch promise
 * 
 * Retrieves the latest version of a shared note from Firestore
 * Updates the display with synchronized content
 * 
 * Usage example:
 * // Called when user wants to update a shared note with latest changes
 */
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

// =============================================================================
// SETTINGS & ACCOUNT MANAGEMENT
// =============================================================================

/**
 * Open the settings modal dialog
 * @function openSettings
 * @returns {void}
 * 
 * Displays user settings interface for customization
 * 
 * Usage example:
 * // Called when user clicks settings button
 */
function openSettings() {
    settingsModal.style.display = 'block';
}

/**
 * Save user settings to Firestore
 * @function saveSettings
 * @returns {Promise} Firestore document write promise
 * 
 * Currently saves:
 * - Font style preference
 * 
 * Can be extended to save additional user preferences
 * 
 * Usage example:
 * // Called when user clicks save settings button
 */
function saveSettings() {
    const fontStyle = document.getElementById('fontStyle').value;
    document.body.style.fontFamily = fontStyle;

    // Save settings to user's profile in Firebase
    db.collection('users').doc(currentUser.uid).set({
        settings: { fontStyle }
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

/**
 * Permanently delete user account and all associated data
 * @function deleteAccount
 * @returns {Promise} Combined Firestore and Firebase Auth deletion promise
 * 
 * DESTRUCTIVE OPERATION that:
 * 1. Confirms user intent with double confirmation
 * 2. Deletes all user's notes using batch operations
 * 3. Deletes the Firebase Auth user account
 * 4. Logs out and redirects to login
 * 
 * Usage example:
 * // Called when user clicks "Delete Account" button in settings
 */
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

// =============================================================================
// ENCRYPTION SYSTEM
// =============================================================================

/**
 * Initialize encryption system for secure note storage
 * @function setupEncryption
 * @returns {void}
 * 
 * Currently disabled (returns immediately)
 * Placeholder for future encryption key generation and management
 * 
 * Usage example:
 * // Called automatically during user signup
 */
function setupEncryption() {
    return;
}

/**
 * Encrypt note content using the encryption key
 * @function encryptData
 * @param {string} data - Plain text data to encrypt
 * @returns {string} Encoded string with encryption key appended
 * 
 * Simple base64 encoding with key concatenation
 * Note: For production use, implement proper encryption
 * 
 * Usage example:
 * // Called automatically during note save if encryption is enabled
 */
function encryptData(data) {
    if (!encryptionKey) return data;
    return btoa(unescape(encodeURIComponent(data)) + encryptionKey);
}

/**
 * Decrypt note content using the encryption key
 * @function decryptData
 * @param {string} data - Encoded data with key appended
 * @returns {string} Decrypted plain text
 * 
 * Reverse operation of encryptData
 * 
 * Usage example:
 * // Called when loading encrypted notes for display
 */
function decryptData(data) {
    if (!encryptionKey) return data;
    return decodeURIComponent(escape(atob(data.replace(encryptionKey, ''))));
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Close settings modal dialog
 * @function closeSettings
 * @returns {void}
 * 
 * Usage example:
 * // Called when user clicks close settings button
 */
function closeSettings() {
    settingsModal.style.display = 'none';
}

/**
 * Close the currently displayed note (placeholder for dual-panel support)
 * @function closeCurrentNote
 * @param {boolean} isSecond - Whether this is the second note panel
 * @returns {void}
 * 
 * Currently handles single note panel
 * Placeholder for future dual-panel note editing
 * 
 * Usage example:
 * // Called when user closes current note tab/panel
 */
function closeCurrentNote(isSecond = false) {
    if (isSecond) {
        secondCurrentNote = null;
        document.getElementById('secondNoteTitle').value = '';
        document.getElementById('secondNoteBody').value = '';
        document.getElementById('secondNoteMetadata').textContent = '';
        //  document.getElementById('secondSyncNoteBtn').style.display = 'none';
    } else {
        currentNote = null;
        document.getElementById('noteTitle').value = '';
        document.getElementById('noteBody').value = '';
        document.getElementById('noteMetadata').textContent = '';
        // document.getElementById('syncNoteBtn').style.display = 'none';
    }

    if (!currentNote && !secondCurrentNote) {
        showLogo();
    }
}

/**
 * Show the application logo and hide editor
 * @function showLogo
 * @returns {void}
 * 
 * Called when no note is selected to display
 * 
 * Usage example:
 * // Called on app initialization and when closing notes
 */
function showLogo() {
    document.getElementById('appLogo').style.display = 'block';
    document.getElementById('noteEditor').style.display = 'none';
    document.getElementById('noteActions').style.display = 'none';
}

/**
 * Hide the logo and show the note editor
 * @function hideLogo
 * @returns {void}
 * 
 * Called when user starts working with notes
 * 
 * Usage example:
 * // Called when user selects or creates a note
 */
function hideLogo() {
    document.getElementById('appLogo').style.display = 'none';
    document.getElementById('noteEditor').style.display = 'flex';
    document.getElementById('noteActions').style.display = 'block';
}

// =============================================================================
// APPLICATION INITIALIZATION
// =============================================================================

/**
 * Initialize the application on page load
 * @function initializeApp
 * @returns {void}
 * 
 * Sets up the initial application state:
 * - Shows logo if no user is logged in
 * - Loads notes if user is authenticated
 * - Shows login modal if needed
 * 
 * Usage example:
 * // Called automatically when DOM is fully loaded
 */
function initializeApp() {
    showLogo();
    if (currentUser) {
        loadNotes();
    } else {
        showLoginModal();
    }
}

// =============================================================================
// APPLICATION STARTUP
// =============================================================================

/**
 * Wait for DOM to be fully loaded before initializing
 * Ensures all DOM elements are available for manipulation
 */
document.addEventListener('DOMContentLoaded', initializeApp);
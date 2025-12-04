# Implementation Documentation

This document provides detailed implementation information for each function in the Chalkboard application, including code snippets and technical explanations.

## Table of Contents

1. [Firebase Configuration & Initialization](#firebase-configuration--initialization)
2. [DOM Element References](#dom-element-references)
3. [Authentication System](#authentication-system)
4. [Note Management System](#note-management-system)
5. [Bulk Selection Management](#bulk-selection-management)
6. [Bulk Delete Operations](#bulk-delete-operations)
7. [Text-to-Speech System](#text-to-speech-system)
8. [Note Display & UI Management](#note-display--ui-management)
9. [Export Functionality](#export-functionality)
10. [Note Sharing & Syncing](#note-sharing--syncing)
11. [Settings & Account Management](#settings--account-management)
12. [Encryption System](#encryption-system)
13. [Utility Functions](#utility-functions)
14. [Application Initialization](#application-initialization)

---

## Firebase Configuration & Initialization

### Firebase Configuration Object

```javascript
// script.js lines 17-25
const firebaseConfig = {
    apiKey: "AIzaSyC2rV2E0BujE6b17pKbfGbN7jUPcKWMGak",
    authDomain: "chalkboard-2d89c.firebaseapp.com",
    projectId: "chalkboard-2d89c",
    storageBucket: "chalkboard-2d89c.firebasestorage.app",
    messagingSenderId: "416242146566",
    appId: "1:416242146566:web:739d2ad2c3f4d8104a5287",
    measurementId: "G-4EGX29H7WY"
};
```

**Implementation Details:**
- Contains all Firebase project credentials for connecting to the backend services
- `apiKey`: Authenticates requests from the client
- `authDomain`: Defines the authentication domain
- `projectId`: Identifies the Firestore database project
- `storageBucket`: For cloud storage operations (not used in current implementation)
- `messagingSenderId`: For Firebase Cloud Messaging (not used)
- `appId`: Unique application identifier
- `measurementId`: For Google Analytics (not used)

### Firebase Service Initialization

```javascript
// script.js lines 31-33
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
```

**Implementation Details:**
- `initializeApp()`: Sets up the Firebase application instance with the provided configuration
- `auth()`: Returns the Auth service instance for authentication operations
- `firestore()`: Returns the Firestore service instance for database operations

---

## DOM Element References

### Cached DOM Element Selectors

```javascript
// script.js lines 43-49
const loginModal = document.getElementById('loginModal');
const settingsModal = document.getElementById('settingsModal');
const noteList = document.getElementById('noteList');
const noteContent = document.getElementById('noteContent');
const noteTitle = document.getElementById('noteTitle');
const noteBody = document.getElementById('noteBody');
const noteMetadata = document.getElementById('noteMetadata');
```

**Implementation Details:**
- These selectors cache frequently accessed DOM elements for performance optimization
- Eliminates the need to query the DOM repeatedly
- References to modal dialogs, note list, and note editor elements
- Stored at script initialization for quick access throughout the application

---

## Authentication System

### Login Function Implementation

```javascript
// script.js lines 120-135
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
```

**Implementation Details:**
- Retrieves email and password from input fields
- Uses Firebase's `signInWithEmailAndPassword()` method
- On success: stores user object, hides modal, loads user's notes
- On failure: logs error and shows user-friendly alert
- Uses Promise-based asynchronous handling

### Authentication State Monitor

```javascript
// script.js lines 147-155
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        loadNotes();
    } else {
        currentUser = null;
        showLoginModal();
    }
});
```

**Implementation Details:**
- Firebase's built-in listener for authentication state changes
- Automatically triggers on page load and when user logs in/out
- If user exists: stores user object and loads notes
- If no user: clears user state and shows login modal
- Essential for maintaining application state across page refreshes

### Signup Function Implementation

```javascript
// script.js lines 177-192
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
```

**Implementation Details:**
- Similar to login but uses `createUserWithEmailAndPassword()`
- Calls `setupEncryption()` for new users (currently disabled)
- Same error handling pattern as login
- Creates user accounts directly in Firebase Authentication

### Logout Function Implementation

```javascript
// script.js lines 204-214
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
```

**Implementation Details:**
- Uses Firebase's `signOut()` method
- Clears current user state
- Shows login modal and clears note display
- Includes error logging for debugging

---

## Note Management System

### Create Note Function Implementation

```javascript
// script.js lines 236-248
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
```

**Implementation Details:**
- Generates unique note ID using current timestamp
- Creates note object with all required properties
- Uses Firebase Timestamp for consistent time handling
- Immediately displays the new note in the editor
- Sets author to current user's email
- Defaults shared status to false

### Save Note Function Implementation

```javascript
// script.js lines 266-298
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
```

**Implementation Details:**
- Validates user authentication and note existence
- Handles both new notes and updates to existing notes
- Encrypts content if encryption key is available
- Uses Firestore's `set()` method with document ID for upsert operation
- Updates the `updatedAt` timestamp on every save
- Refreshes note list after successful save

### Delete Note Function Implementation

```javascript
// script.js lines 314-337
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
```

**Implementation Details:**
- Validates that a note is currently selected
- Shows confirmation dialog to prevent accidental deletions
- Uses Firestore's `delete()` method
- Clears current note state and UI after successful deletion
- Refreshes note list to reflect changes

### Load Notes Function Implementation

```javascript
// script.js lines 357-412
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
```

**Implementation Details:**
- Queries Firestore for notes where author matches current user
- Orders results by updated timestamp (newest first)
- Dynamically creates DOM elements for each note
- Adds checkboxes for bulk selection functionality
- Implements event delegation for note selection
- Shows/hides bulk action controls based on note count
- Maintains selection state across reloads

---

## Bulk Selection Management

### Handle Note Selection Implementation

```javascript
// script.js lines 430-438
function handleNoteSelection(noteId, isSelected) {
    if (isSelected) {
        selectedNotes.add(noteId);
    } else {
        selectedNotes.delete(noteId);
    }
    updateSelectedCount();
    highlightSelectedNotes();
}
```

**Implementation Details:**
- Manages a Set of selected note IDs
- Adds or removes IDs based on checkbox state
- Calls UI update functions after each change
- Uses Set for efficient add/delete operations

### Update Selected Count Implementation

```javascript
// script.js lines 450-454
function updateSelectedCount() {
    const count = selectedNotes.size;
    const selectedCount = document.getElementById('selectedCount');
    selectedCount.textContent = count ? `${count} note(s) selected` : '';
}
```

**Implementation Details:**
- Updates UI element to show selection count
- Shows empty string when no notes are selected
- Provides immediate visual feedback to user

### Highlight Selected Notes Implementation

```javascript
// script.js lines 466-471
function highlightSelectedNotes() {
    document.querySelectorAll('.note-item').forEach(noteItem => {
        const isSelected = selectedNotes.has(noteItem.dataset.id);
        noteItem.classList.toggle('selected', isSelected);
    });
}
```

**Implementation Details:**
- Toggles 'selected' CSS class on note items
- Uses dataset ID for note identification
- Provides visual feedback for selected items

---

## Bulk Delete Operations

### Delete Selected Notes Implementation

```javascript
// script.js lines 491-518
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
```

**Implementation Details:**
- Uses Firestore batch operations for efficiency
- Creates batch delete operations for all selected notes
- Validates selection and shows confirmation dialog
- Clears selection state after successful deletion
- Refreshes UI to reflect changes

### Delete All Notes Implementation

```javascript
// script.js lines 531-556
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
```

**Implementation Details:**
- Queries all notes for current user before deletion
- Uses more severe confirmation dialog
- Creates batch operations for all user notes
- DANGER: This operation cannot be undone
- Includes additional safety measures

---

## Text-to-Speech System

### Read Selected Notes Implementation

```javascript
// script.js lines 576-603
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
```

**Implementation Details:**
- Validates that notes are selected and browser supports speech synthesis
- Cancels any ongoing speech to prevent conflicts
- Queries Firestore for selected notes
- Filters notes by selected IDs
- Passes filtered notes to reading function

### Start Reading Implementation

```javascript
// script.js lines 616-657
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
```

**Implementation Details:**
- Implements sequential reading of multiple notes
- Uses recursive function pattern for continuous playback
- Creates floating control panel with pause/resume/stop buttons
- Shows progress indicator (current note number)
- Manages playback state with `isReadingAloud` flag

### Speech Control Functions

```javascript
// Pause reading
function pauseReading() {
    window.speechSynthesis.pause();
}

// Resume reading  
function resumeReading() {
    window.speechSynthesis.resume();
}

// Stop reading
function stopReading() {
    isReadingAloud = false;
    window.speechSynthesis.cancel();
    const controls = document.getElementById('speech-controls');
    if (controls) {
        document.body.removeChild(controls);
    }
}
```

**Implementation Details:**
- Direct wrappers around Web Speech API methods
- `stopReading()` also cleans up UI controls
- Manages playback state and removes DOM elements

### Single Note Reading Implementation

```javascript
// script.js lines 713-770
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
```

**Implementation Details:**
- Reads currently displayed note
- Combines title and body into single speech utterance
- Configures speech parameters (rate, pitch, volume)
- Creates control panel with inline event handlers
- Auto-cleans up controls when speech ends

---

## Note Display & UI Management

### Display Note Implementation

```javascript
// script.js lines 788-801
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
```

**Implementation Details:**
- Updates current note state
- Populates editor fields with note data
- Converts Firebase timestamps to readable format using `toDate()` and `toLocaleString()`
- Updates metadata display with creation, update, and author information
- Handles null/undefined values gracefully

### Clear Note Display Implementation

```javascript
// script.js lines 814-820
function clearNoteDisplay() {
    noteTitle.value = '';
    noteBody.value = '';
    noteMetadata.textContent = '';
    //  document.getElementById('syncNoteBtn').style.display = 'none';
    showLogo();
}
```

**Implementation Details:**
- Resets all editor fields to empty state
- Clears metadata display
- Calls `showLogo()` to display welcome screen
- Called when user logs out or deletes current note

---

## Export Functionality

### Export Note Implementation

```javascript
// script.js lines 841-903
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
```

**Implementation Details:**
- Validates that a note is selected for export
- Creates modal dialog with format selection buttons
- Implements `exportAs` function with format-specific logic
- Markdown: Adds header formatting and metadata
- Text: Plain text with metadata
- PDF: Uses html2pdf library for formatted output
- Creates blob objects for download functionality
- Cleans up modal after export completion

---

## Note Sharing & Syncing

### Share Note Implementation

```javascript
// script.js lines 923-943
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
```

**Implementation Details:**
- Generates unique 6-character share code using base36 encoding
- Updates note document in Firestore with sharing metadata
- Stores share code, shared status, and timestamp
- Updates local note state
- Provides share code to user for distribution

### Sync Note Implementation

```javascript
// script.js lines 956-971
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
```

**Implementation Details:**
- Validates that note is shared before syncing
- Fetches latest note data from Firestore
- Updates display with synchronized content
- Provides user feedback on sync status

---

## Settings & Account Management

### Open Settings Implementation

```javascript
// script.js lines 987-989
function openSettings() {
    settingsModal.style.display = 'block';
}
```

**Implementation Details:**
- Simple modal display control
- Shows settings interface to user

### Save Settings Implementation

```javascript
// script.js lines 1004-1020
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
```

**Implementation Details:**
- Retrieves font style from settings form
- Applies font change immediately to document
- Saves settings to Firestore user's document
- Uses `merge: true` to preserve existing settings
- Closes modal on successful save

### Delete Account Implementation

```javascript
// script.js lines 1036-1060
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
```

**Implementation Details:**
- Shows confirmation dialog for account deletion
- Batch deletes all user's notes first
- Then deletes the Firebase Auth user account
- Chains Promises for sequential deletion
- Logs out user after successful account deletion
- DANGER: This operation cannot be undone

---

## Encryption System

### Setup Encryption Implementation

```javascript
// script.js lines 1077-1079
function setupEncryption() {
    return;
}
```

**Implementation Details:**
- Currently disabled (placeholder for future implementation)
- Intended to initialize encryption keys for new users
- Returns immediately without performing any operations

### Encrypt Data Implementation

```javascript
// script.js lines 1093-1096
function encryptData(data) {
    if (!encryptionKey) return data;
    return btoa(unescape(encodeURIComponent(data)) + encryptionKey);
}
```

**Implementation Details:**
- Uses simple base64 encoding with key concatenation
- Not secure for production use (security through obscurity only)
- Converts Unicode characters for proper encoding
- Appends encryption key to encoded data

### Decrypt Data Implementation

```javascript
// script.js lines 1109-1112
function decryptData(data) {
    if (!encryptionKey) return data;
    return decodeURIComponent(escape(atob(data.replace(encryptionKey, ''))));
}
```

**Implementation Details:**
- Reverse operation of encryptData
- Removes encryption key before decoding
- Converts back from base64 encoding
- Handles Unicode character decoding

---

## Utility Functions

### Close Settings Implementation

```javascript
// script.js lines 1126-1128
function closeSettings() {
    settingsModal.style.display = 'none';
}
```

**Implementation Details:**
- Simple modal hide functionality
- Used for closing settings dialog

### Close Current Note Implementation

```javascript
// script.js lines 1142-1160
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
```

**Implementation Details:**
- Placeholder for dual-panel note editing (currently unused)
- Clears note data from specified panel
- Shows logo when all note panels are closed

### Show Logo Implementation

```javascript
// script.js lines 1172-1176
function showLogo() {
    document.getElementById('appLogo').style.display = 'block';
    document.getElementById('noteEditor').style.display = 'none';
    document.getElementById('noteActions').style.display = 'none';
}
```

**Implementation Details:**
- Shows welcome screen when no note is selected
- Hides editor interface elements
- Provides clean starting state for users

### Hide Logo Implementation

```javascript
// script.js lines 1188-1192
function hideLogo() {
    document.getElementById('appLogo').style.display = 'none';
    document.getElementById('noteEditor').style.display = 'flex';
    document.getElementById('noteActions').style.display = 'block';
}
```

**Implementation Details:**
- Hides logo and shows editor interface
- Called when user selects or creates a note
- Prepares UI for note editing

---

## Application Initialization

### Initialize App Implementation

```javascript
// script.js lines 1211-1218
function initializeApp() {
    showLogo();
    if (currentUser) {
        loadNotes();
    } else {
        showLoginModal();
    }
}
```

**Implementation Details:**
- Sets initial application state
- Shows logo by default
- Checks authentication state and loads accordingly
- Called automatically when DOM is ready

### Application Startup

```javascript
// script.js lines 1228
document.addEventListener('DOMContentLoaded', initializeApp);
```

**Implementation Details:**
- Waits for DOM to be fully loaded before initialization
- Ensures all DOM elements are available for manipulation
- Prevents errors from accessing undefined elements

---

## Event Listener Registration

### Button Event Listeners

```javascript
// script.js lines 77-103
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

// Bulk operation buttons
document.getElementById('deleteSelectedBtn').addEventListener('click', deleteSelectedNotes);
document.getElementById('deleteAllBtn').addEventListener('click', deleteAllNotes);
document.getElementById('readSelectedBtn').addEventListener('click', readSelectedNotes);
```

**Implementation Details:**
- Registers click event handlers for all application buttons
- Uses `addEventListener()` for proper event handling
- Each listener calls the corresponding function
- Includes bulk operation handlers for multi-select functionality
- Anonymous function for settings modal close button

---

## Global State Variables

### Application State Management

```javascript
// script.js lines 59-65
let currentUser = null;      // Currently authenticated user object
let currentNote = null;      // Currently selected/displayed note object
let encryptionKey = null;    // Encryption key for secure note storage

// Bulk operation state management
let selectedNotes = new Set();  // Set of note IDs selected for bulk operations
let isReadingAloud = false;     // Flag indicating if text-to-speech is active
```

**Implementation Details:**
- `currentUser`: Stores Firebase Auth user object when logged in
- `currentNote`: Stores currently displayed note object
- `encryptionKey`: Placeholder for future encryption functionality
- `selectedNotes`: Set of note IDs for bulk operations (efficient add/delete)
- `isReadingAloud`: Boolean flag for text-to-speech state management

---

This completes the implementation documentation. Each function has been documented with code snippets and detailed technical explanations of how they work internally.
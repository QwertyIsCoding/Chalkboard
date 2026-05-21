/**
 * Chalkboard Framework - A reusable note-taking application framework
 * 
 * Provides a complete implementation of note-taking functionality with Firebase,
 * text-to-speech, export capabilities, and bulk operations.
 * 
 * Usage Example:
 * ```javascript
 * const chalkboard = new ChalkboardFramework({
 *   apiKey: "YOUR_API_KEY",
 *   projectId: "YOUR_PROJECT_ID",
 *   // ... other Firebase config
 * });
 * 
 * chalkboard.initialize({
 *   loginModalId: 'loginModal',
 *   noteListId: 'noteList',
 *   // ... other element IDs
 * });
 * ```
 */

class ChalkboardFramework {
    /**
     * Initialize the Chalkboard Framework
     * @param {Object} firebaseConfig - Firebase configuration object
     * @param {string} firebaseConfig.apiKey - Firebase API key
     * @param {string} firebaseConfig.authDomain - Firebase auth domain
     * @param {string} firebaseConfig.projectId - Firebase project ID
     * @param {string} firebaseConfig.storageBucket - Firebase storage bucket
     * @param {string} firebaseConfig.messagingSenderId - Firebase messaging sender ID
     * @param {string} firebaseConfig.appId - Firebase app ID
     */
    constructor(firebaseConfig) {
        this.firebaseConfig = firebaseConfig;
        this.auth = null;
        this.db = null;
        
        // Application state
        this.currentUser = null;
        this.currentNote = null;
        this.encryptionKey = null;
        this.selectedNotes = new Set();
        this.isReadingAloud = false;
        
        // DOM element references
        this.domElements = {};
        
        // Initialize Firebase
        this.initializeFirebase();
    }

    /**
     * Initialize Firebase services
     * @private
     */
    initializeFirebase() {
        if (!window.firebase) {
            throw new Error('Firebase SDK not loaded. Please include Firebase SDK script before initializing ChalkboardFramework.');
        }
        
        firebase.initializeApp(this.firebaseConfig);
        this.auth = firebase.auth();
        this.db = firebase.firestore();
    }

    /**
     * Initialize the framework with DOM elements
     * @param {Object} elementConfig - Configuration object with element IDs
     * @param {string} elementConfig.loginModalId - ID of login modal element
     * @param {string} elementConfig.settingsModalId - ID of settings modal element
     * @param {string} elementConfig.noteListId - ID of note list container
     * @param {string} elementConfig.noteContentId - ID of note content container
     * @param {string} elementConfig.noteTitleId - ID of note title input
     * @param {string} elementConfig.noteBodyId - ID of note body textarea
     * @param {string} elementConfig.noteMetadataId - ID of note metadata display
     * 
     * @example
     * chalkboard.initialize({
     *   loginModalId: 'loginModal',
     *   noteListId: 'noteList',
     *   noteTitleId: 'noteTitle',
     *   noteBodyId: 'noteBody',
     *   // ... other IDs
     * });
     */
    initialize(elementConfig) {
        // Cache DOM elements
        this.domElements = {
            loginModal: this.getElement(elementConfig.loginModalId),
            settingsModal: this.getElement(elementConfig.settingsModalId),
            noteList: this.getElement(elementConfig.noteListId),
            noteContent: this.getElement(elementConfig.noteContentId),
            noteTitle: this.getElement(elementConfig.noteTitleId),
            noteBody: this.getElement(elementConfig.noteBodyId),
            noteMetadata: this.getElement(elementConfig.noteMetadataId)
        };

        // Setup event listeners
        this.setupEventListeners();

        // Setup auth state listener
        this.auth.onAuthStateChanged((user) => {
            if (user) {
                this.currentUser = user;
                this.loadNotes();
            } else {
                this.currentUser = null;
                this.showLoginModal();
            }
        });

        // Initialize app
        this.initializeApp();
    }

    /**
     * Get DOM element by ID with error handling
     * @private
     * @param {string} elementId - ID of element to retrieve
     * @returns {HTMLElement} The DOM element
     */
    getElement(elementId) {
        if (!elementId) return null;
        const element = document.getElementById(elementId);
        if (!element) {
            console.warn(`Element with ID '${elementId}' not found`);
        }
        return element;
    }

    /**
     * Setup all event listeners for buttons and controls
     * @private
     */
    setupEventListeners() {
        // Note management buttons
        this.attachListener('createNoteBtn', () => this.createNote());
        this.attachListener('saveNoteBtn', () => this.saveNote());
        this.attachListener('deleteNoteBtn', () => this.deleteNote());
        this.attachListener('exportNoteBtn', () => this.exportNote());

        // Feature buttons
        this.attachListener('textToSpeechBtn', () => this.readNoteAloud());

        // User interface buttons
        this.attachListener('settingsBtn', () => this.openSettings());
        this.attachListener('logoutBtn', () => this.logout());

        // Authentication buttons
        this.attachListener('loginBtn', () => this.login());
        this.attachListener('signupBtn', () => this.signup());

        // Settings and account management
        this.attachListener('saveSettingsBtn', () => this.saveSettings());
        this.attachListener('deleteAccountBtn', () => this.deleteAccount());
        this.attachListener('closeSettingsBtn', () => this.closeSettings());

        // Bulk operation buttons
        this.attachListener('deleteSelectedBtn', () => this.deleteSelectedNotes());
        this.attachListener('deleteAllBtn', () => this.deleteAllNotes());
        this.attachListener('readSelectedBtn', () => this.readSelectedNotes());
    }

    /**
     * Attach click listener to element by ID
     * @private
     * @param {string} elementId - ID of element
     * @param {Function} callback - Function to call on click
     */
    attachListener(elementId, callback) {
        const element = document.getElementById(elementId);
        if (element) {
            element.addEventListener('click', callback);
        }
    }

    // =============================================================================
    // AUTHENTICATION SYSTEM
    // =============================================================================

    /**
     * Authenticate user with email and password
     * @public
     * @returns {Promise<Object>} Promise resolving to user credential
     */
    login() {
        const username = document.getElementById('username')?.value;
        const password = document.getElementById('password')?.value;

        if (!username || !password) {
            alert('Please enter username and password');
            return Promise.reject('Missing credentials');
        }

        return this.auth.signInWithEmailAndPassword(username, password)
            .then((userCredential) => {
                this.currentUser = userCredential.user;
                if (this.domElements.loginModal) {
                    this.domElements.loginModal.style.display = 'none';
                }
                this.loadNotes();
                return userCredential;
            })
            .catch((error) => {
                console.error('Login error:', error);
                alert('Login failed. Please check your credentials.');
                throw error;
            });
    }

    /**
     * Create a new user account
     * @public
     * @returns {Promise<Object>} Promise resolving to user credential
     */
    signup() {
        const username = document.getElementById('username')?.value;
        const password = document.getElementById('password')?.value;

        if (!username || !password) {
            alert('Please enter username and password');
            return Promise.reject('Missing credentials');
        }

        return this.auth.createUserWithEmailAndPassword(username, password)
            .then((userCredential) => {
                this.currentUser = userCredential.user;
                if (this.domElements.loginModal) {
                    this.domElements.loginModal.style.display = 'none';
                }
                this.setupEncryption();
                return userCredential;
            })
            .catch((error) => {
                console.error('Signup error:', error);
                alert('Signup failed. Please try again.');
                throw error;
            });
    }

    /**
     * Log out the current user
     * @public
     * @returns {Promise<void>} Promise resolving when logout completes
     */
    logout() {
        return this.auth.signOut()
            .then(() => {
                this.currentUser = null;
                this.clearNoteDisplay();
                this.showLoginModal();
            })
            .catch((error) => {
                console.error('Logout error:', error);
                throw error;
            });
    }

    /**
     * Show login modal
     * @public
     */
    showLoginModal() {
        if (this.domElements.loginModal) {
            this.domElements.loginModal.style.display = 'block';
        }
    }

    // =============================================================================
    // NOTE MANAGEMENT SYSTEM
    // =============================================================================

    /**
     * Create a new blank note
     * @public
     * @returns {Object} The newly created note object
     */
    createNote() {
        const now = firebase.firestore.Timestamp.now();
        this.currentNote = {
            id: Date.now().toString(),
            title: '',
            body: '',
            createdAt: now,
            updatedAt: now,
            author: this.currentUser?.email,
            shared: false
        };
        this.displayNote(this.currentNote);
        this.hideLogo();
        return this.currentNote;
    }

    /**
     * Save current note to Firestore
     * @public
     * @returns {Promise<void>} Promise resolving when save completes
     */
    saveNote() {
        if (!this.currentUser || !this.currentNote) {
            alert('Please create a note first');
            return Promise.reject('No user or note');
        }

        const noteData = {
            id: this.currentNote.id,
            title: this.domElements.noteTitle?.value || 'Untitled',
            body: this.domElements.noteBody?.value || '',
            createdAt: this.currentNote.createdAt || firebase.firestore.Timestamp.now(),
            updatedAt: firebase.firestore.Timestamp.now(),
            author: this.currentUser.email,
            shared: this.currentNote.shared || false,
            encrypted: this.encryptionKey ? true : false,
            content: this.encryptionKey ? this.encryptData(this.domElements.noteBody.value) : this.domElements.noteBody.value
        };

        return this.db.collection('notes')
            .doc(noteData.id)
            .set(noteData)
            .then(() => {
                this.currentNote = noteData;
                alert('Note saved successfully!');
                this.loadNotes();
            })
            .catch((error) => {
                console.error('Error saving note:', error);
                alert('Failed to save note. Please try again.');
                throw error;
            });
    }

    /**
     * Delete the currently selected note
     * @public
     * @returns {Promise<void>} Promise resolving when delete completes
     */
    deleteNote() {
        if (!this.currentNote || !this.currentNote.id) {
            alert('No note selected to delete');
            return Promise.reject('No note selected');
        }

        if (!confirm('Are you sure you want to delete this note? This action cannot be undone.')) {
            return Promise.reject('User cancelled');
        }

        return this.db.collection('notes')
            .doc(this.currentNote.id)
            .delete()
            .then(() => {
                alert('Note deleted successfully');
                this.currentNote = null;
                this.clearNoteDisplay();
                this.loadNotes();
            })
            .catch((error) => {
                console.error('Error deleting note:', error);
                alert('Failed to delete note. Please try again.');
                throw error;
            });
    }

    /**
     * Load all notes for current user
     * @public
     * @returns {Promise<Array>} Promise resolving to array of notes
     */
    loadNotes() {
        if (!this.currentUser) return Promise.reject('No user');

        return this.db.collection('notes')
            .where('author', '==', this.currentUser.email)
            .orderBy('updatedAt', 'desc')
            .get()
            .then((querySnapshot) => {
                if (this.domElements.noteList) {
                    this.domElements.noteList.innerHTML = '';
                }
                
                const bulkActions = document.querySelector('.bulk-actions');
                if (bulkActions) {
                    bulkActions.classList.toggle('visible', querySnapshot.size > 0);
                }

                const notes = [];
                querySnapshot.forEach((doc) => {
                    const note = doc.data();
                    notes.push(note);

                    if (this.domElements.noteList) {
                        const noteElement = this.createNoteListItem(note);
                        this.domElements.noteList.appendChild(noteElement);
                    }
                });

                this.updateSelectedCount();
                return notes;
            })
            .catch((error) => {
                console.error('Error loading notes:', error);
                throw error;
            });
    }

    /**
     * Create a note list item element
     * @private
     * @param {Object} note - Note data
     * @returns {HTMLElement} Note item element
     */
    createNoteListItem(note) {
        const noteElement = document.createElement('div');
        noteElement.className = 'note-item';
        noteElement.dataset.id = note.id;

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'note-checkbox';
        checkbox.addEventListener('change', (e) => {
            e.stopPropagation();
            this.handleNoteSelection(note.id, e.target.checked);
        });
        checkbox.checked = this.selectedNotes.has(note.id);

        const titleSpan = document.createElement('span');
        titleSpan.textContent = note.title || 'Untitled';

        noteElement.appendChild(checkbox);
        noteElement.appendChild(titleSpan);

        noteElement.addEventListener('click', (e) => {
            if (e.target !== checkbox) {
                this.displayNote(note);
                this.hideLogo();
            }
        });

        return noteElement;
    }

    // =============================================================================
    // BULK SELECTION MANAGEMENT
    // =============================================================================

    /**
     * Handle individual note selection
     * @public
     * @param {string} noteId - ID of note to select/deselect
     * @param {boolean} isSelected - Whether note is selected
     */
    handleNoteSelection(noteId, isSelected) {
        if (isSelected) {
            this.selectedNotes.add(noteId);
        } else {
            this.selectedNotes.delete(noteId);
        }
        this.updateSelectedCount();
        this.highlightSelectedNotes();
    }

    /**
     * Update count display for selected notes
     * @private
     */
    updateSelectedCount() {
        const count = this.selectedNotes.size;
        const selectedCountEl = document.getElementById('selectedCount');
        if (selectedCountEl) {
            selectedCountEl.textContent = count ? `${count} note(s) selected` : '';
        }
    }

    /**
     * Apply visual highlighting to selected notes
     * @private
     */
    highlightSelectedNotes() {
        document.querySelectorAll('.note-item').forEach(noteItem => {
            const isSelected = this.selectedNotes.has(noteItem.dataset.id);
            noteItem.classList.toggle('selected', isSelected);
        });
    }

    // =============================================================================
    // BULK DELETE OPERATIONS
    // =============================================================================

    /**
     * Delete all selected notes
     * @public
     * @returns {Promise<void>} Promise resolving when deletion completes
     */
    deleteSelectedNotes() {
        if (this.selectedNotes.size === 0) {
            alert('Please select notes to delete');
            return Promise.reject('No notes selected');
        }

        if (!confirm(`Are you sure you want to delete ${this.selectedNotes.size} selected note(s)?`)) {
            return Promise.reject('User cancelled');
        }

        const batch = this.db.batch();
        this.selectedNotes.forEach(noteId => {
            const noteRef = this.db.collection('notes').doc(noteId);
            batch.delete(noteRef);
        });

        return batch.commit()
            .then(() => {
                alert('Selected notes deleted successfully');
                this.selectedNotes.clear();
                this.clearNoteDisplay();
                this.loadNotes();
            })
            .catch((error) => {
                console.error('Error deleting notes:', error);
                alert('Failed to delete selected notes');
                throw error;
            });
    }

    /**
     * Delete ALL notes for current user
     * @public
     * @returns {Promise<void>} Promise resolving when deletion completes
     */
    deleteAllNotes() {
        if (!confirm('Are you sure you want to delete ALL notes? This action cannot be undone!')) {
            return Promise.reject('User cancelled');
        }

        return this.db.collection('notes')
            .where('author', '==', this.currentUser.email)
            .get()
            .then((querySnapshot) => {
                const batch = this.db.batch();
                querySnapshot.forEach((doc) => {
                    batch.delete(doc.ref);
                });
                return batch.commit();
            })
            .then(() => {
                alert('All notes deleted successfully');
                this.selectedNotes.clear();
                this.clearNoteDisplay();
                this.loadNotes();
            })
            .catch((error) => {
                console.error('Error deleting all notes:', error);
                alert('Failed to delete all notes');
                throw error;
            });
    }

    // =============================================================================
    // TEXT-TO-SPEECH SYSTEM
    // =============================================================================

    /**
     * Read single note aloud
     * @public
     * @returns {void}
     */
    readNoteAloud() {
        if (!this.currentNote) {
            alert('Please select a note to read');
            return;
        }

        if (!window.speechSynthesis) {
            alert('Text-to-speech is not supported in your browser');
            return;
        }

        window.speechSynthesis.cancel();

        const title = this.domElements.noteTitle?.value || 'Untitled';
        const body = this.domElements.noteBody?.value || '';
        const content = `${title}. ${body}`;

        const speech = new SpeechSynthesisUtterance(content);
        speech.rate = 1.0;
        speech.pitch = 1.0;
        speech.volume = 1.0;

        this.createSpeechControls();

        window.speechSynthesis.speak(speech);

        speech.onend = () => {
            this.removeSpeechControls();
        };
    }

    /**
     * Read multiple selected notes aloud
     * @public
     * @returns {void}
     */
    readSelectedNotes() {
        if (this.selectedNotes.size === 0) {
            alert('Please select notes to read');
            return;
        }

        if (!window.speechSynthesis) {
            alert('Text-to-speech is not supported in your browser');
            return;
        }

        this.stopReading();

        const notesToRead = [];
        this.db.collection('notes')
            .where('author', '==', this.currentUser.email)
            .get()
            .then((querySnapshot) => {
                querySnapshot.forEach((doc) => {
                    if (this.selectedNotes.has(doc.id)) {
                        notesToRead.push(doc.data());
                    }
                });
                this.startReading(notesToRead);
            });
    }

    /**
     * Start reading multiple notes sequentially
     * @private
     * @param {Array} notes - Array of notes to read
     */
    startReading(notes) {
        let currentIndex = 0;
        this.isReadingAloud = true;

        const readNext = () => {
            if (currentIndex < notes.length && this.isReadingAloud) {
                const note = notes[currentIndex];
                const speech = new SpeechSynthesisUtterance(
                    `Note ${currentIndex + 1} of ${notes.length}. Title: ${note.title || 'Untitled'}. Content: ${note.body || 'Empty note'}`
                );

                speech.onend = () => {
                    currentIndex++;
                    readNext();
                };

                window.speechSynthesis.speak(speech);
                this.updateSpeechControlsProgress(currentIndex, notes.length);
            }
        };

        this.createSpeechControls(notes.length);
        readNext();
    }

    /**
     * Create speech control UI
     * @private
     * @param {number} totalNotes - Total notes being read (optional)
     */
    createSpeechControls(totalNotes = 1) {
        this.removeSpeechControls();

        const controls = document.createElement('div');
        controls.id = 'speech-controls';
        controls.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: white;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 0 10px rgba(0,0,0,0.3);
            z-index: 1000;
        `;

        controls.innerHTML = `
            <div style="margin-bottom: 10px; font-weight: bold;">Playing Audio</div>
            <div style="margin-bottom: 10px; font-size: 0.9em;" id="speech-progress">
                ${totalNotes > 1 ? `Note 1 of ${totalNotes}` : 'Reading note'}
            </div>
            <div style="display: flex; gap: 5px;">
                <button onclick="window.speechSynthesis.pause()" style="padding: 5px 10px;">Pause</button>
                <button onclick="window.speechSynthesis.resume()" style="padding: 5px 10px;">Resume</button>
                <button onclick="document.getElementById('speech-controls')?.parentElement?.removeChild(document.getElementById('speech-controls')); window.speechSynthesis.cancel();" style="padding: 5px 10px;">Stop</button>
            </div>
        `;

        document.body.appendChild(controls);
    }

    /**
     * Update speech progress display
     * @private
     * @param {number} current - Current note index
     * @param {number} total - Total notes
     */
    updateSpeechControlsProgress(current, total) {
        const progressEl = document.getElementById('speech-progress');
        if (progressEl) {
            progressEl.textContent = `Note ${current} of ${total}`;
        }
    }

    /**
     * Remove speech control UI
     * @private
     */
    removeSpeechControls() {
        const controls = document.getElementById('speech-controls');
        if (controls) {
            document.body.removeChild(controls);
        }
    }

    /**
     * Pause text-to-speech
     * @public
     */
    pauseReading() {
        if (window.speechSynthesis) {
            window.speechSynthesis.pause();
        }
    }

    /**
     * Resume text-to-speech
     * @public
     */
    resumeReading() {
        if (window.speechSynthesis) {
            window.speechSynthesis.resume();
        }
    }

    /**
     * Stop text-to-speech
     * @public
     */
    stopReading() {
        this.isReadingAloud = false;
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
        this.removeSpeechControls();
    }

    // =============================================================================
    // NOTE DISPLAY & UI MANAGEMENT
    // =============================================================================

    /**
     * Display note in editor
     * @public
     * @param {Object} note - Note object to display
     */
    displayNote(note) {
        if (!note) return;

        this.currentNote = note;

        if (this.domElements.noteTitle) {
            this.domElements.noteTitle.value = note.title || '';
        }
        if (this.domElements.noteBody) {
            this.domElements.noteBody.value = note.body || '';
        }

        const createdDate = note.createdAt ? note.createdAt.toDate().toLocaleString() : 'Unknown';
        const updatedDate = note.updatedAt ? note.updatedAt.toDate().toLocaleString() : 'Unknown';

        if (this.domElements.noteMetadata) {
            this.domElements.noteMetadata.textContent = 
                `Created: ${createdDate} | Updated: ${updatedDate} | Author: ${note.author}`;
        }
    }

    /**
     * Clear note display
     * @public
     */
    clearNoteDisplay() {
        if (this.domElements.noteTitle) {
            this.domElements.noteTitle.value = '';
        }
        if (this.domElements.noteBody) {
            this.domElements.noteBody.value = '';
        }
        if (this.domElements.noteMetadata) {
            this.domElements.noteMetadata.textContent = '';
        }
        this.showLogo();
    }

    /**
     * Show logo placeholder
     * @public
     */
    showLogo() {
        const appLogo = document.getElementById('appLogo');
        const noteEditor = document.getElementById('noteEditor');
        const noteActions = document.getElementById('noteActions');

        if (appLogo) appLogo.style.display = 'block';
        if (noteEditor) noteEditor.style.display = 'none';
        if (noteActions) noteActions.style.display = 'none';
    }

    /**
     * Hide logo and show editor
     * @public
     */
    hideLogo() {
        const appLogo = document.getElementById('appLogo');
        const noteEditor = document.getElementById('noteEditor');
        const noteActions = document.getElementById('noteActions');

        if (appLogo) appLogo.style.display = 'none';
        if (noteEditor) noteEditor.style.display = 'flex';
        if (noteActions) noteActions.style.display = 'block';
    }

    // =============================================================================
    // EXPORT FUNCTIONALITY
    // =============================================================================

    /**
     * Export current note in specified format
     * @public
     * @param {string} format - Export format ('markdown', 'pdf', 'txt')
     * @returns {void}
     */
    exportNote(format = null) {
        if (!this.currentNote) {
            alert('Please select a note to export');
            return;
        }

        if (!format) {
            this.showExportModal();
            return;
        }

        const title = this.domElements.noteTitle?.value || 'Untitled';
        const body = this.domElements.noteBody?.value || '';
        const metadata = `Created: ${this.currentNote.createdAt.toDate().toLocaleString()}\nAuthor: ${this.currentNote.author}\n\n`;

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
                if (typeof html2pdf === 'undefined') {
                    alert('PDF export requires html2pdf library. Please include it in your HTML.');
                    return;
                }
                const element = document.createElement('div');
                element.innerHTML = `<h1>${title}</h1><small>${metadata}</small><p>${body.replace(/\n/g, '<br>')}</p>`;
                html2pdf().from(element).save(`${title}.pdf`);
                return;
            default:
                alert('Unknown export format');
                return;
        }

        // Create and download file
        const blob = new Blob([content], { type: fileType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Show export format modal
     * @private
     */
    showExportModal() {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 0 10px rgba(0,0,0,0.3);
            z-index: 1000;
        `;

        modal.innerHTML = `
            <h3>Export Format</h3>
            <div style="margin: 10px 0;">
                <button onclick="chalkboard.exportNote('markdown')" style="margin: 5px; padding: 8px 15px; cursor: pointer;">Markdown</button>
                <button onclick="chalkboard.exportNote('pdf')" style="margin: 5px; padding: 8px 15px; cursor: pointer;">PDF</button>
                <button onclick="chalkboard.exportNote('txt')" style="margin: 5px; padding: 8px 15px; cursor: pointer;">Text</button>
            </div>
            <button onclick="this.parentElement.parentElement.removeChild(this.parentElement)" style="margin: 5px; padding: 8px 15px; cursor: pointer;">Cancel</button>
        `;

        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 999;
        `;
        overlay.onclick = () => {
            document.body.removeChild(overlay);
            document.body.removeChild(modal);
        };

        document.body.appendChild(overlay);
        document.body.appendChild(modal);
    }

    // =============================================================================
    // NOTE SHARING & SYNCING
    // =============================================================================

    /**
     * Share a note with others
     * @public
     * @returns {Promise<string>} Promise resolving to share code
     */
    shareNote() {
        if (!this.currentNote) {
            return Promise.reject('No note selected');
        }

        const shareCode = Math.random().toString(36).substring(2, 8);

        return this.db.collection('notes').doc(this.currentNote.id).update({
            shared: true,
            shareCode: shareCode,
            sharedAt: firebase.firestore.Timestamp.now()
        })
            .then(() => {
                this.currentNote.shared = true;
                this.currentNote.shareCode = shareCode;
                alert(`Share this code with others: ${shareCode}\nThey can access this note using the code.`);
                return shareCode;
            })
            .catch((error) => {
                console.error('Error sharing note:', error);
                alert('Failed to share note');
                throw error;
            });
    }

    /**
     * Sync shared note with latest changes
     * @public
     * @returns {Promise<Object>} Promise resolving to updated note
     */
    syncNote() {
        if (!this.currentNote || !this.currentNote.shared) {
            return Promise.reject('Note not shared');
        }

        return this.db.collection('notes').doc(this.currentNote.id).get()
            .then((doc) => {
                if (doc.exists) {
                    const updatedNote = { id: doc.id, ...doc.data() };
                    this.displayNote(updatedNote);
                    alert('Note synced successfully!');
                    return updatedNote;
                }
                throw new Error('Note not found');
            })
            .catch((error) => {
                console.error('Error syncing note:', error);
                alert('Failed to sync note');
                throw error;
            });
    }

    // =============================================================================
    // SETTINGS & ACCOUNT MANAGEMENT
    // =============================================================================

    /**
     * Open settings modal
     * @public
     */
    openSettings() {
        if (this.domElements.settingsModal) {
            this.domElements.settingsModal.style.display = 'block';
        }
    }

    /**
     * Close settings modal
     * @public
     */
    closeSettings() {
        if (this.domElements.settingsModal) {
            this.domElements.settingsModal.style.display = 'none';
        }
    }

    /**
     * Save user settings
     * @public
     * @returns {Promise<void>} Promise resolving when save completes
     */
    saveSettings() {
        const fontStyle = document.getElementById('fontStyle')?.value;

        if (fontStyle) {
            document.body.style.fontFamily = fontStyle;
        }

        return this.db.collection('users').doc(this.currentUser.uid).set({
            settings: { fontStyle }
        }, { merge: true })
            .then(() => {
                alert('Settings saved successfully');
                this.closeSettings();
            })
            .catch((error) => {
                console.error('Error saving settings:', error);
                alert('Failed to save settings');
                throw error;
            });
    }

    /**
     * Delete user account and all associated data
     * @public
     * @returns {Promise<void>} Promise resolving when deletion completes
     */
    deleteAccount() {
        if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
            return Promise.reject('User cancelled');
        }

        return this.db.collection('notes').where('author', '==', this.currentUser.email).get()
            .then((querySnapshot) => {
                const batch = this.db.batch();
                querySnapshot.forEach((doc) => {
                    batch.delete(doc.ref);
                });
                return batch.commit();
            })
            .then(() => {
                return this.currentUser.delete();
            })
            .then(() => {
                alert('Account deleted successfully');
                this.logout();
            })
            .catch((error) => {
                console.error('Error deleting account:', error);
                alert('Failed to delete account');
                throw error;
            });
    }

    // =============================================================================
    // ENCRYPTION SYSTEM
    // =============================================================================

    /**
     * Setup encryption for new user
     * @public
     */
    setupEncryption() {
        // Placeholder for future encryption implementation
        return;
    }

    /**
     * Encrypt data
     * @public
     * @param {string} data - Data to encrypt
     * @returns {string} Encrypted data
     */
    encryptData(data) {
        if (!this.encryptionKey) return data;
        return btoa(unescape(encodeURIComponent(data)) + this.encryptionKey);
    }

    /**
     * Decrypt data
     * @public
     * @param {string} data - Data to decrypt
     * @returns {string} Decrypted data
     */
    decryptData(data) {
        if (!this.encryptionKey) return data;
        return decodeURIComponent(escape(atob(data.replace(this.encryptionKey, ''))));
    }

    // =============================================================================
    // APPLICATION INITIALIZATION
    // =============================================================================

    /**
     * Initialize the application
     * @private
     */
    initializeApp() {
        this.showLogo();
        if (this.currentUser) {
            this.loadNotes();
        } else {
            this.showLoginModal();
        }
    }

    /**
     * Get current user
     * @public
     * @returns {Object|null} Current Firebase user object or null
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Get current note
     * @public
     * @returns {Object|null} Current note object or null
     */
    getCurrentNote() {
        return this.currentNote;
    }

    /**
     * Get all selected notes
     * @public
     * @returns {Set} Set of selected note IDs
     */
    getSelectedNotes() {
        return this.selectedNotes;
    }

    /**
     * Check if currently reading aloud
     * @public
     * @returns {boolean} True if text-to-speech is active
     */
    isCurrentlyReading() {
        return this.isReadingAloud;
    }
}

// Export for use as module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChalkboardFramework;
}

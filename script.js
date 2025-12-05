/**
 * Chalkboard Documentation Landing Page
 * Interactive navigation and functionality for the documentation site
 */

document.addEventListener('DOMContentLoaded', function () {
    initializeDocumentationSite();

    // Setup README handling for Program Architecture
    setupReadmeButton(
        'open-program-readme',
        'program-doc-content',
        'Documentation/PROGRAM.md'
    );

    // Setup README handling for UI & Styling
    setupReadmeButton(
        'open-ui-readme',
        'ui-doc-content',
        'Documentation/UI.md'
    );
});

/**
 * Initialize the documentation site functionality
 */
function initializeDocumentationSite() {
    // Set up navigation
    setupNavigation();
    
    // Set up function details
    setupFunctionDetails();
    
    // Set up modal functionality
    setupModals();
    
    // Set up scroll effects
    setupScrollEffects();
    
    // Initialize the first section
    showSection('overview');
}

/**
 * Set up navigation between sections
 */
function setupNavigation() {
    // Navigation is handled by onclick handlers in HTML
    // This function can be extended for keyboard navigation
    document.addEventListener('keydown', function(e) {
        // Add keyboard shortcuts if needed
        if (e.key === 'Escape') {
            closeCodePreview();
            hideDemoModal();
        }
    });
}

/**
 * Show a specific documentation section
 * @param {string} sectionId - The ID of the section to show
 */
function showSection(sectionId) {
    // Hide all sections
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => {
        section.classList.remove('active');
    });
    
    // Remove active class from all nav buttons
    const navBtns = document.querySelectorAll('.nav-btn');
    navBtns.forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show target section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
        
        // Add active class to corresponding nav button
        const activeBtn = document.querySelector(`[onclick="showSection('${sectionId}')"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
        
        // Scroll to top smoothly
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        // Close any open code preview
        closeCodePreview();
    }
}

/**
 * Set up function details and code preview functionality
 */
function setupFunctionDetails() {
    // Function code snippets for the code preview
    window.functionCodeSnippets = {
        'login': {
            title: 'login() - User Authentication',
            code: `/**
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
}`
        },
        'signup': {
            title: 'signup() - New User Registration',
            code: `/**
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
}`
        },
        'logout': {
            title: 'logout() - Session Termination',
            code: `/**
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
}`
        },
        'createNote': {
            title: 'createNote() - Generate New Note Objects',
            code: `/**
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
}`
        },
        'saveNote': {
            title: 'saveNote() - Persist Notes to Firestore',
            code: `/**
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
}`
        },
        'loadNotes': {
            title: 'loadNotes() - Load and Display User Notes',
            code: `/**
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
}`
        },
        'readNoteAloud': {
            title: 'readNoteAloud() - Single Note Audio Playback',
            code: `/**
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
    const content = \`\${title}. \${body}\`;

    // Create and configure speech utterance
    const speech = new SpeechSynthesisUtterance(content);
    speech.rate = 1.0;
    speech.pitch = 1.0;
    speech.volume = 1.0;

    // Add speech controls UI
    const controls = document.createElement('div');
    controls.id = 'speech-controls';
    controls.innerHTML = \`
        <div style="position: fixed; bottom: 20px; right: 20px; background: white; 
                    padding: 10px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.3);">
            <button onclick="window.speechSynthesis.pause()">Pause</button>
            <button onclick="window.speechSynthesis.resume()">Resume</button>
            <button onclick="window.speechSynthesis.cancel(); document.body.removeChild(this.parentElement.parentElement)">Stop</button>
        </div>
    \`;

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
}`
        },
        'readSelectedNotes': {
            title: 'readSelectedNotes() - Multiple Note Sequential Reading',
            code: `/**
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
}`
        },
        'deleteSelectedNotes': {
            title: 'deleteSelectedNotes() - Batch Note Deletion',
            code: `/**
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

    if (!confirm(\`Are you sure you want to delete \${selectedNotes.size} selected note(s)?\`)) {
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
}`
        },
        'deleteAllNotes': {
            title: 'deleteAllNotes() - Delete All User Notes',
            code: `/**
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
}`
        }
    };
}

/**
 * Show detailed code for a specific function
 * @param {string} functionName - The name of the function to show
 */
function showFunctionDetails(functionName) {
    const snippet = window.functionCodeSnippets[functionName];
    if (!snippet) return;
    
    const codePreview = document.getElementById('codePreview');
    const codeTitle = document.getElementById('codeTitle');
    const codeContent = document.getElementById('codeContent');
    
    if (codePreview && codeTitle && codeContent) {
        codeTitle.textContent = snippet.title;
        codeContent.textContent = snippet.code;
        codeContent.className = 'language-javascript';
        
        // Show the code preview
        codePreview.classList.add('active');
        
        // Scroll to the code preview
        codePreview.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        
        // Re-highlight the code if Prism.js is loaded
        if (typeof Prism !== 'undefined') {
            Prism.highlightElement(codeContent);
        }
    }
}

/**
 * Close the code preview panel
 */
function closeCodePreview() {
    const codePreview = document.getElementById('codePreview');
    if (codePreview) {
        codePreview.classList.remove('active');
    }
}

/**
 * Set up modal functionality
 */
function setupModals() {
    // Modal functionality is handled by onclick handlers in HTML
    // This function can be extended for advanced modal features
}

/**
 * Show the demo modal
 */
function showDemoModal() {
    const modal = document.getElementById('demoModal');
    if (modal) {
        modal.classList.add('active');
    }
}

/**
 * Hide the demo modal
 */
function hideDemoModal() {
    const modal = document.getElementById('demoModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

/**
 * Set up scroll effects and animations
 */
function setupScrollEffects() {
    // Add scroll-based animations for elements entering viewport
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // Observe elements for scroll animations
    document.querySelectorAll('.feature-card, .impl-category, .pattern-card, .color-item').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
}

/**
 * Utility function to smooth scroll to element
 * @param {string} elementId - ID of the element to scroll to
 */
function scrollToElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

/**
 * Add loading state to buttons
 * @param {HTMLElement} button - The button element
 * @param {boolean} isLoading - Whether to show loading state
 */
function setButtonLoading(button, isLoading = true) {
    if (!button) return;
    
    if (isLoading) {
        button.dataset.originalText = button.textContent;
        button.textContent = 'Loading...';
        button.disabled = true;
        button.style.opacity = '0.7';
    } else {
        button.textContent = button.dataset.originalText || button.textContent;
        button.disabled = false;
        button.style.opacity = '1';
        delete button.dataset.originalText;
    }
}

/**
 * Format code for display with line numbers
 * @param {string} code - The code to format
 * @returns {string} Formatted code with line numbers
 */
function formatCodeWithLineNumbers(code) {
    const lines = code.split('\n');
    return lines.map((line, index) => {
        const lineNumber = index + 1;
        return `<span class="line-number">${lineNumber.toString().padStart(3, ' ')}</span> ${line}`;
    }).join('\n');
}

/**
 * Copy code to clipboard
 * @param {string} code - The code to copy
 */
function copyCodeToClipboard(code) {
    navigator.clipboard.writeText(code).then(() => {
        // Show a temporary success message
        showToast('Code copied to clipboard!', 'success');
    }).catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = code;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showToast('Code copied to clipboard!', 'success');
    });
}

/**
 * Show a temporary toast notification
 * @param {string} message - The message to show
 * @param {string} type - The type of toast (success, error, info)
 */
function showToast(message, type = 'info') {
    // Remove existing toast if any
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    // Style the toast
    Object.assign(toast.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '1rem 1.5rem',
        borderRadius: '8px',
        color: 'white',
        fontWeight: '500',
        zIndex: '10000',
        opacity: '0',
        transform: 'translateX(100%)',
        transition: 'all 0.3s ease'
    });
    
    // Set background color based on type
    switch (type) {
        case 'success':
            toast.style.backgroundColor = '#28a745';
            break;
        case 'error':
            toast.style.backgroundColor = '#dc3545';
            break;
        default:
            toast.style.backgroundColor = '#007bff';
    }
    
    // Add to document
    document.body.appendChild(toast);
    
    // Show toast
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(0)';
    }, 100);
    
    // Hide toast after 3 seconds
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

/**
 * Debounce function to limit the rate of function calls
 * @param {Function} func - The function to debounce
 * @param {number} wait - The wait time in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle function to limit the rate of function calls
 * @param {Function} func - The function to throttle
 * @param {number} limit - The limit in milliseconds
 * @returns {Function} Throttled function
 */
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Setup a README button and its rendering space
 * @param {string} buttonId - The ID of the button
 * @param {string} contentId - The ID of the rendering space
 * @param {string} filePath - The path to the README file
 */
function setupReadmeButton(buttonId, contentId, filePath) {
    const button = document.getElementById(buttonId);
    const content = document.getElementById(contentId);

    if (!button || !content) {
        console.error(`Button or content not found for ${buttonId}`);
        return;
    }

    button.addEventListener('click', async function () {
        if (content.style.display === 'block') {
            // Hide the README content
            content.style.display = 'none';
            button.textContent = 'View README';
        } else {
            // Show the README content
            button.disabled = true;
            button.textContent = 'Loading...';
            try {
                const response = await fetch(filePath);
                if (!response.ok) {
                    throw new Error(`Failed to fetch ${filePath}`);
                }
                const markdown = await response.text();
                const html = marked.parse(markdown);
                content.innerHTML = DOMPurify.sanitize(html);
                content.style.display = 'block';
                button.textContent = 'Hide README';
            } catch (error) {
                console.error(error);
                content.innerHTML = '<p><em>Error loading README. Please try again.</em></p>';
                content.style.display = 'block';
                button.textContent = 'View README';
            } finally {
                button.disabled = false;
            }
        }
    });
}

window.copyCodeToClipboard = copyCodeToClipboard;

/**
 * Enhanced README functionality that handles multiple buttons
 * Supports different documentation files based on button context
 * Includes close functionality with button state management
 */
(function () {
    // Get all README buttons (both top-level and section-level)
    const readmeButtons = document.querySelectorAll('#open-readme');
    const container = document.getElementById('doc-content');

    if (!container || readmeButtons.length === 0) {
        console.log('README elements not found, skipping enhanced README functionality');
        return;
    }

    // State management for multiple buttons
    let isReadmeVisible = false;
    let currentButton = null;
    let currentFile = 'PROGRAM.md';
    let currentOriginalText = '';

    // Specific fetch functions for each documentation type
    async function fetchImplementationReadme() {
        try {
            const res = await fetch('Documentation/IMPLEMENTATION.md');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return await res.text();
        } catch (e) {
            console.error('Failed to fetch IMPLEMENTATION.md:', e);
            return null;
        }
    }

    async function fetchProgramReadme() {
        try {
            const res = await fetch('Documentation/PROGRAM.md');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return await res.text();
        } catch (e) {
            console.error('Failed to fetch PROGRAM.md:', e);
            return null;
        }
    }

    async function fetchUIReadme() {
        try {
            const res = await fetch('Documentation/UI.md');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return await res.text();
        } catch (e) {
            console.error('Failed to fetch UI.md:', e);
            return null;
        }
    }

    // File mapping based on button text or context
    function getReadmeFile(button) {
        const buttonText = button.textContent.toLowerCase();
        
        // Check for specific section buttons
        if (buttonText.includes('implementation')) {
            return 'implementation';
        } else if (buttonText.includes('program') || buttonText.includes('architecture')) {
            return 'program';
        } else if (buttonText.includes('ui') || buttonText.includes('styling')) {
            return 'ui';
        }
        
        // Default fallback
        return 'program';
    }

    async function fetchReadme(fileType) {
        switch (fileType) {
            case 'implementation':
                return await fetchImplementationReadme();
            case 'program':
                return await fetchProgramReadme();
            case 'ui':
                return await fetchUIReadme();
            default:
                return await fetchProgramReadme();
        }
    }

    function showReadme(button) {
        if (isReadmeVisible && currentButton === button) {
            // Close README (same button)
            closeReadme();
        } else if (isReadmeVisible && currentButton !== button) {
            // Switch to different README (different button)
            closeReadme();
            setTimeout(() => openReadme(button), 100);
        } else {
            // Open README
            openReadme(button);
        }
    }

    async function openReadme(button) {
        if (!button) return;
        
        // Set current context
        currentButton = button;
        currentFile = getReadmeFile(button);
        currentOriginalText = button.textContent;
        
        // Disable button and show loading
        button.disabled = true;
        button.textContent = 'Loading...';
        
        try {
            const md = await fetchReadme(currentFile);
            
            if (!md) {
                button.disabled = false;
                button.textContent = currentOriginalText;
                container.style.display = 'block';
                container.innerHTML = `<p><em>Unable to load ${currentFile}. Ensure the file is available and served by your web server.</em></p>`;
                return;
            }
            
            // Convert markdown -> HTML, sanitize, and insert
            const html = marked.parse(md);
            container.innerHTML = DOMPurify.sanitize(html);
            container.style.display = 'block';
            
            // Update state and button
            isReadmeVisible = true;
            button.textContent = 'Hide README';
            button.disabled = false;
            
        } catch (error) {
            console.error('Error loading README:', error);
            button.disabled = false;
            button.textContent = currentOriginalText;
            container.innerHTML = '<p><em>Error loading documentation. Please try again.</em></p>';
            container.style.display = 'block';
        }
    }

    function closeReadme() {
        if (!currentButton) return;
        
        // Hide the container
        container.style.display = 'none';
        
        // Update state and button
        isReadmeVisible = false;
        currentButton.textContent = currentOriginalText;
        currentButton = null;
    }

    // Set up event listeners for all README buttons
    readmeButtons.forEach(button => {
        // Store original text
        button.dataset.originalText = button.textContent;
        
        // Remove any existing listeners and add enhanced version
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        
        // Add click event listener
        newButton.addEventListener('click', () => showReadme(newButton));
        
        console.log(`Enhanced README functionality set up for button: "${newButton.textContent}"`);
    });
    
    console.log(`Enhanced README functionality loaded - handling ${readmeButtons.length} buttons with context-aware file loading`);
})();

// Export functions for global access
window.showSection = showSection;
window.showFunctionDetails = showFunctionDetails;
window.closeCodePreview = closeCodePreview;
window.showDemoModal = showDemoModal;
window.hideDemoModal = hideDemoModal;
window.copyCodeToClipboard = copyCodeToClipboard;

// Chalk Particle Animation System
class ChalkParticle {
    constructor(canvas, x, y) {
        this.canvas = canvas;
        this.x = x || Math.random() * canvas.width;
        this.y = y || Math.random() * canvas.height;
        this.size = Math.random() * 3 + 1;
        this.speedX = (Math.random() - 0.5) * 0.5;
        this.speedY = (Math.random() - 0.5) * 0.5;
        this.opacity = Math.random() * 0.5 + 0.2;
        this.life = Math.random() * 200 + 100;
        this.maxLife = this.life;
        // Chalk colors: white, light gray, slight blue tint
        const colors = ['rgba(255,255,255,', 'rgba(200,200,210,', 'rgba(180,180,200,', 'rgba(220,220,230,'];
        this.color = colors[Math.floor(Math.random() * colors.length)];
    }

    update(mouseX, mouseY) {
        // Move particle
        this.x += this.speedX;
        this.y += this.speedY;
        this.life--;

        // Mouse interaction - particles drift away from cursor
        if (mouseX !== null && mouseY !== null) {
            const dx = this.x - mouseX;
            const dy = this.y - mouseY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < 100) {
                const force = (100 - distance) / 100;
                this.speedX += (dx / distance) * force * 0.2;
                this.speedY += (dy / distance) * force * 0.2;
            }
        }

        // Dampen speed
        this.speedX *= 0.99;
        this.speedY *= 0.99;

        // Fade out as life decreases
        this.opacity = (this.life / this.maxLife) * 0.5;
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color + this.opacity + ')';
        ctx.fill();
    }

    isDead() {
        return this.life <= 0 || this.x < 0 || this.x > this.canvas.width || this.y < 0 || this.y > this.canvas.height;
    }
}

function initChalkParticles() {
    const canvas = document.getElementById('chalkParticles');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let particles = [];
    let mouseX = null;
    let mouseY = null;
    let animationId;

    function resizeCanvas() {
        const container = canvas.parentElement;
        canvas.width = container.offsetWidth;
        canvas.height = container.offsetHeight;
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Track mouse position relative to canvas
    canvas.parentElement.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        mouseY = e.clientY - rect.top;
    });

    canvas.parentElement.addEventListener('mouseleave', () => {
        mouseX = null;
        mouseY = null;
    });

    // Create particles on click
    canvas.parentElement.addEventListener('click', (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        for (let i = 0; i < 15; i++) {
            particles.push(new ChalkParticle(canvas, x + (Math.random() - 0.5) * 30, y + (Math.random() - 0.5) * 30));
        }
    });

    // Initial particles
    for (let i = 0; i < 50; i++) {
        particles.push(new ChalkParticle(canvas));
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Add new particles occasionally
        if (Math.random() < 0.1 && particles.length < 100) {
            particles.push(new ChalkParticle(canvas));
        }

        // Update and draw particles
        particles = particles.filter(p => {
            p.update(mouseX, mouseY);
            if (!p.isDead()) {
                p.draw(ctx);
                return true;
            }
            return false;
        });

        animationId = requestAnimationFrame(animate);
    }

    animate();

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        cancelAnimationFrame(animationId);
    });
}

// Initialize particles when DOM is ready
document.addEventListener('DOMContentLoaded', initChalkParticles);


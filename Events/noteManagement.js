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
        window.location.reload(); // or history.go(0);
        return;
    }

    db.collection('notes')
        .doc(currentNote.id)
        .delete()
        .then(() => {
            alert('Note deleted successfully');
            currentNote = null;
            clearNoteDisplay();
            window.location.reload(); // or history.go(0);
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
            window.location.reload(); // or history.go(0);
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
            window.location.reload(); // or history.go(0);
            loadNotes();
        })
        .catch((error) => {
            console.error('Error deleting all notes:', error);
            alert('Failed to delete all notes');
        });
}
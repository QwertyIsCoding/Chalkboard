
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
// document.getElementById('shareNoteBtn').addEventListener('click', shareNote);
// document.getElementById('syncNoteBtn').addEventListener('click', syncNote);
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
// Add close button functionality for settings modal
document.getElementById('closeSettingsBtn').addEventListener('click', function () {
    document.getElementById('settingsModal').style.display = 'none';
});
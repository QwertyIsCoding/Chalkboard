
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


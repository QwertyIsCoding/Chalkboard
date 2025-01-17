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

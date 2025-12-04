// README handler for all sections
(function() {
    const container = document.getElementById('doc-content');
    
    async function fetchImplementationReadme() {
        const names = ['Documentation/IMPLEMENTATION.md'];
        let text = null;
        for (const name of names) {
            try {
                const res = await fetch(name);
                if (!res.ok) continue;
                text = await res.text();
                break;
            } catch (e) {
                // continue to next variant
            }
        }
        return text;
    }

    async function fetchProgramReadme() {
        const names = ['Documentation/PROGRAM.md'];
        let text = null;
        for (const name of names) {
            try {
                const res = await fetch(name);
                if (!res.ok) continue;
                text = await res.text();
                break;
            } catch (e) {
                // continue to next variant
            }
        }
        return text;
    }

    async function fetchUIReadme() {
        const names = ['Documentation/UI.md'];
        let text = null;
        for (const name of names) {
            try {
                const res = await fetch(name);
                if (!res.ok) continue;
                text = await res.text();
                break;
            } catch (e) {
                // continue to next variant
            }
        }
        return text;
    }

    async function showReadme(type) {
        let md = null;
        let buttonText = 'View README';
        let errorMessage = 'Unable to load README.md';
        
        // Determine which README to fetch based on section
        switch(type) {
            case 'implementation':
                md = await fetchImplementationReadme();
                buttonText = 'View Implementation README';
                errorMessage = 'Unable to load IMPLEMENTATION.md';
                break;
            case 'program':
                md = await fetchProgramReadme();
                buttonText = 'View Program Architecture README';
                errorMessage = 'Unable to load PROGRAM.md';
                break;
            case 'ui':
                md = await fetchUIReadme();
                buttonText = 'View UI & Styling README';
                errorMessage = 'Unable to load UI.md';
                break;
            default:
                md = await fetchImplementationReadme();
        }
        
        // Update button text and disable during load
        const currentBtn = document.querySelector(`[data-readme-type="${type}"]`);
        if (currentBtn) {
            currentBtn.disabled = true;
            currentBtn.textContent = 'Loading...';
        }
        
        if (!md) {
            if (currentBtn) {
                currentBtn.disabled = false;
                currentBtn.textContent = buttonText;
            }
            container.style.display = 'block';
            container.innerHTML = `<p><em>${errorMessage}. Ensure the file is available and served by your web server.</em></p>`;
            return;
        }
        
        // Convert markdown -> HTML, sanitize, and insert
        const html = marked.parse(md);
        container.innerHTML = DOMPurify.sanitize(html);
        container.style.display = 'block';
        
        if (currentBtn) {
            currentBtn.textContent = 'Refresh README';
            currentBtn.disabled = false;
        }
    }

    // Add event listeners for all readme buttons
    document.addEventListener('DOMContentLoaded', function() {
        const buttons = document.querySelectorAll('[data-readme-type]');
        buttons.forEach(btn => {
            btn.addEventListener('click', function() {
                const type = this.getAttribute('data-readme-type');
                showReadme(type);
            });
        });
    });
})();
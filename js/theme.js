// Theme initialization script
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    const html = document.documentElement;
    html.setAttribute('data-theme', savedTheme);
    
    // Update toggle button icon
    const toggleBtn = document.querySelector('.dark-mode-toggle i, .dark-mode-toggle-standalone i');
    if (toggleBtn) {
        toggleBtn.className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
    
    console.log('Theme initialized:', savedTheme);
}

// Dark mode toggle function
function toggleDarkMode() {
    console.log('toggleDarkMode called');
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    console.log('Switching from', currentTheme, 'to', newTheme);
    
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Update toggle button icon
    const toggleBtn = document.querySelector('.dark-mode-toggle i, .dark-mode-toggle-standalone i');
    if (toggleBtn) {
        toggleBtn.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        console.log('Updated button icon to:', toggleBtn.className);
    } else {
        console.log('Toggle button not found');
    }
    
    // Trigger custom event for other scripts
    window.dispatchEvent(new CustomEvent('themeChange', { detail: { theme: newTheme } }));
}

// Initialize theme when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeTheme);

// Listen for theme changes from other pages
window.addEventListener('storage', function(e) {
    if (e.key === 'theme') {
        const html = document.documentElement;
        html.setAttribute('data-theme', e.newValue || 'light');
        
        // Update toggle button icon
        const toggleBtn = document.querySelector('.dark-mode-toggle i, .dark-mode-toggle-standalone i');
        if (toggleBtn) {
            toggleBtn.className = (e.newValue === 'dark') ? 'fas fa-sun' : 'fas fa-moon';
        }
    }
});

// Make toggleDarkMode available globally
window.toggleDarkMode = toggleDarkMode;

// Debug: Check if function is available
console.log('Theme.js loaded, toggleDarkMode available:', typeof window.toggleDarkMode); 

// Global Scroll Reveal Observer Setup
function initScrollReveals() {
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.15 // Trigger when 15% of element is visible
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                // Optional: add stagger delay logic here if needed
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Target major structural and content elements for premium fade-up reveals
    const selectorsToReveal = [
        '.framer-project-card',
        '.framer-image-container',
        '.project-content p',
        '.project-content figure',
        '.project-content h3',
        '.framer-hero-desc',
        '.framer-container',
        '.gallery-card'
    ];

    const revealElements = document.querySelectorAll(selectorsToReveal.join(', '));
    
    revealElements.forEach(el => {
        // Only add 'reveal' if it doesn't already have it
        if (!el.classList.contains('reveal')) {
            el.classList.add('reveal');
        }
        observer.observe(el);
    });
}

// Ensure scroll reveals run after DOM is fully ready
document.addEventListener('DOMContentLoaded', initScrollReveals);
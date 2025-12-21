/* public/script.js */

document.addEventListener('DOMContentLoaded', () => {

    /* --- 1. Delete Confirmation --- */
    const deleteForms = document.querySelectorAll('.delete-form');
    deleteForms.forEach(form => {
        form.addEventListener('submit', (e) => {
            if (!confirm('Are you sure you want to delete this post?')) {
                e.preventDefault(); // Stop if user clicked Cancel
            }
        });
    });

    /* --- 2. Show More / Show Less --- */
    document.addEventListener('click', (e) => {
        // Only run if the clicked element is a toggle button
        if (e.target && e.target.classList.contains('btn-toggle-view')) {
            const button = e.target;
            const contentDiv = button.previousElementSibling; // The div right before the button

            if (contentDiv && contentDiv.classList.contains('post-content')) {
                if (contentDiv.classList.contains('collapsed')) {
                    contentDiv.classList.remove('collapsed');
                    button.textContent = "Show less";
                } else {
                    contentDiv.classList.add('collapsed');
                    button.textContent = "Show more";
                }
            }
        }
    });

});
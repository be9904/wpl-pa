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

async function toggleLike(postId) {
    try {
        const response = await fetch('/likePost', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ postId: postId })
        });

        const data = await response.json();

        if (data.success) {
            const btn = document.getElementById(`btn-like-${postId}`);
            const countSpan = document.getElementById(`count-${postId}`);

            // Update the number
            countSpan.innerText = data.likes;

            if (data.isLiked) {
                btn.classList.add('liked'); 
                btn.childNodes[0].nodeValue = '♥ Liked ('; 
            } else {
                btn.classList.remove('liked'); 
                btn.childNodes[0].nodeValue = '♡ Like (';
            }
        } else {
            console.error('Like failed:', data.error);
            if(data.error === 'Unauthorized') window.location.href = '/login';
        }
    } catch (err) {
        console.error('Error:', err);
    }
}
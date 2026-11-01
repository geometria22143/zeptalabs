// ZeptaLabs News & Updates - Client Script
document.addEventListener('DOMContentLoaded', () => {
  // Check for post query parameter or hash to handle deep linking
  const handleDeepLink = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const postIdParam = urlParams.get('post');
    const hash = window.location.hash;

    const targetId = postIdParam ? `post_${postIdParam}` : (hash ? hash.replace('#', '') : null);

    if (targetId) {
      setTimeout(() => {
        const targetElement = document.getElementById(targetId);
        if (targetElement) {
          targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          targetElement.classList.add('target-post-highlight');
          setTimeout(() => {
            targetElement.classList.remove('target-post-highlight');
          }, 3500);
        }
      }, 500);
    }
  };

  handleDeepLink();
  window.addEventListener('hashchange', handleDeepLink);
});

// The landing hero is a large tap target on phones. Keep the behaviour in a
// same-origin file so it survives the strict `script-src 'self'` policy; inline
// scripts are intentionally blocked.
document.querySelector('.hero')?.addEventListener('click', (event) => {
  if (event.target.closest('a, button')) return;
  window.location.href = '/web/';
});

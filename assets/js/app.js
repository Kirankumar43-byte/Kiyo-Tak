/**
 * Kiyo Tak - Corporate Web Application Logic
 * Executive leadership, service router, dynamic forms, theme manager, and interactive utilities.
 */

// Global App State
const KiyoState = {
  theme: localStorage.getItem('kiyo_theme') || 'dark',
  email: 'kiyotakhr@gmail.com',
  phone: '9943587707'
};

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initNav();
  handleUrlParams();
});

// Theme Management
function initTheme() {
  document.documentElement.setAttribute('data-theme', KiyoState.theme);
  updateThemeIcon();
}

function toggleTheme() {
  KiyoState.theme = KiyoState.theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('kiyo_theme', KiyoState.theme);
  document.documentElement.setAttribute('data-theme', KiyoState.theme);
  updateThemeIcon();
  showToast(`Switched to ${KiyoState.theme} mode`, 'info');
}

function updateThemeIcon() {
  const icon = document.getElementById('themeIcon');
  if (icon) {
    icon.className = KiyoState.theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
  }
}

// Navigation & Mobile Drawer
function initNav() {
  const hamburger = document.getElementById('hamburgerBtn');
  const navMenu = document.getElementById('navMenu');

  if (hamburger && navMenu) {
    hamburger.addEventListener('click', () => {
      navMenu.classList.toggle('open');
      hamburger.innerHTML = navMenu.classList.contains('open') 
        ? '<i class="fa-solid fa-xmark"></i>' 
        : '<i class="fa-solid fa-bars"></i>';
    });

    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('open');
        hamburger.innerHTML = '<i class="fa-solid fa-bars"></i>';
      });
    });
  }
}

// Handle URL query parameters for pre-filling contact/enquiry forms
function handleUrlParams() {
  const params = new URLSearchParams(window.location.search);
  const service = params.get('service');
  const subject = params.get('subject');

  const serviceSelect = document.getElementById('cService');
  if (serviceSelect && service) {
    serviceSelect.value = service;
  }

  const msgInput = document.getElementById('cMessage');
  if (msgInput && subject) {
    msgInput.value = `Hello Kiyo Tak Team,\n\nI would like to enquire about: ${subject}.\n\nPlease share details regarding timeline, technology feasibility, and next steps.`;
  }
}

// Toast Notifications
function showToast(message, type = 'info') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.style.cssText = `
      position: fixed;
      bottom: 24px;
      left: 24px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 10px;
    `;
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.style.cssText = `
    background: var(--bg-card);
    border: 1px solid var(--brand-blue-light);
    color: var(--text-primary);
    padding: 12px 18px;
    border-radius: var(--radius-md);
    box-shadow: 0 10px 25px rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 0.9rem;
    font-weight: 500;
    transition: all 0.3s ease;
  `;

  let icon = 'fa-solid fa-circle-info';
  let color = 'var(--brand-blue-light)';
  if (type === 'success') {
    icon = 'fa-solid fa-circle-check';
    color = '#10B981';
  } else if (type === 'error') {
    icon = 'fa-solid fa-triangle-exclamation';
    color = '#EF4444';
  }

  toast.innerHTML = `
    <i class="${icon}" style="color:${color}; font-size:1.1rem;"></i>
    <span>${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

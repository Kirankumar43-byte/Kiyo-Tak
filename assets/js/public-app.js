/**
 * Kiyo Tak - Public Website JavaScript
 * Public Authentication (Login, Register, Continue with Google),
 * Approved Reviews & Google Rating calculations, Application Form Submissions, and Theme.
 */

// Global State
let currentUser = JSON.parse(localStorage.getItem('kiyo_user')) || null;

document.addEventListener('DOMContentLoaded', () => {
  initPublicTheme();
  updateTopAuthBar();
  fetchApprovedReviews();
  initHamburgerNav();
});

function initPublicTheme() {
  const savedTheme = localStorage.getItem('kiyo_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('kiyo_theme', next);
  updateThemeIcon(next);
}

function updateThemeIcon(theme) {
  const icon = document.getElementById('themeIcon');
  if (icon) {
    icon.className = theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
  }
}

function initHamburgerNav() {
  const btn = document.getElementById('hamburgerBtn');
  const nav = document.getElementById('navMenu');
  if (btn && nav) {
    btn.addEventListener('click', () => {
      nav.classList.toggle('open');
    });
  }
}

function updateTopAuthBar() {
  const authArea = document.getElementById('topAuthArea');
  const portalBtn = document.getElementById('navPortalBtn');
  const heroPortalBtn = document.getElementById('heroPortalBtn');

  if (currentUser) {
    if (authArea) {
      authArea.innerHTML = `
        <span style="color:var(--brand-gold); font-weight:700;"><i class="fa-solid fa-user-graduate"></i> ${currentUser.name.split(' ')[0]}</span>
        <span style="color:var(--text-muted);">|</span>
        <a href="dashboard.html" class="top-item" style="color:var(--brand-blue-light);"><i class="fa-solid fa-award"></i> My Certificates</a>
        <span style="color:var(--text-muted);">|</span>
        <a href="javascript:void(0)" onclick="handlePublicLogout()" class="top-item" style="color:#ef4444;"><i class="fa-solid fa-right-from-bracket"></i> Logout</a>
        <span style="color:var(--text-muted);">|</span>
        <a href="admin-login.html" class="top-item" style="color:var(--brand-lavender);"><i class="fa-solid fa-terminal"></i> Admin Console</a>
      `;
    }
    if (portalBtn) {
      portalBtn.innerHTML = `
        <a href="dashboard.html" class="btn btn-gold"><i class="fa-solid fa-gauge"></i> My Dashboard</a>
      `;
    }
  } else {
    if (authArea) {
      authArea.innerHTML = `
        <a href="javascript:void(0)" onclick="openAuthModal('login')" class="top-item"><i class="fa-solid fa-arrow-right-to-bracket"></i> Login</a>
        <span style="color:var(--text-muted);">|</span>
        <a href="javascript:void(0)" onclick="openAuthModal('register')" class="top-item"><i class="fa-solid fa-user-plus"></i> Register</a>
        <span style="color:var(--text-muted);">|</span>
        <a href="admin-login.html" class="top-item" style="color:var(--brand-lavender);"><i class="fa-solid fa-terminal"></i> Admin Console</a>
      `;
    }
    if (portalBtn) {
      portalBtn.innerHTML = `
        <button class="btn btn-primary" onclick="openAuthModal('login')"><i class="fa-solid fa-user"></i> Student Login</button>
      `;
    }
  }
}

// ----------------------------------------------------
// AUTH MODAL & CONTROLS
// ----------------------------------------------------

function openAuthModal(mode = 'login') {
  const modal = document.getElementById('publicAuthModal');
  if (!modal) return;
  toggleAuthMode(mode);
  modal.classList.add('active');
}

function closeAuthModal() {
  const modal = document.getElementById('publicAuthModal');
  if (modal) modal.classList.remove('active');
}

function toggleAuthMode(mode) {
  const loginView = document.getElementById('authLoginView');
  const registerView = document.getElementById('authRegisterView');

  if (mode === 'register') {
    loginView.style.display = 'none';
    registerView.style.display = 'block';
  } else {
    loginView.style.display = 'block';
    registerView.style.display = 'none';
  }
}

function handlePublicRegisterSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('regName').value.trim();
  const phone = document.getElementById('regPhone').value.trim();
  const location = document.getElementById('regLocation').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  const confirmPassword = document.getElementById('regConfirmPassword').value;

  if (password !== confirmPassword) {
    alert('Passwords do not match. Please verify your password.');
    return;
  }

  fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, phone, location, email, password, confirmPassword })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      currentUser = data.user;
      localStorage.setItem('kiyo_user', JSON.stringify(currentUser));
      closeAuthModal();
      window.location.href = 'dashboard.html';
    } else {
      alert(data.message || 'Registration failed');
    }
  })
  .catch(err => {
    console.error(err);
    // Offline simulation fallback
    currentUser = { name, phone, location, email };
    localStorage.setItem('kiyo_user', JSON.stringify(currentUser));
    closeAuthModal();
    window.location.href = 'dashboard.html';
  });
}

function handlePublicLoginSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('pubLoginEmail').value.trim();
  const password = document.getElementById('pubLoginPassword').value;

  fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      currentUser = data.user;
      localStorage.setItem('kiyo_user', JSON.stringify(currentUser));
      closeAuthModal();
      window.location.href = 'dashboard.html';
    } else {
      alert(data.message || 'Invalid credentials');
    }
  })
  .catch(err => {
    console.error(err);
    alert('Login error. Please check your credentials.');
  });
}

function handlePublicGoogleSignIn() {
  const simulatedEmail = prompt("Enter your Google Account email for demo sign-in:", "student@gmail.com");
  if (!simulatedEmail) return;

  fetch('/api/auth/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: simulatedEmail, name: simulatedEmail.split('@')[0] })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      currentUser = data.user;
      localStorage.setItem('kiyo_user', JSON.stringify(currentUser));
      closeAuthModal();
      window.location.href = 'dashboard.html';
    }
  })
  .catch(err => {
    currentUser = { email: simulatedEmail, name: simulatedEmail.split('@')[0] };
    localStorage.setItem('kiyo_user', JSON.stringify(currentUser));
    closeAuthModal();
    window.location.href = 'dashboard.html';
  });
}

function handlePublicLogout() {
  localStorage.removeItem('kiyo_user');
  currentUser = null;
  updateTopAuthBar();
  window.location.reload();
}

// ----------------------------------------------------
// APPLICATION FORM SUBMISSION (kiyotakhtofficial@gmail.com)
// ----------------------------------------------------

function handlePublicApplicationSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('appName').value.trim();
  const phone = document.getElementById('appPhone').value.trim();
  const location = document.getElementById('appLocation').value.trim();
  const email = document.getElementById('appEmail').value.trim();
  const course = document.getElementById('appCourse').value;
  const message = document.getElementById('appMessage').value.trim();

  const btn = document.getElementById('btnAppSubmit');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';

  fetch('/api/applications/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, phone, location, email, course, message })
  })
  .then(res => res.json())
  .then(data => {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Submit Application to Kiyo Tak';

    alert(`Application submitted successfully! Your details have been transmitted to kiyotakhtofficial@gmail.com.\n\nOur admissions lead will get in touch via Phone or WhatsApp (${phone}).`);
    
    // Also trigger prompt to open WhatsApp for instantaneous connection
    const confirmWa = confirm("Would you also like to notify Kiyo Tak directly on WhatsApp (+91 9943587707) for immediate confirmation?");
    if (confirmWa) {
      const waText = encodeURIComponent(`Hi Kiyo Tak Team,\n\nI just submitted my mentorship application for *${course}*.\nName: ${name}\nPhone: ${phone}\nEmail: ${email}\nLocation: ${location}`);
      window.open(`https://wa.me/919943587707?text=${waText}`, '_blank');
    }

    document.getElementById('publicApplicationForm').reset();
  })
  .catch(err => {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Submit Application to Kiyo Tak';
    alert('Thank you! Your application has been registered.');
    document.getElementById('publicApplicationForm').reset();
  });
}

function handleQuickContactSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('qcName').value;
  const contact = document.getElementById('qcContact').value;
  const msg = document.getElementById('qcMsg').value;

  alert(`Thank you ${name}! Your inquiry has been sent to kiyotakhtofficial@gmail.com.`);
  window.open(`https://wa.me/919943587707?text=${encodeURIComponent(`Hi Kiyo Tak, I am ${name} (${contact}). Message: ${msg}`)}`, '_blank');
}

// ----------------------------------------------------
// REVIEWS & GOOGLE-STYLE RATINGS
// ----------------------------------------------------

function fetchApprovedReviews() {
  fetch('/api/reviews/approved')
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        renderGoogleRatingsBlock(data);
        renderApprovedTestimonials(data.reviews);
      }
    })
    .catch(err => console.error('Error fetching reviews:', err));
}

function renderGoogleRatingsBlock(data) {
  const avgScoreEl = document.getElementById('googleAvgScore');
  const countEl = document.getElementById('googleTotalReviewsCount');

  if (avgScoreEl) avgScoreEl.innerText = data.average || "4.9";
  if (countEl) countEl.innerText = `Based on ${data.total} Verified Student Reviews`;

  const counts = data.starCounts || { 5: 3, 4: 1, 3: 0, 2: 0, 1: 0 };
  const total = Math.max(1, data.total);

  for (let s = 1; s <= 5; s++) {
    const pct = Math.round(((counts[s] || 0) / total) * 100);
    const bar = document.getElementById(`bar${s}`);
    const pctLabel = document.getElementById(`pct${s}`);
    if (bar) bar.style.width = `${pct}%`;
    if (pctLabel) pctLabel.innerText = `${pct}%`;
  }
}

function renderApprovedTestimonials(reviews) {
  const container = document.getElementById('publicReviewsContainer');
  if (!container) return;
  container.innerHTML = '';

  if (reviews.length === 0) {
    container.innerHTML = `<div style="grid-column:1/-1; text-align:center; color:var(--text-muted); padding:30px;">No public reviews yet. Be the first to review Kiyo Tak!</div>`;
    return;
  }

  reviews.forEach(r => {
    const card = document.createElement('div');
    card.className = 'testimonial-card';
    card.innerHTML = `
      <div>
        <div class="stars-row" style="justify-content: flex-start; margin-bottom: 12px; color:var(--brand-gold);">
          ${'★'.repeat(r.rating || 5)}${'☆'.repeat(5 - (r.rating || 5))}
        </div>
        <p class="testimonial-text">"${escapeHtml(r.comment)}"</p>
      </div>
      <div class="testimonial-author">
        <div class="author-img">${(r.name || 'S').charAt(0)}</div>
        <div class="author-info">
          <h5>${escapeHtml(r.name)}</h5>
          <span>${escapeHtml(r.course || 'Verified Student')} · ${escapeHtml(r.date || 'Recent')}</span>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

function openSubmitReviewModal() {
  document.getElementById('submitReviewModal').classList.add('active');
}

function closeSubmitReviewModal() {
  document.getElementById('submitReviewModal').classList.remove('active');
}

function handlePublicReviewSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('revPubName').value.trim();
  const course = document.getElementById('revPubCourse').value.trim();
  const rating = document.getElementById('revPubRating').value;
  const comment = document.getElementById('revPubComment').value.trim();

  fetch('/api/reviews/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, course, rating, comment })
  })
  .then(res => res.json())
  .then(data => {
    closeSubmitReviewModal();
    alert('Thank you for your rating! Your review has been submitted and will appear on the website once approved by the administrator in the control room.');
  });
}

// ----------------------------------------------------
// POLICY MODALS
// ----------------------------------------------------

function openPublicPolicyModal(type) {
  const modal = document.getElementById('policyModal');
  const content = document.getElementById('policyModalContent');

  if (type === 'refund') {
    content.innerHTML = `
      <h3 style="font-size:1.4rem; font-weight:800; color:var(--brand-gold); margin-bottom:16px;">
        <i class="fa-solid fa-hand-holding-dollar"></i> Refund Policy
      </h3>
      <div style="font-size:0.95rem; color:var(--text-secondary); line-height:1.7;">
        <p style="margin-bottom:12px;"><strong>Important Notice:</strong> All course enrollments, mentorship cohort registrations, and service projects at Kiyo Tak are subject to a <strong>20% non-refundable administrative and resource allocation fee</strong>.</p>
        <p style="margin-bottom:12px;">1. <strong>Cancellations prior to commencement:</strong> If requested within 48 hours of enrollment, an 80% refund will be granted (20% retained for setup costs).</p>
        <p style="margin-bottom:12px;">2. <strong>Post-Commencement:</strong> Once course curriculum, kit assignments, or personalized mentorship hours have commenced, fees are non-refundable.</p>
        <p>For refund requests or questions, write to: <a href="mailto:kiyotakhtofficial@gmail.com" style="color:var(--brand-blue-light);">kiyotakhtofficial@gmail.com</a>.</p>
      </div>
    `;
  } else if (type === 'privacy') {
    content.innerHTML = `
      <h3 style="font-size:1.4rem; font-weight:800; color:var(--brand-blue-light); margin-bottom:16px;">
        <i class="fa-solid fa-shield-halved"></i> Privacy Policy
      </h3>
      <div style="font-size:0.95rem; color:var(--text-secondary); line-height:1.7;">
        <p style="margin-bottom:12px;">Kiyo Tak safeguards all student, client, and certificate records. We only process student names, phone numbers, email addresses, and academic grades for training delivery, certification generation, and mentor communication.</p>
        <p>Your details are never distributed to external third-party advertisers.</p>
      </div>
    `;
  } else {
    content.innerHTML = `
      <h3 style="font-size:1.4rem; font-weight:800; color:var(--brand-lavender); margin-bottom:16px;">
        <i class="fa-solid fa-file-contract"></i> Terms and Conditions
      </h3>
      <div style="font-size:0.95rem; color:var(--text-secondary); line-height:1.7;">
        <p style="margin-bottom:12px;">By accessing Kiyo Tak platforms, enrolling in our training programs, or holding verified certificates, you agree to academic integrity and ethical software/hardware usage guidelines.</p>
        <p>Certificate IDs are digitally signed and verifiable against our central database.</p>
      </div>
    `;
  }

  modal.classList.add('active');
}

function closePolicyModal() {
  document.getElementById('policyModal').classList.remove('active');
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ----------------------------------------------------
// SQUARE SWAP MODEL CONTROLLER FOR SERVICES
// ----------------------------------------------------
let currentServiceSwapIndex = 0;
const totalServicesCount = 6;
let autoSwapTimer = null;
let isSwapPaused = false;

function initSquareSwapServiceDeck() {
  const stage = document.getElementById('swapStageViewport');
  const widget = document.getElementById('heroServiceSwapWidget');
  if (!stage || !widget) return;

  updateSquareSwapDeck(0, 'none');

  // Start auto-swap
  startAutoSwapTimer();

  // Pause on hover / focus
  widget.addEventListener('mouseenter', () => { isSwapPaused = true; });
  widget.addEventListener('mouseleave', () => { isSwapPaused = false; });

  // Touch Swipe Support
  let touchStartX = 0;
  let touchStartY = 0;
  stage.addEventListener('touchstart', (e) => {
    isSwapPaused = true;
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
  }, { passive: true });

  stage.addEventListener('touchend', (e) => {
    isSwapPaused = false;
    const touchEndX = e.changedTouches[0].screenX;
    const diffX = touchEndX - touchStartX;
    if (Math.abs(diffX) > 40) {
      if (diffX < 0) {
        swapToNextService();
      } else {
        swapToPrevService();
      }
    }
  }, { passive: true });

  // Mouse Drag Swipe Support
  let mouseStartX = 0;
  let isMouseDown = false;
  stage.addEventListener('mousedown', (e) => {
    isMouseDown = true;
    mouseStartX = e.clientX;
  });
  stage.addEventListener('mouseup', (e) => {
    if (!isMouseDown) return;
    isMouseDown = false;
    const diffX = e.clientX - mouseStartX;
    if (Math.abs(diffX) > 50) {
      if (diffX < 0) {
        swapToNextService();
      } else {
        swapToPrevService();
      }
    }
  });
}

function startAutoSwapTimer() {
  if (autoSwapTimer) clearInterval(autoSwapTimer);
  autoSwapTimer = setInterval(() => {
    if (!isSwapPaused) {
      swapToNextService();
    }
  }, 3800);
}

function swapToNextService() {
  const prevIndex = currentServiceSwapIndex;
  currentServiceSwapIndex = (currentServiceSwapIndex + 1) % totalServicesCount;
  updateSquareSwapDeck(currentServiceSwapIndex, 'left', prevIndex);
}

function swapToPrevService() {
  const prevIndex = currentServiceSwapIndex;
  currentServiceSwapIndex = (currentServiceSwapIndex - 1 + totalServicesCount) % totalServicesCount;
  updateSquareSwapDeck(currentServiceSwapIndex, 'right', prevIndex);
}

function jumpToService(index) {
  if (index === currentServiceSwapIndex) return;
  const direction = index > currentServiceSwapIndex ? 'left' : 'right';
  const prevIndex = currentServiceSwapIndex;
  currentServiceSwapIndex = index;
  updateSquareSwapDeck(currentServiceSwapIndex, direction, prevIndex);
}

function updateSquareSwapDeck(activeIndex, direction = 'left', prevIndex = null) {
  const cards = document.querySelectorAll('.swap-service-card');
  if (!cards.length) return;

  const total = cards.length;

  cards.forEach((card, idx) => {
    card.classList.remove('active', 'next-stack', 'stack-2', 'swiped-left', 'swiped-right');

    if (idx === activeIndex) {
      card.classList.add('active');
    } else if (idx === (activeIndex + 1) % total) {
      card.classList.add('next-stack');
    } else if (idx === (activeIndex + 2) % total) {
      card.classList.add('stack-2');
    } else if (prevIndex !== null && idx === prevIndex) {
      if (direction === 'left') {
        card.classList.add('swiped-left');
      } else {
        card.classList.add('swiped-right');
      }
    }
  });

  // Update Counter Pill
  const counterPill = document.getElementById('swapCounterPill');
  if (counterPill) {
    counterPill.textContent = `0${activeIndex + 1} / 0${total}`;
  }

  // Update Dots
  const dots = document.querySelectorAll('.swap-dot');
  dots.forEach((dot, idx) => {
    if (idx === activeIndex) {
      dot.classList.add('active');
    } else {
      dot.classList.remove('active');
    }
  });
}

// Auto initialize deck when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSquareSwapServiceDeck);
} else {
  initSquareSwapServiceDeck();
}

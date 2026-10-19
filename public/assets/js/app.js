// GuardAgent Security Operations Console Shell & Helper Primitives

document.addEventListener('DOMContentLoaded', async () => {
  initNavigation();
  initMobileDrawer();
  await initSession();
});

function initNavigation() {
  const currentPath = window.location.pathname;
  const navItems = document.querySelectorAll('.app-nav-item');
  navItems.forEach(item => {
    const href = item.getAttribute('href');
    if (href && (currentPath === href || currentPath.endsWith(href))) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
}

function initMobileDrawer() {
  const toggleBtn = document.getElementById('mobileSidebarToggle');
  const sidebar = document.querySelector('.app-sidebar');
  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
  }
}

async function initSession() {
  try {
    const res = await window.api.getSession();
    if (res.user) {
      const nameElems = document.querySelectorAll('.user-name');
      const roleElems = document.querySelectorAll('.user-role');
      const avatarElems = document.querySelectorAll('.user-avatar');

      nameElems.forEach(el => el.textContent = res.user.full_name || res.user.email);
      roleElems.forEach(el => el.textContent = res.user.role ? res.user.role.replace('_', ' ').toUpperCase() : 'SECOPS ARCHITECT');
      avatarElems.forEach(el => {
        const initial = (res.user.full_name || res.user.email || 'G')[0].toUpperCase();
        el.textContent = initial;
      });
    }
  } catch (err) {
    console.log('[Session] Operating in demo verified SOC session.');
  }
}

// Global Modal Management
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
  }
}

// Global Developer Toast Notifications
function showToast(message, type = 'info') {
  let toastContainer = document.getElementById('toastContainer');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toastContainer';
    toastContainer.style.position = 'fixed';
    toastContainer.style.bottom = '1.5rem';
    toastContainer.style.right = '1.5rem';
    toastContainer.style.zIndex = '9999';
    toastContainer.style.display = 'flex';
    toastContainer.style.flexDirection = 'column';
    toastContainer.style.gap = '0.5rem';
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  const border = type === 'success' ? '#10B981' : (type === 'error' ? '#EF4444' : (type === 'warning' ? '#F59E0B' : '#00D2B4'));
  toast.style.backgroundColor = '#070A0F';
  toast.style.border = `1px solid ${border}`;
  toast.style.borderLeft = `3px solid ${border}`;
  toast.style.color = '#F8FAFC';
  toast.style.padding = '0.75rem 1.15rem';
  toast.style.borderRadius = '5px';
  toast.style.boxShadow = '0 10px 25px -5px rgba(0,0,0,0.7)';
  toast.style.fontSize = '0.825rem';
  toast.style.fontFamily = "'JetBrains Mono', monospace";
  toast.style.display = 'flex';
  toast.style.alignItems = 'center';
  toast.style.gap = '0.5rem';
  toast.style.maxWidth = '380px';
  toast.textContent = message;

  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.25s ease';
    setTimeout(() => toast.remove(), 250);
  }, 4000);
}

// Helpers for High-Contrast Security Badges
function renderDecisionBadge(decision) {
  if (decision === 'ALLOW') {
    return `<span class="badge badge-allow"><span class="badge-dot"></span>ALLOW</span>`;
  } else if (decision === 'BLOCK') {
    return `<span class="badge badge-block"><span class="badge-dot"></span>BLOCK</span>`;
  } else if (decision === 'REQUIRE_APPROVAL') {
    return `<span class="badge badge-approval"><span class="badge-dot"></span>APPROVAL REQ</span>`;
  }
  return `<span class="badge badge-neutral">${decision}</span>`;
}

function renderRiskBadge(score, level) {
  if (level === 'CRITICAL' || score >= 80) {
    return `<span class="badge badge-block"><span class="badge-dot"></span>${score} CRIT</span>`;
  } else if (level === 'HIGH' || score >= 60) {
    return `<span class="badge badge-approval"><span class="badge-dot"></span>${score} HIGH</span>`;
  } else if (level === 'MEDIUM' || score >= 35) {
    return `<span class="badge badge-info"><span class="badge-dot"></span>${score} MED</span>`;
  }
  return `<span class="badge badge-allow"><span class="badge-dot"></span>${score} LOW</span>`;
}

window.app = {
  openModal,
  closeModal,
  showToast,
  renderDecisionBadge,
  renderRiskBadge
};

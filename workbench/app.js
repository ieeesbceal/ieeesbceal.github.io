/**
 * IEEE Workbench - Task Management System Client
 * Pure JavaScript frontend integrated with Django REST API Backend
 */

// API Base Configuration
const isLocalhostEnv = (typeof window !== 'undefined') && (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === ''
);

const API_BASE_URL = isLocalhostEnv
    ? 'http://127.0.0.1:8000/api'
    : ((typeof CONFIG !== 'undefined' && CONFIG.API_BASE_URL)
        ? CONFIG.API_BASE_URL
        : 'https://api-ieee.sreedevss.in/api');

// Toast Notifications
function showToast(message, type = 'success') {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icon = type === 'success' 
        ? '<i class="fa-solid fa-circle-check" style="color: #10b981; font-size: 1rem;"></i>' 
        : '<i class="fa-solid fa-triangle-exclamation" style="color: #f59e0b; font-size: 1rem;"></i>';
    toast.innerHTML = `<span style="display: inline-flex; align-items: center;">${icon}</span><span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(8px)';
        toast.style.transition = 'all 0.2s ease';
        setTimeout(() => toast.remove(), 250);
    }, 3500);
}

// Session & Authentication
function getAuthToken() {
    return localStorage.getItem('club_token');
}

function getStoredUser() {
    const raw = localStorage.getItem('club_user');
    try {
        return raw ? JSON.parse(raw) : null;
    } catch (e) {
        return null;
    }
}

function setSession(token, user) {
    localStorage.setItem('club_token', token);
    localStorage.setItem('club_user', JSON.stringify(user));
}

function logout() {
    localStorage.removeItem('club_token');
    localStorage.removeItem('club_user');
    window.location.href = './index.html';
}

/**
 * Normalizes role string or Django user attributes to one of:
 * 'superadmin' | 'team_lead' | 'member'
 */
function normalizeRole(role, userObj = {}) {
    if (userObj.is_superuser) return 'superadmin';

    const r = String(role || '').trim().toLowerCase();
    if (r === 'superadmin' || r === 'super_admin' || r === 'president') {
        return 'superadmin';
    }
    if (r === 'admin' || r === 'operations_admin' || r === 'executive_admin') {
        return 'admin';
    }
    if (r === 'team_lead' || r === 'team lead' || r === 'lead' || r === 'chapter_lead' || r === 'chapter lead' || r === 'branch_admin' || r === 'branch admin') {
        return 'team_lead';
    }
    return 'member';
}

function getDashboardForRole(role, userObj = {}) {
    const normalized = normalizeRole(role, userObj);
    if (normalized === 'superadmin' || normalized === 'admin') return './superadmin-dashboard.html';
    if (normalized === 'team_lead') return './admin-dashboard.html';
    return './member-dashboard.html';
}

function getInitials(name) {
    if (!name) return '??';
    const parts = name.replace(/[^a-zA-Z0-9]/g, ' ').trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
}

// Dark Theme System
function initThemeSystem() {
    const saved = localStorage.getItem('workbench_theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    applyWorkbenchTheme(saved);
}

function applyWorkbenchTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('workbench_theme', theme);
    const btn = document.getElementById('themeToggleBtn');
    if (btn) {
        btn.innerHTML = theme === 'dark' ? '<i class="fa-solid fa-sun" style="color: #fbbf24;"></i>' : '<i class="fa-solid fa-moon"></i>';
        btn.setAttribute('title', theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode');
    }
}

window.toggleWorkbenchTheme = function() {
    const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    applyWorkbenchTheme(next);
};

// Immediately init theme when script loads
if (typeof document !== 'undefined') {
    initThemeSystem();
}

/**
 * Calculates ISO format string for datetime-local input
 * with a specified minimum future buffer (default: 20 minutes)
 */
function getMinDeadlineISO(bufferMinutes = 20) {
    const d = new Date(Date.now() + bufferMinutes * 60 * 1000);
    const pad = (n) => String(n).padStart(2, '0');
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Enforces strictly future deadlines (minimum 20 minutes from now)
 * on the target deadline datetime-local input.
 */
function setupDeadlineConstraint() {
    const deadlineInput = document.getElementById('deadline');
    if (!deadlineInput) return;

    const enforceMin = () => {
        const minISO = getMinDeadlineISO(20);
        deadlineInput.min = minISO;
        if (deadlineInput.value) {
            const chosen = new Date(deadlineInput.value);
            const minAllowed = new Date(Date.now() + 20 * 60 * 1000 - 30000);
            if (chosen < minAllowed) {
                deadlineInput.value = minISO;
            }
        }
    };

    enforceMin();
    deadlineInput.addEventListener('focus', enforceMin);
    deadlineInput.addEventListener('click', enforceMin);
    deadlineInput.addEventListener('change', () => {
        if (!deadlineInput.value) return;
        const chosen = new Date(deadlineInput.value);
        const minAllowed = new Date(Date.now() + 20 * 60 * 1000 - 30000);
        if (chosen < minAllowed) {
            showToast('Deadline must be in the future (minimum 20 minutes from now).', 'error');
            deadlineInput.value = getMinDeadlineISO(20);
        }
    });

    setInterval(enforceMin, 30000);
}

// Header Notifications
window.toggleNotificationPanel = function(event) {
    if (event) event.stopPropagation();
    const dropdown = document.getElementById('headerNotifDropdown');
    if (!dropdown) return;
    const isActive = dropdown.classList.contains('active');
    if (isActive) {
        dropdown.classList.remove('active');
    } else {
        dropdown.classList.add('active');
        const user = getStoredUser();
        const role = user ? normalizeRole(user.role, user) : 'member';
        loadNotifications(role);
    }
};

window.closeNotificationPanel = function() {
    const dropdown = document.getElementById('headerNotifDropdown');
    if (dropdown) dropdown.classList.remove('active');
};

document.addEventListener('click', (e) => {
    const wrapper = document.querySelector('.notif-wrapper');
    if (wrapper && !wrapper.contains(e.target)) {
        closeNotificationPanel();
    }
});

window.markAllNotificationsRead = async function(roleOverride = null) {
    try {
        await apiRequest('/notifications/read-all/', 'POST');
        showToast('All notifications marked as read.');
        const user = getStoredUser();
        const role = roleOverride || (user ? normalizeRole(user.role, user) : 'member');
        await loadNotifications(role);
    } catch (err) {
        showToast(err.message, 'error');
    }
};

/**
 * Unpacks lists from standard DRF paginated { results: [...] },
 * wrapped { data: [...] } / { tasks: [...] }, or raw arrays.
 */
function unpackList(data, primaryKey = null) {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (primaryKey && Array.isArray(data[primaryKey])) return data[primaryKey];
    if (Array.isArray(data.results)) return data.results;
    if (Array.isArray(data.data)) return data.data;
    if (Array.isArray(data.items)) return data.items;
    return [];
}

// Password Visibility
window.togglePasswordVisibility = function(target, btn) {
    const input = typeof target === 'string' ? document.getElementById(target) : target;
    if (!input) return;
    const isPwd = input.type === 'password';
    input.type = isPwd ? 'text' : 'password';
    if (btn) {
        const icon = btn.querySelector('i');
        if (icon) {
            if (isPwd) {
                icon.className = 'fa-solid fa-eye-slash';
                btn.setAttribute('title', 'Hide password');
            } else {
                icon.className = 'fa-solid fa-eye';
                btn.setAttribute('title', 'Show password');
            }
        }
    }
};

function setupPasswordToggles() {
    document.querySelectorAll('input[type="password"], input[data-pwd-toggle="true"]').forEach(input => {
        if (input.dataset.hasToggle) return;
        let wrapper = input.parentElement;
        if (!wrapper || !wrapper.classList.contains('password-input-wrap')) {
            wrapper = document.createElement('div');
            wrapper.className = 'password-input-wrap';
            input.parentNode.insertBefore(wrapper, input);
            wrapper.appendChild(input);
        }
        input.dataset.hasToggle = 'true';
        input.dataset.pwdToggle = 'true';
        input.style.paddingRight = '2.75rem';

        let btn = wrapper.querySelector('.password-toggle-btn');
        if (!btn) {
            btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'password-toggle-btn';
            btn.setAttribute('aria-label', 'Toggle password visibility');
            btn.setAttribute('title', 'Show password');
            btn.innerHTML = '<i class="fa-solid fa-eye"></i>';
            wrapper.appendChild(btn);
        }
        btn.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            window.togglePasswordVisibility(input, btn);
        };
    });
}

if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupPasswordToggles);
    } else {
        setupPasswordToggles();
    }
}

/**
 * Extracts descriptive error strings from Django REST responses
 */
function extractErrorMessage(data, response) {
    if (!data) return `Request failed (${response.status} ${response.statusText})`;
    if (typeof data === 'string') return data;
    if (data.detail) return data.detail;
    if (data.error) return data.error;
    if (data.message) return data.message;
    if (Array.isArray(data.non_field_errors)) return data.non_field_errors.join(' ');
    
    // Check for validation dictionary e.g. { username: ["Already taken"] }
    const fieldErrors = Object.entries(data)
        .filter(([k, v]) => Array.isArray(v) || typeof v === 'string')
        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
        .join('; ');
    if (fieldErrors) return fieldErrors;

    return `Request failed (${response.status}: ${response.statusText})`;
}

/**
 * Universal API Request Wrapper for Django REST API
 */
async function apiRequest(endpoint, method = 'GET', body = null) {
    const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    };

    const token = getAuthToken();
    if (token) {
        // DRF Token format vs JWT Bearer format
        const authScheme = (token.length > 50 || token.includes('.')) ? 'Bearer' : 'Token';
        headers['Authorization'] = `${authScheme} ${token}`;
    }

    const options = { method, headers };
    if (body) {
        options.body = JSON.stringify(body);
    }

    try {
        let cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

        // Deduplicate /api prefix if API_BASE_URL already contains it
        if (cleanEndpoint.startsWith('/api/') && API_BASE_URL.endsWith('/api')) {
            cleanEndpoint = cleanEndpoint.replace('/api', '');
        }

        // Add trailing slash for Django endpoints if no query parameters and no file extension
        if (!cleanEndpoint.includes('?') && !cleanEndpoint.includes('.') && !cleanEndpoint.endsWith('/')) {
            cleanEndpoint += '/';
        }

        const url = `${API_BASE_URL}${cleanEndpoint}`;
        const response = await fetch(url, options);

        if ((response.status === 401 || response.status === 403) && !cleanEndpoint.includes('login')) {
            showToast('Session expired or unauthorized. Redirecting to login...', 'error');
            setTimeout(logout, 1200);
            return null;
        }

        // Handle empty responses (e.g. 204 No Content)
        if (response.status === 204) {
            return { status: 'success' };
        }

        let data = null;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            const text = await response.text();
            try { data = JSON.parse(text); } catch (e) { data = { message: text }; }
        }

        if (!response.ok) {
            throw new Error(extractErrorMessage(data, response));
        }

        return data;
    } catch (err) {
        console.error(`[Django API Error] ${method} ${endpoint}:`, err);
        if (err.name === 'TypeError' || err.message.includes('fetch')) {
            throw new Error(`Unable to connect to Django API backend at ${API_BASE_URL}. Ensure backend is active.`);
        }
        throw err;
    }
}

// 1. Login Logic
function initLogin() {
    const user = getStoredUser();
    const token = getAuthToken();

    // Auto-redirect if already authenticated
    if (user && token) {
        window.location.href = getDashboardForRole(user.role, user);
        return;
    }

    const loginForm = document.getElementById('loginForm');
    const alertBox = document.getElementById('alertBox');
    if (!loginForm) return;

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        alertBox.style.display = 'none';

        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const submitBtn = loginForm.querySelector('button[type="submit"]');

        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Signing in to Workbench...';

        try {
            // Send login payload to Django endpoint (workbench login endpoint)
            let data;
            try {
                data = await apiRequest('/workbench/login/', 'POST', { username, password });
            } catch (wbErr) {
                // Fallback to /login/ if needed
                data = await apiRequest('/login/', 'POST', { username, password });
            }

            // Extract token (supports DRF Token, Knox, SimpleJWT)
            const token = data.token || data.key || data.access || data.access_token;
            if (!token) {
                throw new Error('Authentication succeeded, but no authorization token was returned.');
            }

            // Extract or build user profile
            const rawUser = data.user || {
                id: data.id || data.user_id,
                username: data.username || username,
                role: data.role,
                is_superuser: data.is_superuser || false,
                is_staff: data.is_staff || false,
                team_id: data.team_id || data.society_id || null,
                team_name: data.team_name || data.society_name || null
            };

            // Normalize role
            rawUser.role = normalizeRole(rawUser.role, rawUser);

            // Persist session
            setSession(token, rawUser);
            showToast(`Welcome back, ${rawUser.username}!`);

            // Execute role-based redirect
            const targetDashboard = getDashboardForRole(rawUser.role, rawUser);
            setTimeout(() => {
                window.location.href = targetDashboard;
            }, 350);

        } catch (err) {
            alertBox.textContent = err.message || 'Invalid username or password.';
            alertBox.style.display = 'block';
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span>Continue to Workspace</span> <i class="fa-solid fa-arrow-right"></i>';
        }
    });
}

// 2. Superadmin Dashboard
let superAdminCurrentTeamFilter = null;
let currentEditingUserId = null;

async function initSuperAdminDashboard() {
    const user = getStoredUser();
    const role = user ? normalizeRole(user.role, user) : null;
    if (!user || (role !== 'superadmin' && role !== 'admin')) {
        window.location.href = './index.html';
        return;
    }

    document.getElementById('superadminName').textContent = user.username;
    document.getElementById('userAvatar').textContent = getInitials(user.username);

    // Profile chip badge & Admin role UI adjustments
    const badgeEl = document.querySelector('.user-profile-chip .badge');
    const managementGrid = document.getElementById('superadminManagementGrid');
    const dashboardSubtitle = document.getElementById('dashboardSubtitle');

    if (role === 'admin') {
        if (badgeEl) {
            badgeEl.className = 'badge badge-admin';
            badgeEl.textContent = 'ADMIN';
        }
        if (dashboardSubtitle) {
            dashboardSubtitle.textContent = 'Full branch deliverables, task assignment, and issue management center.';
        }
        // Execom Members section & user creation are hidden for Admin
        if (managementGrid) {
            managementGrid.style.display = 'none';
        }
        const drawerMgmt = document.getElementById('drawerManageUsersLink');
        if (drawerMgmt) drawerMgmt.style.display = 'none';
    } else {
        if (badgeEl) {
            badgeEl.className = 'badge badge-super';
            badgeEl.textContent = 'SUPERADMIN';
        }
        if (managementGrid) {
            managementGrid.style.display = 'grid';
        }
    }

    document.getElementById('logoutBtn').addEventListener('click', logout);
    setupChangePasswordListeners();
    setupWorkflowModalListeners();
    checkFirstLoginPasswordPrompt(user);
    updateMobileDrawerProfile(user);
    initMobileWorkbenchView();

    // Initial Data Fetch
    const fetchPromises = [
        loadSuperAdminTeams(),
        loadNotifications(role),
        loadSuperAdminAssigneeDropdown(),
        loadTasks(role, null),
        loadAnalytics(role)
    ];

    if (role === 'superadmin') {
        fetchPromises.push(loadSuperAdminUsers(role));
    }

    await Promise.all(fetchPromises);

    // Setup Create Team Form
    if (createTeamForm) {
        createTeamForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('teamNameInput').value.trim();
            const description = document.getElementById('teamDescInput').value.trim();

            try {
                // Try /teams/ with fallback to /societies/create/
                try {
                    await apiRequest('/teams/', 'POST', { name, description });
                } catch (firstErr) {
                    await apiRequest('/societies/create/', 'POST', { name, description });
                }

                createTeamForm.reset();
                await loadSuperAdminTeams();
                await loadSuperAdminAssigneeDropdown();
                showToast(`Team "${name}" created successfully!`);
            } catch (err) {
                showToast(err.message, 'error');
            }
        });
    }

    // Setup Create User Form
    const createUserForm = document.getElementById('createUserForm');
    if (createUserForm) {
        createUserForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('newUsername').value.trim();
            const password = document.getElementById('newPassword').value;
            const newRole = document.getElementById('newRole').value;
            const team_id = document.getElementById('newTeamId').value || null;

            try {
                try {
                    await apiRequest('/users/', 'POST', { username, password, role: newRole, team_id });
                } catch (userErr) {
                    await apiRequest('/admins/create/', 'POST', { username, password, role: newRole, team_id });
                }

                createUserForm.reset();
                document.getElementById('addUserBox').style.display = 'none';
                await loadSuperAdminUsers(role);
                await loadSuperAdminAssigneeDropdown();
                showToast(`User ${username} added successfully!`);
            } catch (err) {
                showToast(err.message, 'error');
            }
        });
    }

    // Setup Global Task Assignment Form
    const taskForm = document.getElementById('createTaskForm');
    if (taskForm) {
        setupDeadlineConstraint();
        taskForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = document.getElementById('taskTitle').value.trim();
            const description = document.getElementById('taskDesc').value.trim();
            const assigned_to = document.getElementById('assignTo').value;
            const deadlineRaw = document.getElementById('deadline').value;

            if (!deadlineRaw) {
                showToast('Please specify a target deadline.', 'error');
                return;
            }

            const deadlineDate = new Date(deadlineRaw);
            const minAllowedDate = new Date(Date.now() + 20 * 60 * 1000 - 30000); // 30s buffer
            if (deadlineDate < minAllowedDate) {
                showToast('Target deadline must be in the future (minimum 20 minutes from now).', 'error');
                return;
            }

            const deadline = deadlineDate.toISOString();
            const allowReassignEl = document.getElementById('allowReassign');
            const allow_reassign = allowReassignEl ? allowReassignEl.checked : true;

            try {
                await apiRequest('/tasks/', 'POST', {
                    title,
                    description,
                    assigned_to: Number(assigned_to) || assigned_to,
                    deadline,
                    priority: 'medium',
                    allow_reassign
                });

                taskForm.reset();
                setupDeadlineConstraint();
                if (allowReassignEl) allowReassignEl.checked = true;
                await loadTasks(role, superAdminCurrentTeamFilter);
                await loadAnalytics(role, superAdminCurrentTeamFilter);
                showToast('Task dispatched across board!');
            } catch (err) {
                showToast(err.message, 'error');
            }
        });
    }

    // Setup Manual Cron Trigger
    const triggerCronBtn = document.getElementById('triggerCronBtn');
    if (triggerCronBtn) {
        triggerCronBtn.addEventListener('click', async () => {
            try {
                try {
                    await apiRequest('/admin/trigger-cron-check/', 'POST');
                } catch (e) {
                    await apiRequest('/trigger-cron-check/', 'POST');
                }
                await loadNotifications(role);
                await loadTasks(role, superAdminCurrentTeamFilter);
                await loadAnalytics(role, superAdminCurrentTeamFilter);
                showToast('Overdue task scan executed!');
            } catch (err) {
                showToast(err.message, 'error');
            }
        });
    }

    // Role Modal Form Submission
    const editRoleForm = document.getElementById('editRoleModalForm');
    if (editRoleForm) {
        editRoleForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const role = document.getElementById('modalUserRole').value;
            const teamVal = document.getElementById('modalUserTeam').value;
            const team_id = teamVal ? Number(teamVal) : null;

            try {
                try {
                    await apiRequest(`/users/${currentEditingUserId}/role/`, 'PATCH', { role, team_id });
                } catch (patchErr) {
                    await apiRequest(`/admins/edit/${currentEditingUserId}/`, 'POST', { role, team_id });
                }

                closeEditModal();
                const user = getStoredUser();
                const curRole = user ? normalizeRole(user.role, user) : 'superadmin';
                await loadSuperAdminUsers(curRole);
                await loadSuperAdminAssigneeDropdown();
                showToast('User permissions updated successfully!');
            } catch (err) {
                showToast(err.message, 'error');
            }
        });
    }
}

async function loadSuperAdminTeams() {
    const container = document.getElementById('teamsContainer');
    const newTeamSelect = document.getElementById('newTeamId');
    const modalTeamSelect = document.getElementById('modalUserTeam');
    const filterBar = document.getElementById('teamFilterBar');
    const teamFilterSelect = document.getElementById('teamFilterSelect');

    try {
        let teamsRes = null;
        try {
            teamsRes = await apiRequest('/teams/');
        } catch (e) {
            teamsRes = await apiRequest('/societies/');
        }

        const rawTeams = unpackList(teamsRes, 'societies');
        if (!rawTeams) return;

        // Exclude Professional Execom
        const teams = rawTeams.filter(t => !t.name.toLowerCase().includes('professional'));

        if (container) container.innerHTML = '';
        if (newTeamSelect) newTeamSelect.innerHTML = '<option value="">-- No Team (General/Superadmin) --</option>';
        if (modalTeamSelect) modalTeamSelect.innerHTML = '<option value="">-- No Team --</option>';

        if (teamFilterSelect) {
            teamFilterSelect.innerHTML = '<option value="">All Teams & Societies</option>';
        }
        if (filterBar) {
            filterBar.innerHTML = `<button class="filter-btn ${superAdminCurrentTeamFilter === null ? 'active' : ''}" onclick="filterByTeam(null, this)">All Teams</button>`;
        }

        teams.forEach(t => {
            const memberCount = t.member_count ?? t.stat_members ?? 0;
            if (container) {
                const item = document.createElement('div');
                item.className = 'society-list-item';
                item.innerHTML = `
                    <div>
                        <strong style="color: var(--text-primary); font-size: 0.92rem;">${escapeHtml(t.name)}</strong>
                        <div style="font-size: 0.76rem; color: var(--text-tertiary); margin-top: 0.15rem;">${escapeHtml(t.description || t.full_name || 'Technical Chapter / Team')}</div>
                    </div>
                    <div>
                        <span class="team-pill">${memberCount} Members</span>
                    </div>
                `;
                container.appendChild(item);
            }

            const opt = document.createElement('option');
            opt.value = t.id;
            opt.textContent = t.name;
            if (newTeamSelect) newTeamSelect.appendChild(opt.cloneNode(true));
            if (modalTeamSelect) modalTeamSelect.appendChild(opt.cloneNode(true));

            if (teamFilterSelect) {
                const dropOpt = document.createElement('option');
                dropOpt.value = t.id;
                dropOpt.textContent = t.name;
                if (superAdminCurrentTeamFilter && String(superAdminCurrentTeamFilter) === String(t.id)) {
                    dropOpt.selected = true;
                }
                teamFilterSelect.appendChild(dropOpt);
            }

            if (filterBar) {
                const filterBtn = document.createElement('button');
                filterBtn.className = `filter-btn ${superAdminCurrentTeamFilter === t.id ? 'active' : ''}`;
                filterBtn.textContent = t.name;
                filterBtn.onclick = function() { filterByTeam(t.id, this); };
                filterBar.appendChild(filterBtn);
            }
        });
    } catch (err) {
        console.error('Failed to load teams from Django:', err);
    }
}

window.filterByTeam = async function(teamId, btnElement) {
    superAdminCurrentTeamFilter = teamId;
    const teamFilterSelect = document.getElementById('teamFilterSelect');
    if (teamFilterSelect) {
        teamFilterSelect.value = teamId ? String(teamId) : '';
    }
    const filterBtns = document.querySelectorAll('#teamFilterBar .filter-btn');
    if (filterBtns.length > 0) {
        filterBtns.forEach(b => b.classList.remove('active'));
        if (btnElement) btnElement.classList.add('active');
    }
    const user = getStoredUser();
    const role = user ? normalizeRole(user.role, user) : 'superadmin';
    await loadTasks(role, teamId);
    await loadAnalytics(role, teamId);
};

async function loadSuperAdminUsers(viewerRole = 'superadmin') {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;

    try {
        let usersRes = null;
        try {
            usersRes = await apiRequest('/users/');
        } catch (e) {
            usersRes = await apiRequest('/admins/list/');
        }

        const rawUsers = unpackList(usersRes, 'admins');
        tbody.innerHTML = '';

        // Exclude Professional Execom completely from the workbench
        const users = rawUsers.filter(u => {
            const socLower = (u.team_name || u.society_name || (typeof u.society === 'object' ? u.society?.name : u.society) || '').toLowerCase();
            const roleLower = (u.position || u.role || '').toLowerCase();
            return !socLower.includes('professional') && !roleLower.includes('counsellor') && !roleLower.includes('counselor') && !roleLower.includes('advisor') && !roleLower.includes('mentor');
        });

        if (!users || users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-tertiary); padding: 2rem;">No Execom members found.</td></tr>';
            return;
        }

        // Helper to classify & compute hierarchical sort priority
        const getSortInfo = (u) => {
            const rawSoc = (u.raw_team_name || u.team_name || u.society_name || (typeof u.society === 'object' ? u.society?.name : u.society) || 'IEEE SB CEAL').trim();
            const socLower = rawSoc.toLowerCase();
            const roleLower = (u.position || u.role || '').toLowerCase().trim();

            const sbcSocieties = ['cs', 'embs', 'pes', 'pels', 'ras', 'wie', 'sps', 'ias'];
            const sbTeams = ['design', 'technical', 'management', 'pr & media', 'media', 'content', 'membership development', 'robotics'];

            // 1. IEEE SB CEAL (Student Branch Core Execom)
            if (socLower === 'ieee sb ceal' || socLower === 'sb ceal' || socLower === 'sbceal' || (!rawSoc && u.role !== 'admin' && u.role !== 'superadmin')) {
                let rPri = 10;
                if (roleLower.includes('chairperson') || roleLower === 'chair') rPri = 1;
                else if (roleLower.includes('vice chair') || roleLower.includes('vice-chair')) rPri = 2;
                else if (roleLower === 'secretary') rPri = 3;
                else if (roleLower.includes('joint secretary')) rPri = 4;
                else if (roleLower.includes('treasurer')) rPri = 5;
                else if (roleLower.includes('link rep')) rPri = 6;
                return {
                    groupOrder: 1,
                    groupName: 'IEEE SB CEAL',
                    groupIcon: 'fa-building-columns',
                    chapter: '',
                    isTeam: false,
                    roleOrder: rPri,
                    displayName: u.name || u.username
                };
            }

            // 2. Student Branch Teams (Design Team, Content Team, PR & Media Team, Technical Team, Management Team, Membership Development Team, Robotics Team)
            const matchedTeam = sbTeams.find(t => socLower.includes(t));
            if (matchedTeam) {
                let rPri = 3;
                if (roleLower.includes('lead') || roleLower.includes('head')) rPri = 1;
                else if (roleLower.includes('coordinator') || roleLower.includes('developer') || roleLower.includes('writer') || roleLower.includes('team') || roleLower.includes('web master')) rPri = 2;
                
                const teamTitle = rawSoc.toLowerCase().endsWith('team') ? rawSoc : `${rawSoc} Team`;
                return {
                    groupOrder: 2,
                    groupName: 'Student Branch Teams',
                    groupIcon: 'fa-users-gear',
                    chapter: teamTitle,
                    isTeam: true,
                    roleOrder: rPri,
                    displayName: u.name || u.username
                };
            }

            // 3. SBC CEAL (Societies & Chapters: CS, EMBS, IAS, PELS, PES, RAS, SPS, WIE)
            let rPri = 6;
            if (roleLower.includes('chairperson') || roleLower === 'chair') rPri = 1;
            else if (roleLower.includes('vice chair') || roleLower.includes('vice-chair') || roleLower.includes('lead')) rPri = 2;
            else if (roleLower.includes('secretary') && !roleLower.includes('joint')) rPri = 3;
            else if (roleLower.includes('women in') || roleLower.startsWith('wi')) rPri = 4;
            else if (roleLower.includes('joint secretary')) rPri = 5;

            const chapterTitle = rawSoc.toLowerCase().endsWith('chapter') ? rawSoc : `${rawSoc.toUpperCase()} Chapter`;
            return {
                groupOrder: 3,
                groupName: 'SBC CEAL (Societies & Chapters)',
                groupIcon: 'fa-layer-group',
                chapter: chapterTitle,
                isTeam: false,
                roleOrder: rPri,
                displayName: u.name || u.username
            };
        };

        const sortedUsers = [...users].sort((a, b) => {
            const sa = getSortInfo(a);
            const sb = getSortInfo(b);
            if (sa.groupOrder !== sb.groupOrder) return sa.groupOrder - sb.groupOrder;
            if (sa.chapter !== sb.chapter) return sa.chapter.localeCompare(sb.chapter);
            if (sa.roleOrder !== sb.roleOrder) return sa.roleOrder - sb.roleOrder;
            return 0; // Role order followed, no alphabetical requirement
        });

        // Compute counts per group
        const groupCounts = {};
        sortedUsers.forEach(u => {
            const info = getSortInfo(u);
            groupCounts[info.groupName] = (groupCounts[info.groupName] || 0) + 1;
        });

        let lastGroup = null;
        let lastChapter = null;

        sortedUsers.forEach(u => {
            const info = getSortInfo(u);

            // Group Header Divider
            if (info.groupName !== lastGroup) {
                lastGroup = info.groupName;
                lastChapter = null;
                const groupTr = document.createElement('tr');
                groupTr.className = 'table-group-header';
                groupTr.innerHTML = `
                    <td colspan="4">
                        <div class="table-group-title">
                            <i class="fa-solid ${info.groupIcon}"></i>
                            <span>${escapeHtml(info.groupName)}</span>
                            <span class="team-pill" style="font-size: 0.68rem; padding: 0.1rem 0.5rem; background: rgba(0, 85, 164, 0.08); color: var(--primary); font-weight: 700;">
                                ${groupCounts[info.groupName]} members
                            </span>
                        </div>
                    </td>
                `;
                tbody.appendChild(groupTr);
            }

            // Subgroup Sub-divider inside Student Branch Teams or SBC CEAL
            if (info.groupOrder >= 2 && info.chapter && info.chapter !== lastChapter) {
                lastChapter = info.chapter;
                const chapTr = document.createElement('tr');
                chapTr.className = 'table-subgroup-header';
                const iconClass = info.isTeam ? 'fa-users-gear' : 'fa-layer-group';
                const pillClass = info.isTeam ? 'chapter-pill-team' : 'chapter-pill-society';
                chapTr.innerHTML = `
                    <td colspan="4">
                        <div class="table-subgroup-title">
                            <span class="team-pill ${pillClass}" style="font-size: 0.72rem; font-weight: 800;">
                                <i class="fa-solid ${iconClass}" style="font-size: 0.65rem; margin-right: 0.25rem;"></i>${escapeHtml(info.chapter)}
                            </span>
                        </div>
                    </td>
                `;
                tbody.appendChild(chapTr);
            }

            // Member Row
            const roleStr = normalizeRole(u.role, u);
            const assignedTeamOrSociety = info.chapter || u.team_name || u.society_name || 'IEEE SB CEAL';
            const positionStr = u.position || u.role || (roleStr === 'superadmin' ? 'Chairperson' : (roleStr === 'team_lead' ? 'Lead' : 'Member'));
            const displayName = u.name || u.username;

            let roleBadge = '<span class="badge badge-member"><span class="badge-dot"></span>Member</span>';
            if (roleStr === 'superadmin') {
                roleBadge = '<span class="badge badge-super"><span class="badge-dot"></span>Superadmin</span>';
            } else if (roleStr === 'admin') {
                roleBadge = '<span class="badge badge-admin"><span class="badge-dot"></span>Admin</span>';
            } else if (roleStr === 'team_lead') {
                roleBadge = '<span class="badge badge-admin"><span class="badge-dot"></span>Team Lead</span>';
            }

            const posSocietyDisplay = `
                <div class="user-society-pill-wrap">
                    <div style="font-weight: 700; color: var(--text-primary); font-size: 0.88rem; white-space: nowrap;">${escapeHtml(assignedTeamOrSociety)}</div>
                    <div style="margin-top: 0.25rem;">
                        <span class="team-pill" style="font-size: 0.72rem; padding: 0.12rem 0.5rem; white-space: nowrap;">${escapeHtml(positionStr)}</span>
                    </div>
                </div>
            `;

            const tr = document.createElement('tr');
            tr.className = 'user-table-row';
            tr.setAttribute('data-name', (displayName || '').toLowerCase());
            tr.setAttribute('data-username', (u.username || '').toLowerCase());
            tr.setAttribute('data-role', roleStr.toLowerCase());
            tr.setAttribute('data-position', positionStr.toLowerCase());
            tr.setAttribute('data-society', assignedTeamOrSociety.toLowerCase());

            const actionBtnHtml = viewerRole === 'superadmin' ? `
                <div class="user-actions-group">
                    <button class="btn btn-secondary btn-sm btn-manage-user" onclick="openEditRoleModal(${u.id}, '${escapeHtml(displayName)}', '${roleStr}', ${u.team_id || u.society_id || 'null'})" title="Manage permissions & team">
                        <i class="fa-solid fa-sliders" style="font-size: 0.74rem;"></i>
                        <span>Manage</span>
                    </button>
                    <button class="btn btn-secondary btn-sm btn-reset-user" style="color: var(--accent-amber); border-color: rgba(245, 158, 11, 0.4);" onclick="superAdminResetUserPassword(${u.id}, '${escapeHtml(displayName)}')" title="Reset ${escapeHtml(displayName)}'s password to default">
                        <i class="fa-solid fa-key"></i>
                        <span class="btn-reset-text" style="display: none; margin-left: 0.25rem;">Reset</span>
                    </button>
                </div>
            ` : `<span style="color: var(--text-tertiary); font-size: 0.74rem; font-weight: 600;">Active</span>`;

            tr.innerHTML = `
                <td class="user-col-profile">
                    <div style="display: flex; align-items: center; gap: 0.65rem;">
                        <div class="avatar-bubble" style="width: 28px; height: 28px; font-size: 0.68rem; flex-shrink: 0;">${getInitials(displayName)}</div>
                        <strong style="color: var(--text-primary); font-weight: 700; font-size: 0.92rem; white-space: nowrap;">${escapeHtml(displayName)}</strong>
                    </div>
                </td>
                <td class="user-col-role">${roleBadge}</td>
                <td class="user-col-society">${posSocietyDisplay}</td>
                <td class="user-col-actions" style="text-align: right;">
                    ${actionBtnHtml}
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Re-apply search filter if user previously typed a query
        if (typeof window.filterExecomUsersTable === 'function') {
            window.filterExecomUsersTable();
        }
    } catch (err) {
        console.error('Failed to load users from Django:', err);
    }
}

window.filterExecomUsersTable = function() {
    const searchInput = document.getElementById('execomUsersSearch');
    if (!searchInput) return;
    const query = searchInput.value.trim().toLowerCase();
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;

    const allRows = Array.from(tbody.querySelectorAll('tr'));
    if (!query) {
        allRows.forEach(row => row.style.display = '');
        return;
    }

    // 1. Filter individual user rows
    allRows.forEach(row => {
        if (row.classList.contains('user-table-row')) {
            const name = row.getAttribute('data-name') || '';
            const username = row.getAttribute('data-username') || '';
            const role = row.getAttribute('data-role') || '';
            const position = row.getAttribute('data-position') || '';
            const society = row.getAttribute('data-society') || '';
            const text = `${name} ${username} ${role} ${position} ${society}`;

            if (text.includes(query)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        }
    });

    // 2. Adjust visibility of group and subgroup headers dynamically
    let currentGroupHeader = null;
    let currentGroupHasVisible = false;
    let currentSubgroupHeader = null;
    let currentSubgroupHasVisible = false;

    for (let i = 0; i < allRows.length; i++) {
        const row = allRows[i];
        if (row.classList.contains('table-group-header')) {
            if (currentSubgroupHeader) {
                currentSubgroupHeader.style.display = currentSubgroupHasVisible ? '' : 'none';
            }
            if (currentGroupHeader) {
                currentGroupHeader.style.display = currentGroupHasVisible ? '' : 'none';
            }
            currentGroupHeader = row;
            currentGroupHasVisible = false;
            currentSubgroupHeader = null;
            currentSubgroupHasVisible = false;
        } else if (row.classList.contains('table-subgroup-header')) {
            if (currentSubgroupHeader) {
                currentSubgroupHeader.style.display = currentSubgroupHasVisible ? '' : 'none';
            }
            currentSubgroupHeader = row;
            currentSubgroupHasVisible = false;
        } else if (row.classList.contains('user-table-row')) {
            if (row.style.display !== 'none') {
                currentGroupHasVisible = true;
                currentSubgroupHasVisible = true;
            }
        }
    }
    if (currentSubgroupHeader) {
        currentSubgroupHeader.style.display = currentSubgroupHasVisible ? '' : 'none';
    }
    if (currentGroupHeader) {
        currentGroupHeader.style.display = currentGroupHasVisible ? '' : 'none';
    }
};

window.openEditRoleModal = function(userId, username, role, teamId) {
    currentEditingUserId = userId;
    document.getElementById('modalUsernameHeading').textContent = username;
    document.getElementById('modalUserRole').value = role;
    document.getElementById('modalUserTeam').value = teamId ? String(teamId) : '';
    document.getElementById('editRoleModal').classList.add('active');
};

window.closeEditModal = function() {
    document.getElementById('editRoleModal').classList.remove('active');
};

async function loadSuperAdminAssigneeDropdown() {
    const select = document.getElementById('assignTo');
    if (!select) return;

    try {
        let membersRes = null;
        try {
            membersRes = await apiRequest('/members/');
        } catch (e) {
            membersRes = await apiRequest('/users/');
        }

        const members = unpackList(membersRes, 'members');
        select.innerHTML = '<option value="">-- Choose Member --</option>';

        const currentUser = getStoredUser();
        members.forEach(m => {
            const socName = (m.team_name || (typeof m.society === 'object' ? m.society?.name : m.society) || '').toLowerCase();
            const rTitle = (m.role || m.position || '').toLowerCase();
            if (socName.includes('professional') || rTitle.includes('counsellor') || rTitle.includes('counselor') || rTitle.includes('advisor') || rTitle.includes('mentor')) {
                return;
            }
            // Disallow self-assignment
            if (currentUser && (m.id == currentUser.id || m.username == currentUser.username || m.name == currentUser.username || m.name == currentUser.name)) {
                return;
            }
            const opt = document.createElement('option');
            opt.value = m.id;
            const teamName = m.team_name || (typeof m.society === 'object' ? m.society?.name : m.society);
            const teamTag = teamName ? `[${teamName}] ` : '';
            const displayName = m.name || m.username;
            opt.textContent = `${teamTag}${displayName}`;
            select.appendChild(opt);
        });
    } catch (err) {
        console.error('Failed to load assignees from Django:', err);
    }
}

// 3. Team Admin Dashboard
async function initAdminDashboard() {
    const user = getStoredUser();
    const normalized = user ? normalizeRole(user.role, user) : null;

    if (!user || normalized !== 'team_lead') {
        if (normalized === 'superadmin') {
            window.location.href = './superadmin-dashboard.html';
            return;
        }
        window.location.href = './index.html';
        return;
    }

    const teamTitle = user.team_name ? `${user.team_name} Team` : 'Team';
    document.getElementById('adminName').textContent = user.username;
    document.getElementById('userAvatar').textContent = getInitials(user.username);
    document.getElementById('teamBadgeText').textContent = `${teamTitle} Lead`;
    document.getElementById('dashboardTitle').textContent = `${teamTitle} Workspace`;
    document.getElementById('dashboardSubtitle').textContent = `Manage deliverables and team tracking for ${teamTitle}.`;
    document.getElementById('assignFormTitle').textContent = `Assign Task to ${teamTitle}`;

    document.getElementById('logoutBtn').addEventListener('click', logout);
    setupChangePasswordListeners();
    setupWorkflowModalListeners();
    checkFirstLoginPasswordPrompt(user);
    updateMobileDrawerProfile(user);
    initMobileWorkbenchView();

    await Promise.all([
        loadTeamMemberDropdown(),
        loadNotifications('team_lead'),
        loadTasks('team_lead', user.team_id),
        loadAnalytics('team_lead')
    ]);

    const taskForm = document.getElementById('createTaskForm');
    if (taskForm) {
        setupDeadlineConstraint();
        taskForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = document.getElementById('taskTitle').value.trim();
            const description = document.getElementById('taskDesc').value.trim();
            const assigned_to = document.getElementById('assignTo').value;
            const deadlineRaw = document.getElementById('deadline').value;

            if (!assigned_to) {
                showToast('Please select a team member to assign the deliverable.', 'error');
                return;
            }

            if (!deadlineRaw) {
                showToast('Please specify a target deadline.', 'error');
                return;
            }

            const deadlineDate = new Date(deadlineRaw);
            const minAllowedDate = new Date(Date.now() + 20 * 60 * 1000 - 30000); // 30s buffer
            if (deadlineDate < minAllowedDate) {
                showToast('Target deadline must be in the future (minimum 20 minutes from now).', 'error');
                return;
            }

            const deadline = deadlineDate.toISOString();

            try {
                await apiRequest('/tasks/', 'POST', {
                    title,
                    description,
                    assigned_to: Number(assigned_to) || assigned_to,
                    deadline,
                    society: user.team_id || null
                });

                taskForm.reset();
                setupDeadlineConstraint();
                await loadTasks('team_lead', user.team_id);
                await loadAnalytics('team_lead');
                showToast('Deliverable assigned to team member!');
            } catch (err) {
                showToast(err.message, 'error');
            }
        });
    }

    const triggerBtn = document.getElementById('triggerCronBtn');
    if (triggerBtn) {
        triggerBtn.addEventListener('click', async () => {
            try {
                try {
                    await apiRequest('/admin/trigger-cron-check/', 'POST');
                } catch (e) {
                    await apiRequest('/trigger-cron-check/', 'POST');
                }
                await loadNotifications('team_lead');
                await loadTasks('team_lead', user.team_id);
                await loadAnalytics('team_lead');
                showToast('Overdue check completed!');
            } catch (err) {
                showToast(err.message, 'error');
            }
        });
    }
}

async function loadTeamMemberDropdown() {
    const select = document.getElementById('assignTo');
    if (!select) return;

    try {
        const membersRes = await apiRequest('/members/');
        const members = unpackList(membersRes, 'members');
        select.innerHTML = '<option value="">-- Choose Team Member --</option>';

        const currentUser = getStoredUser();
        let addedCount = 0;
        members.forEach(m => {
            const socName = (m.team_name || (typeof m.society === 'object' ? m.society?.name : m.society) || '').toLowerCase();
            const rTitle = (m.role || m.position || '').toLowerCase();
            if (socName.includes('professional') || rTitle.includes('counsellor') || rTitle.includes('counselor') || rTitle.includes('advisor') || rTitle.includes('mentor')) {
                return;
            }
            // Disallow self-assignment
            if (currentUser && (m.id == currentUser.id || m.username == currentUser.username || m.name == currentUser.username || m.name == currentUser.name)) {
                return;
            }
            const opt = document.createElement('option');
            opt.value = m.id;
            opt.textContent = `${m.name || m.username}`;
            select.appendChild(opt);
            addedCount++;
        });

        if (addedCount === 0) {
            select.innerHTML = '<option value="">-- No other team members available --</option>';
        }
    } catch (err) {
        console.error('Failed to load team members from Django:', err);
    }
}

// 4. Member Dashboard
async function initMemberDashboard() {
    const user = getStoredUser();
    if (!user || normalizeRole(user.role, user) !== 'member') {
        window.location.href = './index.html';
        return;
    }

    const teamTitle = user.team_name ? `${user.team_name} Team` : 'IEEE CEAL';
    document.getElementById('memberName').textContent = user.username;
    document.getElementById('userAvatar').textContent = getInitials(user.username);
    document.getElementById('memberTeamBadge').textContent = `${teamTitle} Member`;
    document.getElementById('memberHeading').textContent = `My Deliverables`;
    document.getElementById('memberSubheading').textContent = `Assigned tasks for ${teamTitle}. Mark completed when delivered.`;
    document.getElementById('logoutBtn').addEventListener('click', logout);
    setupChangePasswordListeners();
    setupWorkflowModalListeners();
    checkFirstLoginPasswordPrompt(user);
    updateMobileDrawerProfile(user);
    initMobileWorkbenchView();

    await Promise.all([
        loadTasks('member', null),
        loadAnalytics('member'),
        loadNotifications('member')
    ]);
}

// 5. Shared Kanban Board
let currentLoadedCompletedTasks = [];
let isFinishedInlineExpanded = false;
let currentTasksRole = null;

async function loadTasks(role, teamFilter = null) {
    const pendingContainer = document.getElementById('pendingTasks');
    const completedContainer = document.getElementById('completedTasks');
    const pendingCount = document.getElementById('pendingCount');
    const completedCount = document.getElementById('completedCount');
    currentTasksRole = role;
    currentLoadedCompletedTasks = [];

    try {
        let endpoint = '/tasks/';
        const normRole = normalizeRole(role);
        if (normRole === 'superadmin' && teamFilter) {
            endpoint = `/tasks/?society=${teamFilter}&team_id=${teamFilter}`;
        } else if (normRole === 'team_lead' && teamFilter) {
            endpoint = `/tasks/?society=${teamFilter}&team_id=${teamFilter}`;
        }

        const responseData = await apiRequest(endpoint);
        if (!responseData) return;

        // Unpack DRF paginated 'results' or direct array
        const tasks = unpackList(responseData, 'tasks');

        pendingContainer.innerHTML = '';
        completedContainer.innerHTML = '';

        let pCount = 0;
        let cCount = 0;

        tasks.forEach(task => {
            // Normalize status (supports nested DRF object or plain slug string)
            const statusSlug = typeof task.status === 'object' && task.status !== null
                ? (task.status.slug || task.status.name || '').toLowerCase()
                : String(task.status || '').toLowerCase();

            const isCompleted = statusSlug === 'completed' || task.status?.is_completed === true;
            const isUnderReview = statusSlug === 'under_review';
            const isRework = statusSlug === 'rework';
            const isOverdue = !isCompleted && task.deadline && (new Date(task.deadline) < new Date());

            if (isCompleted) cCount++;
            else pCount++;

            // Extract nested foreign keys from Django serializers
            const assigneeName = task.assigned_to_name
                || (typeof task.assigned_to === 'object' ? (task.assigned_to?.name || task.assigned_to?.username) : null)
                || 'Member';

            const assignerName = task.assigned_by_name
                || (typeof task.assigned_by === 'object' ? (task.assigned_by?.name || task.assigned_by?.username) : null)
                || 'Lead';

            const teamLabel = task.team_name
                || task.society_name
                || (typeof task.society === 'object' ? task.society?.name : null);

            const card = document.createElement('div');
            card.className = `task-card ${isOverdue ? 'is-overdue' : ''} ${isCompleted ? 'is-completed' : ''} ${isUnderReview ? 'is-review' : ''}`;

            const formattedDate = task.deadline ? new Date(task.deadline).toLocaleDateString(undefined, {
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            }) : 'No deadline';

            const createdDateStr = task.created_at ? new Date(task.created_at).toLocaleDateString(undefined, {
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            }) : 'Recently';

            let statusBadge = '';
            if (isCompleted) {
                statusBadge = '<span class="badge badge-done"><span class="badge-dot"></span>DONE</span>';
            } else if (isUnderReview) {
                statusBadge = '<span class="badge badge-review"><i class="fa-solid fa-clock-rotate-left" style="margin-right: 0.25rem;"></i>UNDER REVIEW</span>';
            } else if (isRework) {
                statusBadge = '<span class="badge badge-rework"><i class="fa-solid fa-rotate-left" style="margin-right: 0.25rem;"></i>REWORK NEEDED</span>';
            } else if (isOverdue) {
                statusBadge = '<span class="badge badge-overdue"><span class="badge-dot"></span>OVERDUE</span>';
            }

            if (task.allow_reassign === false) {
                statusBadge += ' <span class="badge" style="background: rgba(100, 116, 139, 0.16); color: var(--text-tertiary); font-size: 0.68rem; margin-left: 0.35rem;" title="Leadership has restricted reassignment for this deliverable"><i class="fa-solid fa-lock" style="font-size: 0.62rem; margin-right: 0.25rem;"></i>Direct</span>';
            }

            // Rework feedback box if present
            const reworkHtml = task.rework_notes ? `
                <div class="rework-feedback-box">
                    <strong><i class="fa-solid fa-circle-info"></i> Rework Instructions:</strong>
                    <div style="margin-top: 0.2rem;">${escapeHtml(task.rework_notes)}</div>
                </div>
            ` : '';

            // Interactive action buttons depending on role & state
            let actionsHtml = '';
            const currentUser = getStoredUser();
            const currentUserId = currentUser?.id;
            const normRole = normalizeRole(role, currentUser);
            const isSuperAdmin = (normRole === 'superadmin');
            const isTaskCreator = Boolean(currentUserId && (task.assigned_by === currentUserId || currentUser?.username === task.assigned_by_name));
            const canReassign = isSuperAdmin || isTaskCreator || (task.allow_reassign !== false);

            if (!isCompleted) {
                if (isUnderReview) {
                    if (normRole === 'member') {
                        actionsHtml = `
                            <button class="btn btn-awaiting-verification btn-sm" disabled style="margin-top: 0.4rem; width: 100%; cursor: not-allowed; font-weight: 700; font-size: 0.78rem;">
                                <i class="fa-solid fa-hourglass-half" style="margin-right: 0.35rem;"></i> Submitted &bull; Awaiting Lead Verification
                            </button>
                        `;
                    } else {
                        // Superadmin & Team Lead Verification Prompt
                        const reassignBtn = canReassign ? `
                            <button class="btn btn-secondary btn-sm" onclick="openReassignModal(${task.id}, '${escapeHtml(task.title)}', ${task.assigned_to_id || 'null'}, ${task.society_id || 'null'}, '${role}')" style="font-size: 0.75rem; padding: 0.35rem 0.5rem; font-weight: 600;">
                                <i class="fa-solid fa-user-pen" style="margin-right: 0.25rem;"></i> Reassign
                            </button>
                        ` : '';
                        actionsHtml = `
                            <div class="review-prompt-box">
                                <div class="review-prompt-header">
                                    <i class="fa-solid fa-bell"></i>
                                    <span>${escapeHtml(assigneeName)} marked this completed!</span>
                                </div>
                                <div class="review-prompt-subtitle">
                                    Verify deliverable and officially close, request rework, or reassign:
                                </div>
                                <div class="review-prompt-actions">
                                    <button class="btn btn-success btn-sm" onclick="verifyAndCloseTask(${task.id}, '${escapeHtml(task.title)}', '${role}')" style="width: 100%; font-weight: 700;">
                                        <i class="fa-solid fa-circle-check" style="margin-right: 0.35rem;"></i> Verify & Close Task
                                    </button>
                                    <div class="review-secondary-actions" style="display: flex; gap: 0.35rem;">
                                        <button class="btn btn-warning btn-sm" onclick="openReworkModal(${task.id}, '${escapeHtml(task.title)}', '${escapeHtml(assigneeName)}', '${role}')" style="background: #f59e0b; color: white; border: none; font-size: 0.75rem; padding: 0.35rem 0.5rem; font-weight: 600; flex: 1;">
                                            <i class="fa-solid fa-rotate-left" style="margin-right: 0.25rem;"></i> Send for Rework
                                        </button>
                                        ${reassignBtn}
                                    </div>
                                </div>
                            </div>
                        `;
                    }
                } else if (isRework) {
                    if (normRole === 'member') {
                        actionsHtml = `
                            <button class="btn btn-primary btn-sm" onclick="completeTask(${task.id}, '${role}')" style="margin-top: 0.4rem; width: 100%; font-weight: 700;">
                                <i class="fa-solid fa-paper-plane" style="margin-right: 0.35rem;"></i> Resubmit Deliverable
                            </button>
                        `;
                    } else {
                        const reassignBtn = canReassign ? `
                            <button class="btn btn-secondary btn-sm" onclick="openReassignModal(${task.id}, '${escapeHtml(task.title)}', ${task.assigned_to_id || 'null'}, ${task.society_id || 'null'}, '${role}')" style="flex: 1; font-size: 0.75rem; padding: 0.35rem 0.5rem;">
                                <i class="fa-solid fa-user-pen" style="margin-right: 0.25rem;"></i> Reassign
                            </button>
                        ` : '';
                        actionsHtml = `
                            <div style="display: flex; gap: 0.35rem; margin-top: 0.35rem;">
                                ${reassignBtn}
                                <button class="btn btn-success btn-sm" onclick="verifyAndCloseTask(${task.id}, '${escapeHtml(task.title)}', '${role}')" style="flex: 1; font-size: 0.75rem; padding: 0.35rem 0.5rem;">
                                    <i class="fa-solid fa-circle-check" style="margin-right: 0.25rem;"></i> Close
                                </button>
                            </div>
                        `;
                    }
                } else {
                    // Normal pending or in_progress task
                    if (normRole === 'member') {
                        actionsHtml = `
                            <button class="btn btn-success btn-sm" onclick="completeTask(${task.id}, '${role}')" style="margin-top: 0.35rem; width: 100%; font-weight: 600;">
                                <i class="fa-solid fa-check" style="margin-right: 0.35rem;"></i> Mark as Completed
                            </button>
                        `;
                    } else {
                        const reassignBtn = canReassign ? `
                            <button class="btn btn-secondary btn-sm" onclick="openReassignModal(${task.id}, '${escapeHtml(task.title)}', ${task.assigned_to_id || 'null'}, ${task.society_id || 'null'}, '${role}')" style="font-size: 0.75rem; padding: 0.35rem 0.5rem;">
                                <i class="fa-solid fa-user-pen" style="margin-right: 0.25rem;"></i> Reassign
                            </button>
                        ` : '';
                        actionsHtml = `
                            <div style="display: flex; gap: 0.35rem; margin-top: 0.35rem;">
                                <button class="btn btn-success btn-sm" onclick="verifyAndCloseTask(${task.id}, '${escapeHtml(task.title)}', '${role}')" style="flex: 1; font-size: 0.75rem; padding: 0.35rem 0.5rem;">
                                    <i class="fa-solid fa-circle-check" style="margin-right: 0.25rem;"></i> Close
                                </button>
                                ${reassignBtn}
                            </div>
                        `;
                    }
                }
            } else {
                // Completed task actions (Reopen option for Superadmin, Admin, and assigned Team Lead)
                const user = getStoredUser();
                const userRole = user ? normalizeRole(user.role, user) : '';
                const userTeamId = user ? user.team_id : null;
                const userTeamName = user ? (user.team_name || '').toLowerCase() : '';

                let canReopen = false;
                if (userRole === 'superadmin' || userRole === 'admin') {
                    canReopen = true;
                } else if (userRole === 'team_lead') {
                    const taskSocName = (teamLabel || '').toLowerCase();
                    const taskSocId = task.society_id || task.team_id;
                    if (userTeamId && taskSocId && Number(userTeamId) === Number(taskSocId)) {
                        canReopen = true;
                    } else if (userTeamName && taskSocName && (taskSocName.includes(userTeamName) || userTeamName.includes(taskSocName))) {
                        canReopen = true;
                    } else if (task.assigned_by === user.id) {
                        canReopen = true;
                    }
                }

                if (canReopen) {
                    actionsHtml = `
                        <button type="button" class="btn btn-warning btn-sm" onclick="reopenDeliverable(${task.id})" style="margin-top: 0.35rem; width: 100%; font-weight: 700; font-size: 0.78rem; background: rgba(245, 158, 11, 0.15); color: #d97706; border: 1px solid rgba(245, 158, 11, 0.4);">
                            <i class="fa-solid fa-rotate-left" style="margin-right: 0.35rem;"></i> Reopen Deliverable
                        </button>
                    `;
                }
            }

            const canDelete = (role === 'superadmin' || role === 'admin' || role === 'team_lead');
            const deleteBtnHtml = canDelete ? `
                <button class="btn btn-ghost btn-sm" onclick="deleteTask(${task.id}, '${role}')" style="margin-top: 0.25rem; width: 100%; color: #dc2626; font-size: 0.74rem;">
                    Delete Deliverable
                </button>
            ` : '';

            // Audit info (who assigned to whom, creation time, and who closed the task)
            const closedByName = task.closed_by_name;
            const closedAtStr = task.closed_at ? new Date(task.closed_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
            
            let auditTrailHtml = '';
            if (isCompleted) {
                auditTrailHtml = `
                    <div class="task-audit-row">
                        <div class="task-created-tag">
                            <i class="fa-regular fa-calendar-plus" style="font-size: 0.68rem; color: var(--primary);"></i>
                            <span>Created: <strong>${createdDateStr}</strong></span>
                        </div>
                        <div class="task-assigned-tag">
                            <i class="fa-solid fa-arrow-right-arrow-left" style="font-size: 0.68rem; color: var(--text-tertiary);"></i>
                            <span>Assigned by <strong>${escapeHtml(assignerName)}</strong> to <strong>${escapeHtml(assigneeName)}</strong></span>
                        </div>
                        <div class="task-closed-tag">
                            <i class="fa-solid fa-circle-check"></i>
                            <span>Closed by <strong>${escapeHtml(closedByName || assignerName || 'Leadership')}</strong>${closedAtStr ? ` on ${closedAtStr}` : ''}</span>
                        </div>
                    </div>
                `;
            } else {
                auditTrailHtml = `
                    <div class="task-audit-row">
                        <div class="task-created-tag">
                            <i class="fa-regular fa-calendar-plus" style="font-size: 0.68rem; color: var(--primary);"></i>
                            <span>Created: <strong>${createdDateStr}</strong></span>
                        </div>
                        <div class="task-assigned-tag">
                            <i class="fa-solid fa-user-tag" style="font-size: 0.7rem; color: var(--text-tertiary);"></i>
                            <span>Assigned by <strong>${escapeHtml(assignerName)}</strong> to <strong>${escapeHtml(assigneeName)}</strong></span>
                        </div>
                    </div>
                `;
            }

            card.innerHTML = `
                <div>${teamLabel ? `<span class="team-pill" style="margin-bottom: 0.35rem; display: inline-block;">${escapeHtml(teamLabel)}</span>` : ''}</div>
                <div class="card-top">
                    <h4 class="task-title">${escapeHtml(task.title)}</h4>
                    ${statusBadge}
                </div>
                <div class="task-desc">${escapeHtml(task.description || 'No detailed instructions.')}</div>
                ${reworkHtml}
                <div class="card-footer">
                    <div class="meta-row">
                        <span><i class="fa-regular fa-clock" style="margin-right: 0.25rem;"></i>Due: <strong>${formattedDate}</strong></span>
                        <span class="deadline-text ${isOverdue ? 'overdue' : ''}">${isCompleted ? 'Finished' : (isOverdue ? 'Overdue' : 'Active')}</span>
                    </div>
                    ${auditTrailHtml}
                </div>
                ${actionsHtml}
                ${deleteBtnHtml}
            `;

            if (isCompleted) {
                currentLoadedCompletedTasks.push({
                    id: task.id,
                    title: task.title,
                    description: task.description,
                    deadline: task.deadline,
                    created_at: task.created_at,
                    createdDateStr: createdDateStr,
                    closed_at: task.closed_at,
                    closedByName: closedByName,
                    closedAtStr: closedAtStr,
                    assigneeName: assigneeName,
                    assignerName: assignerName,
                    teamLabel: teamLabel,
                    formattedDate: formattedDate,
                    cardHtml: card.innerHTML,
                    raw: task
                });
            } else {
                pendingContainer.appendChild(card);
            }
        });

        if (pCount === 0) {
            pendingContainer.innerHTML = '<div style="color: var(--text-tertiary); font-size: 0.85rem; padding: 2rem 0; text-align: center;">No pending tasks. You\'re all caught up!</div>';
        }

        if (pendingCount) pendingCount.textContent = pCount;

        renderCompletedTasksColumn(role);

    } catch (err) {
        console.error('Failed to load tasks from Django:', err);
    }
}

function renderCompletedTasksColumn(role) {
    const completedContainer = document.getElementById('completedTasks');
    const completedCount = document.getElementById('completedCount');
    const headerViewAllBtn = document.getElementById('finishedHeaderViewAllBtn');
    if (!completedContainer) return;

    const totalCount = currentLoadedCompletedTasks.length;
    if (completedCount) completedCount.textContent = totalCount;

    if (headerViewAllBtn) {
        headerViewAllBtn.style.display = totalCount > 0 ? 'inline-flex' : 'none';
    }

    if (totalCount === 0) {
        completedContainer.innerHTML = '<div style="color: var(--text-tertiary); font-size: 0.85rem; padding: 2rem 0; text-align: center;">No finished deliverables yet.</div>';
        return;
    }

    const latest = currentLoadedCompletedTasks[0];
    const previewHtml = latest ? `
        <div class="finished-recent-preview">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
                <span style="font-weight: 700; color: var(--text-primary);"><i class="fa-solid fa-clock-rotate-left" style="color: #10b981; font-size: 0.72rem; margin-right: 0.25rem;"></i> Latest: ${escapeHtml(latest.title)}</span>
                <span class="badge badge-done" style="font-size: 0.62rem; padding: 0.1rem 0.35rem;">DONE</span>
            </div>
            <div style="font-size: 0.73rem; color: var(--text-secondary); line-height: 1.35;">
                Created: <strong>${latest.createdDateStr || 'Recently'}</strong> &bull; Assigned to <strong>${escapeHtml(latest.assigneeName)}</strong> by <strong>${escapeHtml(latest.assignerName)}</strong>
            </div>
            ${latest.closedByName ? `<div style="font-size: 0.7rem; color: #059669; margin-top: 0.2rem;"><i class="fa-solid fa-check"></i> Closed by ${escapeHtml(latest.closedByName)}</div>` : ''}
        </div>
    ` : '';

    completedContainer.innerHTML = `
        <div class="finished-collapsed-box">
            <div class="finished-summary-row">
                <div class="finished-summary-icon">
                    <i class="fa-solid fa-circle-check"></i>
                </div>
                <div class="finished-summary-text">
                    <h4>${totalCount} Finished Deliverables</h4>
                    <p>All verified & closed tasks archived</p>
                </div>
            </div>

            ${previewHtml}

            <button type="button" class="btn btn-primary btn-sm" onclick="openAllFinishedDeliverablesModal()" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 0.45rem; font-weight: 700; padding: 0.55rem 0.85rem; box-shadow: 0 2px 8px rgba(16, 185, 129, 0.25);">
                <i class="fa-solid fa-layer-group"></i> View All (${totalCount}) Tasks
            </button>
        </div>
    `;
}

window.toggleFinishedDeliverablesInline = function() {
    openAllFinishedDeliverablesModal();
};

window.openAllFinishedDeliverablesModal = function() {
    const modal = document.getElementById('allFinishedDeliverablesModal');
    if (!modal) return;

    modal.classList.add('active');

    const countPill = document.getElementById('allFinishedModalCountPill');
    if (countPill) countPill.textContent = `${currentLoadedCompletedTasks.length} Completed`;

    const socFilterWrap = document.getElementById('allFinishedSocietyFilterWrap');
    const socSelect = document.getElementById('allFinishedSocietyFilter');
    if (socFilterWrap && socSelect) {
        const user = getStoredUser();
        const role = user ? normalizeRole(user.role, user) : '';
        if (role === 'superadmin') {
            socFilterWrap.style.display = 'block';
            const uniqueTeams = Array.from(new Set(currentLoadedCompletedTasks.map(t => t.teamLabel).filter(Boolean))).sort();
            socSelect.innerHTML = '<option value="">All Societies & Teams</option>';
            uniqueTeams.forEach(t => {
                const opt = document.createElement('option');
                opt.value = t;
                opt.textContent = t;
                socSelect.appendChild(opt);
            });
        } else {
            socFilterWrap.style.display = 'none';
        }
    }

    const searchInput = document.getElementById('allFinishedSearchInput');
    if (searchInput) {
        searchInput.value = '';
    }

    filterAllFinishedModalList();
};

window.closeAllFinishedDeliverablesModal = function() {
    const modal = document.getElementById('allFinishedDeliverablesModal');
    if (modal) modal.classList.remove('active');
};

if (typeof document !== 'undefined') {
    document.addEventListener('click', (e) => {
        const modal = document.getElementById('allFinishedDeliverablesModal');
        if (modal && e.target === modal) {
            closeAllFinishedDeliverablesModal();
        }
    });
}

window.filterAllFinishedModalList = function() {
    const listContainer = document.getElementById('allFinishedModalList');
    if (!listContainer) return;

    const searchInput = document.getElementById('allFinishedSearchInput');
    const query = searchInput ? searchInput.value.toLowerCase().trim() : '';

    const socSelect = document.getElementById('allFinishedSocietyFilter');
    const selectedSoc = socSelect ? socSelect.value : '';

    const filtered = currentLoadedCompletedTasks.filter(item => {
        const titleMatch = (item.title || '').toLowerCase().includes(query);
        const descMatch = (item.description || '').toLowerCase().includes(query);
        const assigneeMatch = (item.assigneeName || '').toLowerCase().includes(query);
        const assignerMatch = (item.assignerName || '').toLowerCase().includes(query);
        const closedByMatch = (item.closedByName || '').toLowerCase().includes(query);
        const textMatch = !query || titleMatch || descMatch || assigneeMatch || assignerMatch || closedByMatch;

        const socMatch = !selectedSoc || (item.teamLabel === selectedSoc);
        return textMatch && socMatch;
    });

    if (filtered.length === 0) {
        listContainer.innerHTML = `
            <div style="text-align: center; padding: 3rem 1rem; color: var(--text-tertiary);">
                <i class="fa-solid fa-magnifying-glass" style="font-size: 2rem; margin-bottom: 0.75rem; opacity: 0.5;"></i>
                <div style="font-size: 0.95rem; font-weight: 700; color: var(--text-secondary);">No finished deliverables match your filter.</div>
                <div style="font-size: 0.78rem; margin-top: 0.25rem;">Try adjusting your search terms or chapter filter.</div>
            </div>
        `;
        return;
    }

    listContainer.innerHTML = '';
    filtered.forEach(task => {
        const itemEl = document.createElement('div');
        itemEl.className = 'finished-task-item';

        let timingBadge = '';
        if (task.deadline && task.closed_at) {
            const dDate = new Date(task.deadline);
            const cDate = new Date(task.closed_at);
            const diffHours = (cDate - dDate) / (1000 * 60 * 60);

            if (diffHours < -2) {
                timingBadge = '<span class="badge" style="background: rgba(16, 185, 129, 0.15); color: #059669; font-weight: 700; font-size: 0.68rem;"><i class="fa-solid fa-check"></i> Before Deadline</span>';
            } else if (diffHours <= 2) {
                timingBadge = '<span class="badge" style="background: rgba(14, 165, 233, 0.15); color: #0284c7; font-weight: 700; font-size: 0.68rem;"><i class="fa-solid fa-calendar-check"></i> On Deadline</span>';
            } else {
                timingBadge = '<span class="badge" style="background: rgba(245, 158, 11, 0.15); color: #d97706; font-weight: 700; font-size: 0.68rem;"><i class="fa-solid fa-clock-rotate-left"></i> After Deadline</span>';
            }
        } else {
            timingBadge = '<span class="badge badge-done" style="font-size: 0.68rem;">Finished</span>';
        }

        const user = getStoredUser();
        const userRole = user ? normalizeRole(user.role, user) : '';
        const userTeamId = user ? user.team_id : null;
        const userTeamName = user ? (user.team_name || '').toLowerCase() : '';

        // Superadmin and Admin can reopen any task; Team Lead can reopen their team's tasks
        let canReopen = false;
        if (userRole === 'superadmin' || userRole === 'admin') {
            canReopen = true;
        } else if (userRole === 'team_lead') {
            const taskSocName = (task.teamLabel || '').toLowerCase();
            const taskSocId = task.society_id || task.team_id;
            if (userTeamId && taskSocId && Number(userTeamId) === Number(taskSocId)) {
                canReopen = true;
            } else if (userTeamName && taskSocName && (taskSocName.includes(userTeamName) || userTeamName.includes(taskSocName))) {
                canReopen = true;
            } else if (task.assigned_by === user?.id) {
                canReopen = true;
            }
        }

        const reopenBtn = canReopen ? `
            <button type="button" class="btn btn-warning btn-xs" onclick="reopenDeliverable(${task.id})" style="background: rgba(245, 158, 11, 0.15); color: #d97706; border: 1px solid rgba(245, 158, 11, 0.35); font-weight: 700; font-size: 0.72rem; padding: 0.2rem 0.55rem; border-radius: var(--radius-sm); display: flex; align-items: center; gap: 0.3rem;" title="Reopen deliverable and move back to In-Progress">
                <i class="fa-solid fa-rotate-left"></i> Reopen
            </button>
        ` : '';

        const canDelete = (currentTasksRole === 'superadmin' || currentTasksRole === 'admin' || currentTasksRole === 'team_lead');
        const deleteBtn = canDelete ? `
            <button type="button" class="btn btn-ghost btn-xs" onclick="deleteTaskFromModal(${task.id})" style="color: #dc2626; font-size: 0.72rem; padding: 0.2rem 0.5rem;" title="Delete deliverable">
                <i class="fa-solid fa-trash"></i> Delete
            </button>
        ` : '';

        itemEl.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; flex-wrap: wrap;">
                <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                    ${task.teamLabel ? `<span class="team-pill">${escapeHtml(task.teamLabel)}</span>` : ''}
                    <h4 style="margin: 0; font-size: 0.98rem; font-weight: 800; color: var(--text-primary);">${escapeHtml(task.title)}</h4>
                </div>
                <div style="display: flex; align-items: center; gap: 0.45rem; flex-wrap: wrap;">
                    <span class="badge badge-done"><i class="fa-solid fa-circle-check"></i> DONE</span>
                    ${reopenBtn}
                    ${deleteBtn}
                </div>
            </div>

            <div style="font-size: 0.82rem; color: var(--text-secondary); line-height: 1.45; margin: 0.2rem 0;">
                ${escapeHtml(task.description || 'No detailed instructions provided.')}
            </div>

            <div class="finished-audit-grid">
                <div class="finished-audit-item">
                    <i class="fa-regular fa-calendar-plus" style="color: var(--primary);"></i>
                    <div>
                        <div style="font-size: 0.7rem; color: var(--text-tertiary); text-transform: uppercase; font-weight: 700; letter-spacing: 0.03em;">Created On</div>
                        <div class="audit-val" style="color: var(--text-primary); font-size: 0.82rem;">${task.createdDateStr || 'Recently'}</div>
                    </div>
                </div>

                <div class="finished-audit-item">
                    <i class="fa-solid fa-user-check" style="color: #0284c7;"></i>
                    <div>
                        <div style="font-size: 0.7rem; color: var(--text-tertiary); text-transform: uppercase; font-weight: 700; letter-spacing: 0.03em;">Assigned Member</div>
                        <div class="audit-val" style="color: var(--text-primary); font-size: 0.82rem;">${escapeHtml(task.assigneeName)}</div>
                    </div>
                </div>

                <div class="finished-audit-item">
                    <i class="fa-solid fa-user-tie" style="color: #8b5cf6;"></i>
                    <div>
                        <div style="font-size: 0.7rem; color: var(--text-tertiary); text-transform: uppercase; font-weight: 700; letter-spacing: 0.03em;">Assigned By (Lead)</div>
                        <div class="audit-val" style="color: var(--text-primary); font-size: 0.82rem;">${escapeHtml(task.assignerName)}</div>
                    </div>
                </div>

                <div class="finished-audit-item">
                    <i class="fa-solid fa-circle-check" style="color: #10b981;"></i>
                    <div>
                        <div style="font-size: 0.7rem; color: var(--text-tertiary); text-transform: uppercase; font-weight: 700; letter-spacing: 0.03em;">Verified & Closed By</div>
                        <div class="audit-val" style="color: #059669; font-size: 0.82rem;">
                            ${escapeHtml(task.closedByName || task.assignerName || 'Leadership')}
                            <span style="font-size: 0.72rem; color: var(--text-tertiary); font-weight: normal;">${task.closedAtStr ? `(${task.closedAtStr})` : ''}</span>
                        </div>
                    </div>
                </div>

                <div class="finished-audit-item">
                    <i class="fa-regular fa-calendar-check" style="color: var(--text-tertiary);"></i>
                    <div>
                        <div style="font-size: 0.7rem; color: var(--text-tertiary); text-transform: uppercase; font-weight: 700; letter-spacing: 0.03em;">Deadline & Timing</div>
                        <div style="display: flex; align-items: center; gap: 0.35rem; font-size: 0.8rem;">
                            <span>${task.formattedDate}</span>
                            ${timingBadge}
                        </div>
                    </div>
                </div>
            </div>
        `;
        listContainer.appendChild(itemEl);
    });
};

window.deleteTaskFromModal = async function(taskId) {
    if (!confirm(`Are you sure you want to permanently delete deliverable #${taskId}?`)) return;
    try {
        try {
            await apiRequest(`/tasks/${taskId}/`, 'DELETE');
        } catch (e) {
            await apiRequest(`/workbench/tasks/${taskId}/`, 'DELETE');
        }
        showToast('Deliverable deleted successfully.');
        currentLoadedCompletedTasks = currentLoadedCompletedTasks.filter(t => t.id !== taskId);
        filterAllFinishedModalList();
        renderCompletedTasksColumn(currentTasksRole);
    } catch (err) {
        showToast(err.message, 'error');
    }
};

window.reopenDeliverable = async function(taskId) {
    const reason = prompt("Enter a note or reason for reopening this deliverable (optional):", "");
    if (reason === null) return; // User clicked Cancel

    try {
        let res;
        try {
            res = await apiRequest(`/tasks/${taskId}/reopen/`, 'POST', { notes: reason });
        } catch (e) {
            res = await apiRequest(`/workbench/tasks/${taskId}/reopen/`, 'POST', { notes: reason });
        }

        showToast(`Deliverable #${taskId} reopened successfully and moved back to In-Progress.`);
        const user = getStoredUser();
        const role = user ? normalizeRole(user.role, user) : 'superadmin';
        const teamFilter = (role === 'team_lead') ? user.team_id : (window.superAdminCurrentTeamFilter || null);

        await Promise.all([
            loadTasks(role, teamFilter),
            loadAnalytics(role, teamFilter),
            loadNotifications(role)
        ]);

        const modal = document.getElementById('allFinishedDeliverablesModal');
        if (modal && modal.classList.contains('active')) {
            filterAllFinishedModalList();
        }
    } catch (err) {
        showToast(err.message, 'error');
    }
};

window.deleteTask = async function(taskId, role) {
    if (!confirm(`Are you sure you want to permanently delete deliverable #${taskId}?`)) return;
    try {
        try {
            await apiRequest(`/tasks/${taskId}/`, 'DELETE');
        } catch (e) {
            await apiRequest(`/workbench/tasks/${taskId}/`, 'DELETE');
        }
        showToast('Deliverable deleted successfully.');
        const user = getStoredUser();
        const normRole = normalizeRole(role, user);
        if (normRole === 'superadmin' || normRole === 'admin') {
            await loadTasks(normRole, superAdminCurrentTeamFilter);
            await loadAnalytics(normRole, superAdminCurrentTeamFilter);
            await loadNotifications(normRole);
        } else if (normRole === 'team_lead') {
            await loadTasks('team_lead', user?.team_id);
            await loadAnalytics('team_lead');
            await loadNotifications('team_lead');
        } else {
            await loadTasks('member', null);
            await loadAnalytics('member');
        }
    } catch (err) {
        showToast(err.message, 'error');
    }
};

window.completeTask = async function(taskId, role) {
    try {
        let res = null;
        try {
            res = await apiRequest(`/tasks/${taskId}/complete/`, 'POST');
        } catch (e) {
            try {
                res = await apiRequest(`/workbench/tasks/${taskId}/complete/`, 'POST');
            } catch (e2) {
                res = await apiRequest(`/tasks/${taskId}/`, 'PATCH', { status: 'under_review' });
            }
        }

        if (res && res.is_submitted) {
            showToast('Deliverable marked as completed! Lead notified to verify.');
        } else {
            showToast(res?.message || 'Deliverable marked as completed!');
        }

        const user = getStoredUser();
        const normRole = normalizeRole(role, user);
        if (normRole === 'superadmin' || normRole === 'admin') {
            await loadTasks(normRole, superAdminCurrentTeamFilter);
            await loadAnalytics(normRole, superAdminCurrentTeamFilter);
            await loadNotifications(normRole);
        } else if (normRole === 'team_lead') {
            await loadTasks('team_lead', user?.team_id);
            await loadAnalytics('team_lead');
            await loadNotifications('team_lead');
        } else {
            await loadTasks('member', null);
            await loadAnalytics('member');
        }
    } catch (err) {
        showToast(err.message, 'error');
    }
};

window.verifyAndCloseTask = async function(taskId, taskTitle, role) {
    if (!confirm(`Verify deliverable "${taskTitle}" and officially close it as completed?`)) return;

    try {
        let res = null;
        try {
            res = await apiRequest(`/tasks/${taskId}/complete/`, 'POST');
        } catch (e) {
            res = await apiRequest(`/workbench/tasks/${taskId}/complete/`, 'POST');
        }

        showToast(res?.message || 'Deliverable verified and closed successfully!');
        const user = getStoredUser();
        const normRole = normalizeRole(role, user);
        if (normRole === 'superadmin' || normRole === 'admin') {
            await loadTasks(normRole, superAdminCurrentTeamFilter);
            await loadAnalytics(normRole, superAdminCurrentTeamFilter);
            await loadNotifications(normRole);
        } else if (normRole === 'team_lead') {
            await loadTasks('team_lead', user?.team_id);
            await loadAnalytics('team_lead');
            await loadNotifications('team_lead');
        } else {
            await loadTasks('member', null);
            await loadAnalytics('member');
        }
    } catch (err) {
        showToast(err.message, 'error');
    }
};

window.openReworkModal = function(taskId, taskTitle, assigneeName, role) {
    const modal = document.getElementById('reworkModal');
    if (!modal) return;
    const idField = document.getElementById('reworkTaskId');
    const roleField = document.getElementById('reworkRole');
    const titleField = document.getElementById('reworkTaskTitle');
    const assigneeField = document.getElementById('reworkTaskAssignee');
    const notesInput = document.getElementById('reworkNotesInput');

    if (idField) idField.value = taskId;
    if (roleField) roleField.value = role;
    if (titleField) titleField.textContent = taskTitle;
    if (assigneeField) assigneeField.textContent = assigneeName;
    if (notesInput) notesInput.value = '';

    modal.classList.add('active');
};

window.closeReworkModal = function() {
    const modal = document.getElementById('reworkModal');
    if (modal) modal.classList.remove('active');
};

window.openReassignModal = async function(taskId, taskTitle, currentAssigneeId, teamId, role) {
    const modal = document.getElementById('reassignModal');
    if (!modal) return;
    const idField = document.getElementById('reassignTaskId');
    const roleField = document.getElementById('reassignRole');
    const titleField = document.getElementById('reassignTaskTitle');
    const noteInput = document.getElementById('reassignNoteInput');

    if (idField) idField.value = taskId;
    if (roleField) roleField.value = role;
    if (titleField) titleField.textContent = taskTitle;
    if (noteInput) noteInput.value = '';

    await populateReassignDropdown(currentAssigneeId, teamId, role);
    modal.classList.add('active');
};

window.closeReassignModal = function() {
    const modal = document.getElementById('reassignModal');
    if (modal) modal.classList.remove('active');
};

async function populateReassignDropdown(currentAssigneeId, teamId, role) {
    const select = document.getElementById('reassignSelectAssignee');
    if (!select) return;
    select.innerHTML = '<option value="">-- Choose New Assignee --</option>';

    try {
        let membersRes = null;
        if (role === 'team_lead' && teamId) {
            try {
                membersRes = await apiRequest(`/members/?society=${teamId}`);
            } catch (e) {
                membersRes = await apiRequest('/members/');
            }
        } else {
            membersRes = await apiRequest('/members/');
        }

        const members = unpackList(membersRes, 'members');
        const currentUser = getStoredUser();
        members.forEach(m => {
            if (currentAssigneeId && m.id == currentAssigneeId) return;
            // Disallow self-assignment
            if (currentUser && (m.id == currentUser.id || m.username == currentUser.username || m.name == currentUser.username || m.name == currentUser.name)) {
                return;
            }
            const socName = (m.team_name || (typeof m.society === 'object' ? m.society?.name : m.society) || '').toLowerCase();
            const rTitle = (m.role || m.position || '').toLowerCase();
            if (socName.includes('professional') || rTitle.includes('counsellor') || rTitle.includes('counselor') || rTitle.includes('advisor') || rTitle.includes('mentor')) {
                return;
            }
            const opt = document.createElement('option');
            opt.value = m.id;
            const teamName = m.team_name || (typeof m.society === 'object' ? m.society?.name : m.society);
            const teamTag = teamName ? `[${teamName}] ` : '';
            opt.textContent = `${teamTag}${m.name || m.username}`;
            select.appendChild(opt);
        });
    } catch (err) {
        console.error('Failed to populate reassign dropdown:', err);
    }
}

function setupWorkflowModalListeners() {
    const reworkForm = document.getElementById('reworkModalForm');
    if (reworkForm && !reworkForm._bound) {
        reworkForm._bound = true;
        reworkForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const taskId = document.getElementById('reworkTaskId').value;
            const role = document.getElementById('reworkRole').value;
            const notes = document.getElementById('reworkNotesInput').value.trim();

            if (!notes) {
                showToast('Please provide feedback notes for rework.', 'error');
                return;
            }

            try {
                try {
                    await apiRequest(`/tasks/${taskId}/rework/`, 'POST', { notes });
                } catch (e1) {
                    await apiRequest(`/workbench/tasks/${taskId}/rework/`, 'POST', { notes });
                }

                closeReworkModal();
                showToast('Deliverable sent back for rework!');
                const user = getStoredUser();
                const normRole = normalizeRole(role, user);
                if (normRole === 'superadmin') {
                    await loadTasks('superadmin', superAdminCurrentTeamFilter);
                    await loadAnalytics('superadmin', superAdminCurrentTeamFilter);
                    await loadNotifications('superadmin');
                } else if (normRole === 'team_lead') {
                    await loadTasks('team_lead', user?.team_id);
                    await loadAnalytics('team_lead');
                    await loadNotifications('team_lead');
                } else {
                    await loadTasks('member', null);
                    await loadAnalytics('member');
                }
            } catch (err) {
                showToast(err.message, 'error');
            }
        });
    }

    const reassignForm = document.getElementById('reassignModalForm');
    if (reassignForm && !reassignForm._bound) {
        reassignForm._bound = true;
        reassignForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const taskId = document.getElementById('reassignTaskId').value;
            const role = document.getElementById('reassignRole').value;
            const new_assignee_id = document.getElementById('reassignSelectAssignee').value;
            const note = document.getElementById('reassignNoteInput').value.trim();

            if (!new_assignee_id) {
                showToast('Please select a member to reassign this deliverable to.', 'error');
                return;
            }

            try {
                try {
                    await apiRequest(`/tasks/${taskId}/reassign/`, 'POST', { new_assignee_id: Number(new_assignee_id), note });
                } catch (e1) {
                    await apiRequest(`/workbench/tasks/${taskId}/reassign/`, 'POST', { new_assignee_id: Number(new_assignee_id), note });
                }

                closeReassignModal();
                showToast('Deliverable reassigned successfully!');
                const user = getStoredUser();
                const normRole = normalizeRole(role, user);
                if (normRole === 'superadmin') {
                    await loadTasks('superadmin', superAdminCurrentTeamFilter);
                    await loadAnalytics('superadmin', superAdminCurrentTeamFilter);
                    await loadNotifications('superadmin');
                } else if (normRole === 'team_lead') {
                    await loadTasks('team_lead', user?.team_id);
                    await loadAnalytics('team_lead');
                    await loadNotifications('team_lead');
                } else {
                    await loadTasks('member', null);
                    await loadAnalytics('member');
                }
            } catch (err) {
                showToast(err.message, 'error');
            }
        });
    }

    // Broadcast Form Listener (Superadmin)
    const broadcastForm = document.getElementById('broadcastModalForm');
    if (broadcastForm && !broadcastForm._bound) {
        broadcastForm._bound = true;
        broadcastForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const target_type = document.getElementById('broadcastTargetType').value;
            const target_id = target_type !== 'all' ? document.getElementById('broadcastTargetId').value : null;
            const message = document.getElementById('broadcastMessageText').value.trim();

            if (!message) {
                showToast('Please enter message content.', 'error');
                return;
            }

            try {
                const res = await apiRequest('/messages/', 'POST', {
                    target_type,
                    target_id: target_id ? Number(target_id) : null,
                    message
                });
                closeBroadcastModal();
                broadcastForm.reset();
                showToast(res?.message || 'Broadcast message dispatched successfully!');
                const user = getStoredUser();
                await loadNotifications(user ? normalizeRole(user.role, user) : 'superadmin');
            } catch (err) {
                showToast(err.message, 'error');
            }
        });
    }

    // Team Message Form Listener (Team Lead)
    const teamMessageForm = document.getElementById('teamMessageModalForm');
    if (teamMessageForm && !teamMessageForm._bound) {
        teamMessageForm._bound = true;
        teamMessageForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const target_type = document.getElementById('teamMessageTargetType').value;
            const target_id = target_type === 'member' ? document.getElementById('teamMessageMemberId').value : null;
            const message = document.getElementById('teamMessageText').value.trim();

            if (!message) {
                showToast('Please enter message content.', 'error');
                return;
            }

            try {
                const res = await apiRequest('/messages/', 'POST', {
                    target_type,
                    target_id: target_id ? Number(target_id) : null,
                    message
                });
                closeTeamMessageModal();
                teamMessageForm.reset();
                showToast(res?.message || 'Team message sent successfully!');
                const user = getStoredUser();
                await loadNotifications(user ? normalizeRole(user.role, user) : 'team_lead');
            } catch (err) {
                showToast(err.message, 'error');
            }
        });
    }
}

// Messaging & Broadcast
window.openBroadcastModal = async function() {
    const modal = document.getElementById('broadcastModal');
    if (!modal) return;
    await populateBroadcastTargets();
    modal.classList.add('active');
};

window.closeBroadcastModal = function() {
    const modal = document.getElementById('broadcastModal');
    if (modal) modal.classList.remove('active');
};

async function populateBroadcastTargets() {
    const select = document.getElementById('broadcastTargetId');
    if (!select) return;
    select.innerHTML = '';

    try {
        const [teamsRes, usersRes] = await Promise.all([
            apiRequest('/teams/'),
            apiRequest('/users/')
        ]);
        const teams = unpackList(teamsRes, 'teams');
        const users = unpackList(usersRes, 'users');

        select._teams = teams || [];
        select._users = users || [];
        handleBroadcastTargetChange();
    } catch (e) {
        console.error('Failed to load broadcast targets:', e);
    }
}

window.handleBroadcastTargetChange = function() {
    const typeSelect = document.getElementById('broadcastTargetType');
    const targetGroup = document.getElementById('broadcastTargetIdGroup');
    const targetLabel = document.getElementById('broadcastTargetIdLabel');
    const targetSelect = document.getElementById('broadcastTargetId');
    if (!typeSelect || !targetGroup || !targetSelect) return;

    const val = typeSelect.value;
    targetSelect.innerHTML = '';

    if (val === 'all') {
        targetGroup.style.display = 'none';
        targetSelect.removeAttribute('required');
        return;
    }

    targetGroup.style.display = 'block';
    targetSelect.setAttribute('required', 'required');

    const teams = targetSelect._teams || [];
    const users = targetSelect._users || [];

    if (val === 'society') {
        targetLabel.textContent = 'Select Society / Chapter *';
        const socs = teams.filter(t => (t.kind === 'society' || ['cs', 'embs', 'pes', 'pels', 'ras', 'wie', 'sps', 'ias'].includes((t.name || '').toLowerCase())));
        socs.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.id;
            opt.textContent = s.display_name || `${s.name} Chapter`;
            targetSelect.appendChild(opt);
        });
    } else if (val === 'team') {
        targetLabel.textContent = 'Select Student Branch Team *';
        const sbTeams = teams.filter(t => (t.kind === 'team' || !['cs', 'embs', 'pes', 'pels', 'ras', 'wie', 'sps', 'ias', 'ieee sb ceal'].includes((t.name || '').toLowerCase())));
        sbTeams.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t.id;
            opt.textContent = t.display_name || `${t.name} Team`;
            targetSelect.appendChild(opt);
        });
    } else if (val === 'member') {
        targetLabel.textContent = 'Select Execom Member *';
        users.forEach(u => {
            const opt = document.createElement('option');
            opt.value = u.id;
            const teamTag = u.team_name ? `[${u.team_name}] ` : '';
            opt.textContent = `${teamTag}${u.name || u.username} (${u.position || u.role || 'Member'})`;
            targetSelect.appendChild(opt);
        });
    }
};

window.openTeamMessageModal = async function() {
    const modal = document.getElementById('teamMessageModal');
    if (!modal) return;
    await populateTeamMessageMembers();
    modal.classList.add('active');
};

window.closeTeamMessageModal = function() {
    const modal = document.getElementById('teamMessageModal');
    if (modal) modal.classList.remove('active');
};

async function populateTeamMessageMembers() {
    const memberSelect = document.getElementById('teamMessageMemberId');
    if (!memberSelect) return;
    memberSelect.innerHTML = '';

    try {
        const membersRes = await apiRequest('/members/');
        const members = unpackList(membersRes, 'members');
        const currentUser = getStoredUser();

        members.forEach(m => {
            if (currentUser && m.id == currentUser.id) return;
            const opt = document.createElement('option');
            opt.value = m.id;
            opt.textContent = `${m.name || m.username} (${m.role || m.position || 'Member'})`;
            memberSelect.appendChild(opt);
        });
    } catch (e) {
        console.error('Failed to populate team members for message:', e);
    }
}

window.handleTeamMessageTargetChange = function() {
    const typeSelect = document.getElementById('teamMessageTargetType');
    const memberGroup = document.getElementById('teamMessageMemberGroup');
    const memberSelect = document.getElementById('teamMessageMemberId');
    if (!typeSelect || !memberGroup || !memberSelect) return;

    if (typeSelect.value === 'member') {
        memberGroup.style.display = 'block';
        memberSelect.setAttribute('required', 'required');
    } else {
        memberGroup.style.display = 'none';
        memberSelect.removeAttribute('required');
    }
};

// 6. Notifications Loader
async function loadNotifications(role) {
    const container = document.getElementById('notificationsContainer');
    const badge = document.getElementById('notifCountBadge');
    const headerBadge = document.getElementById('headerNotifBadge');
    const dropdownCount = document.getElementById('notifDropdownCount');
    const dropdownList = document.getElementById('headerNotifList');

    try {
        let notifRes = null;
        try {
            notifRes = await apiRequest('/notifications/');
        } catch (e) {
            notifRes = await apiRequest('/task-notifications/');
        }

        const list = unpackList(notifRes, 'notifications');
        const unreadCount = list ? list.filter(n => !n.is_read).length : 0;

        // 1. Update Header Bell Badge & Dropdown Count
        if (headerBadge) {
            headerBadge.textContent = unreadCount;
            headerBadge.style.display = unreadCount > 0 ? 'inline-block' : 'none';
        }
        if (dropdownCount) {
            dropdownCount.textContent = unreadCount;
        }

        // 2. Populate Header Dropdown List
        if (dropdownList) {
            if (!list || list.length === 0) {
                dropdownList.innerHTML = `
                    <div style="padding: 2.25rem 1rem; text-align: center; color: var(--text-tertiary); font-size: 0.82rem;">
                        <i class="fa-regular fa-bell-slash" style="font-size: 1.6rem; margin-bottom: 0.6rem; opacity: 0.45; display: block;"></i>
                        No notifications yet. You're all caught up!
                    </div>
                `;
            } else {
                dropdownList.innerHTML = '';
                list.forEach(item => {
                    const el = document.createElement('div');
                    el.className = `notif-item ${!item.is_read ? 'is-unread' : ''}`;
                    const timeStr = item.created_at ? new Date(item.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
                    
                    let iconHtml = '<i class="fa-solid fa-bell"></i>';
                    const msgLower = (item.message || '').toLowerCase();
                    if (msgLower.includes('broadcast') || msgLower.includes('message')) {
                        iconHtml = '<i class="fa-solid fa-bullhorn" style="color: #0284c7;"></i>';
                    } else if (msgLower.includes('assigned')) {
                        iconHtml = '<i class="fa-solid fa-thumbtack" style="color: #6366f1;"></i>';
                    } else if (msgLower.includes('rework')) {
                        iconHtml = '<i class="fa-solid fa-rotate-left" style="color: #f59e0b;"></i>';
                    } else if (msgLower.includes('verified') || msgLower.includes('closed')) {
                        iconHtml = '<i class="fa-solid fa-circle-check" style="color: #10b981;"></i>';
                    } else if (msgLower.includes('overdue')) {
                        iconHtml = '<i class="fa-solid fa-triangle-exclamation" style="color: #ef4444;"></i>';
                    }

                    el.innerHTML = `
                        <div class="notif-item-icon">${iconHtml}</div>
                        <div class="notif-item-content">
                            <div style="font-weight: ${item.is_read ? '500' : '700'}; color: var(--text-primary);">${escapeHtml(item.message)}</div>
                            <div class="notif-item-time">${timeStr}</div>
                        </div>
                        ${!item.is_read ? '<div class="notif-unread-dot"></div>' : ''}
                    `;
                    el.addEventListener('click', async () => {
                        if (!item.is_read) {
                            await markNotificationRead(item.id, role);
                        }
                    });
                    dropdownList.appendChild(el);
                });
            }
        }

        // 3. Update Inline Alert Banner (if present on dashboard page)
        if (container) {
            if (!list || list.length === 0) {
                container.innerHTML = '<div style="color: var(--text-tertiary); font-size: 0.825rem; padding: 0.5rem 0;">No active overdue alerts or notices. All tasks proceeding on schedule.</div>';
                if (badge) badge.style.display = 'none';
                return;
            }

            if (badge) {
                badge.textContent = `${unreadCount} unread`;
                badge.style.display = unreadCount > 0 ? 'inline-flex' : 'none';
            }

            container.innerHTML = '';
            list.forEach(item => {
                const el = document.createElement('div');
                el.className = `alert-row ${item.is_read ? 'read' : ''}`;
                const timeStr = item.created_at ? new Date(item.created_at).toLocaleString() : '';
                el.innerHTML = `
                    <div>
                        <div style="font-weight: ${item.is_read ? '500' : '700'};">${escapeHtml(item.message)}</div>
                        <div style="font-size: 0.72rem; color: var(--text-tertiary); margin-top: 0.2rem;">${timeStr}</div>
                    </div>
                    <div>
                        ${!item.is_read ? `<button class="btn btn-secondary btn-sm" onclick="markNotificationRead(${item.id}, '${role}')" style="font-size: 0.72rem; padding: 0.2rem 0.5rem;">Mark Read</button>` : ''}
                    </div>
                `;
                container.appendChild(el);
            });
        }
    } catch (err) {
        console.error('Failed to load notifications from Django:', err);
    }
}

window.markNotificationRead = async function(id, role) {
    try {
        try {
            await apiRequest(`/notifications/${id}/read/`, 'PATCH');
        } catch (e) {
            await apiRequest(`/notifications/${id}/`, 'PATCH', { is_read: true });
        }
        await loadNotifications(role);
    } catch (err) {
        showToast(err.message, 'error');
    }
};

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// 7. Analytics & Progress Widgets
function setCircleMeter(elementId, percentage) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const clamped = Math.max(0, Math.min(100, Number(percentage) || 0));
    const circumference = 339.29;
    const offset = circumference - (clamped / 100) * circumference;
    el.style.strokeDasharray = `${circumference}`;
    el.style.strokeDashoffset = `${offset}`;
}

function createMemberProgressCard(m) {
    const socName = (m.team_name || m.society_name || (typeof m.society === 'object' ? m.society?.name : m.society) || '').toLowerCase();
    const rTitle = (m.role || m.position || '').toLowerCase();
    if (socName.includes('professional') || rTitle.includes('counsellor') || rTitle.includes('counselor') || rTitle.includes('advisor') || rTitle.includes('mentor')) {
        return null;
    }

    const total = m.total || 0;
    const completed = m.completed || 0;
    const onTime = m.completed_on_time || 0;
    const overdue = m.overdue || 0;
    const missed = m.missed || 0;
    const rate = m.completion_rate !== undefined ? m.completion_rate : (total > 0 ? Math.round((completed / total) * 100) : 0);
    const circumference = 163.36;
    const clampedRate = Math.max(0, Math.min(100, rate));
    const offset = circumference - (clampedRate / 100) * circumference;

    const card = document.createElement('div');
    card.className = 'member-progress-card';
    card.style.cursor = 'pointer';
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('title', `Click to inspect full task performance & history for ${m.name || m.username || 'Member'}`);
    card.setAttribute('data-name', (m.name || m.username || '').toLowerCase());
    card.setAttribute('data-role', (m.role || '').toLowerCase());
    card.setAttribute('data-society', (m.team_name || m.society_name || '').toLowerCase());
    card.setAttribute('data-team-id', String(m.team_id || m.society_id || ''));
    card.setAttribute('data-id', String(m.id || ''));

    card.addEventListener('click', () => {
        if (typeof window.openMemberPerformanceModal === 'function') {
            window.openMemberPerformanceModal(m.id, m);
        }
    });
    card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (typeof window.openMemberPerformanceModal === 'function') {
                window.openMemberPerformanceModal(m.id, m);
            }
        }
    });

    card.innerHTML = `
        <div class="member-progress-info">
            <div class="member-progress-name" style="display: flex; align-items: center; justify-content: space-between;">
                <span>${escapeHtml(m.name || m.username || 'Member')}</span>
                <i class="fa-solid fa-arrow-up-right-from-square" style="font-size: 0.72rem; color: var(--text-tertiary); margin-left: 0.35rem;" title="View details"></i>
            </div>
            <div class="member-progress-role">${escapeHtml(m.role || 'Member')}${m.team_name ? ` &bull; ${escapeHtml(m.team_name)}` : ''}</div>
            <div class="member-progress-stats">
                <span class="stat-pill-sm ontime" title="Completed on-time"><i class="fa-solid fa-circle-check" style="font-size: 0.68rem; margin-right: 0.2rem;"></i>${onTime} on-time</span>
                <span class="stat-pill-sm overdue" title="Currently overdue"><i class="fa-solid fa-clock" style="font-size: 0.68rem; margin-right: 0.2rem;"></i>${overdue} overdue</span>
                <span class="stat-pill-sm missed" title="Missed deadlines"><i class="fa-solid fa-circle-xmark" style="font-size: 0.68rem; margin-right: 0.2rem;"></i>${missed} missed</span>
            </div>
        </div>
        <div class="mini-circle-box" title="${completed} of ${total} tasks completed (${rate}%)">
            <svg class="mini-circle-svg" viewBox="0 0 68 68">
                <circle class="mini-circle-bg" cx="34" cy="34" r="26" />
                <circle class="mini-circle-fill" cx="34" cy="34" r="26" style="stroke-dasharray: 163.36; stroke-dashoffset: ${offset};" />
            </svg>
            <div class="mini-circle-inner">
                <span class="mini-circle-num">${completed}</span>
                <span class="mini-circle-lbl">Done</span>
            </div>
        </div>
    `;
    return card;
}

window.filterProgressMatrix = function(gridElId = 'superMembersProgressGrid', searchInputId = 'matrixSearchInput', filterSelectId = 'matrixSocietyFilter') {
    const grid = document.getElementById(gridElId);
    if (!grid) return;
    const searchInput = searchInputId ? document.getElementById(searchInputId) : null;
    const filterSelect = filterSelectId ? document.getElementById(filterSelectId) : null;

    const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
    const selectedSoc = filterSelect ? filterSelect.value.trim().toLowerCase() : '';

    const cards = grid.querySelectorAll('.member-progress-card');
    let visibleCount = 0;

    cards.forEach(card => {
        const name = card.getAttribute('data-name') || '';
        const role = card.getAttribute('data-role') || '';
        const society = card.getAttribute('data-society') || '';
        const teamId = card.getAttribute('data-team-id') || '';

        const matchesQuery = !query || name.includes(query) || role.includes(query) || society.includes(query);
        const matchesSoc = !selectedSoc || society.includes(selectedSoc) || teamId === selectedSoc;

        if (matchesQuery && matchesSoc) {
            card.style.display = '';
            visibleCount++;
        } else {
            card.style.display = 'none';
        }
    });

    let noMatchMsg = grid.querySelector('.matrix-no-match');
    if (visibleCount === 0 && cards.length > 0) {
        if (!noMatchMsg) {
            noMatchMsg = document.createElement('div');
            noMatchMsg.className = 'matrix-no-match';
            noMatchMsg.style.cssText = 'color: var(--text-tertiary); font-size: 0.85rem; padding: 1.5rem 0; text-align: center; width: 100%; grid-column: 1 / -1;';
            noMatchMsg.textContent = 'No matching Execom members found.';
            grid.appendChild(noMatchMsg);
        }
        noMatchMsg.style.display = '';
    } else if (noMatchMsg) {
        noMatchMsg.style.display = 'none';
    }
};

async function loadAnalytics(role, filterTeamId = null) {
    try {
        let resData = null;
        try {
            resData = await apiRequest('/workbench/analytics/');
        } catch (err) {
            resData = await apiRequest('/analytics/');
        }
        if (!resData) return;

        const personal = resData.personal || {};
        const team = resData.team || {};
        const club = resData.club_wide || {};

        const normRole = normalizeRole(role);

        if (normRole === 'member') {
            const valEl = document.getElementById('memberCircleValue');
            const lblEl = document.getElementById('memberCircleLabel');
            const capEl = document.getElementById('memberCircleCaption');
            const onTimeEl = document.getElementById('memberStatOnTime');
            const onTimeRateEl = document.getElementById('memberOnTimeRate');
            const overdueEl = document.getElementById('memberStatOverdue');
            const missedEl = document.getElementById('memberStatMissed');

            const completed = personal.completed || 0;
            const total = personal.total || 0;
            const compRate = personal.completion_rate !== undefined ? personal.completion_rate : (total > 0 ? Math.round((completed / total) * 100) : 0);

            if (valEl) valEl.textContent = completed;
            if (lblEl) lblEl.textContent = completed === 1 ? 'Item' : 'Items';
            if (capEl) capEl.textContent = `${completed} of ${total} Completed (${compRate}%)`;
            setCircleMeter('memberCircleMeter', compRate);

            if (onTimeEl) onTimeEl.textContent = personal.completed_on_time || 0;
            if (onTimeRateEl) onTimeRateEl.textContent = `${personal.on_time_rate || 0}%`;
            if (overdueEl) overdueEl.textContent = personal.overdue || 0;
            if (missedEl) missedEl.textContent = personal.missed || 0;

        } else if (normRole === 'team_lead') {
            const valEl = document.getElementById('adminCircleValue');
            const lblEl = document.getElementById('adminCircleLabel');
            const capEl = document.getElementById('adminCircleCaption');
            const onTimeEl = document.getElementById('adminStatOnTime');
            const onTimeRateEl = document.getElementById('adminOnTimeRate');
            const overdueEl = document.getElementById('adminStatOverdue');
            const missedEl = document.getElementById('adminStatMissed');
            const gridEl = document.getElementById('adminMembersProgressGrid');

            const source = team.total !== undefined ? team : personal;
            const completed = source.completed || 0;
            const total = source.total || 0;
            const compRate = source.completion_rate !== undefined ? source.completion_rate : (total > 0 ? Math.round((completed / total) * 100) : 0);

            if (valEl) valEl.textContent = completed;
            if (lblEl) lblEl.textContent = completed === 1 ? 'Item' : 'Items';
            if (capEl) capEl.textContent = `Team: ${completed} of ${total} Done (${compRate}%)`;
            setCircleMeter('adminCircleMeter', compRate);

            if (onTimeEl) onTimeEl.textContent = source.completed_on_time || 0;
            if (onTimeRateEl) onTimeRateEl.textContent = `${source.on_time_rate || 0}%`;
            if (overdueEl) overdueEl.textContent = source.overdue || 0;
            if (missedEl) missedEl.textContent = source.missed || 0;

            if (gridEl) {
                gridEl.innerHTML = '';
                const members = team.members || [];
                if (members.length === 0) {
                    gridEl.innerHTML = '<div style="color: var(--text-tertiary); font-size: 0.85rem; padding: 1rem 0;">No team members registered yet.</div>';
                } else {
                    members.forEach(m => {
                        const card = createMemberProgressCard(m);
                        if (card) gridEl.appendChild(card);
                    });
                }
                if (typeof window.filterProgressMatrix === 'function') {
                    window.filterProgressMatrix('adminMembersProgressGrid', 'adminMatrixSearchInput', null);
                }
            }

        } else if (normRole === 'superadmin' || normRole === 'admin') {
            const valEl = document.getElementById('superCircleValue');
            const lblEl = document.getElementById('superCircleLabel');
            const capEl = document.getElementById('superCircleCaption');
            const onTimeEl = document.getElementById('superStatOnTime');
            const onTimeRateEl = document.getElementById('superOnTimeRate');
            const overdueEl = document.getElementById('superStatOverdue');
            const missedEl = document.getElementById('superStatMissed');
            const gridEl = document.getElementById('superMembersProgressGrid');

            const completed = club.completed || 0;
            const total = club.total || 0;
            const compRate = club.completion_rate !== undefined ? club.completion_rate : (total > 0 ? Math.round((completed / total) * 100) : 0);

            if (valEl) valEl.textContent = completed;
            if (lblEl) lblEl.textContent = completed === 1 ? 'Item' : 'Items';
            if (capEl) capEl.textContent = `Branch: ${completed} of ${total} Done (${compRate}%)`;
            setCircleMeter('superCircleMeter', compRate);

            if (onTimeEl) onTimeEl.textContent = club.completed_on_time || 0;
            if (onTimeRateEl) onTimeRateEl.textContent = `${club.on_time_rate || 0}%`;
            if (overdueEl) overdueEl.textContent = club.overdue || 0;
            if (missedEl) missedEl.textContent = club.missed || 0;

            if (gridEl) {
                gridEl.innerHTML = '';
                let members = club.members || [];
                if (filterTeamId) {
                    members = members.filter(m => m.team_id == filterTeamId);
                }
                if (members.length === 0) {
                    gridEl.innerHTML = '<div style="color: var(--text-tertiary); font-size: 0.85rem; padding: 1rem 0;">No Execom members found.</div>';
                } else {
                    members.forEach(m => {
                        const card = createMemberProgressCard(m);
                        if (card) gridEl.appendChild(card);
                    });
                }

                // Populate Society filter dropdown if not already populated
                const socFilter = document.getElementById('matrixSocietyFilter');
                if (socFilter && socFilter.options.length <= 1) {
                    const socSet = new Set();
                    (club.members || []).forEach(m => {
                        const socName = (m.team_name || m.society_name || '').toLowerCase();
                        const rTitle = (m.role || m.position || '').toLowerCase();
                        if (socName.includes('professional') || rTitle.includes('counsellor') || rTitle.includes('counselor') || rTitle.includes('advisor') || rTitle.includes('mentor')) {
                            return;
                        }
                        const s = (m.team_name || m.society_name || '').trim();
                        if (s) socSet.add(s);
                    });
                    Array.from(socSet).sort().forEach(s => {
                        const opt = document.createElement('option');
                        opt.value = s.toLowerCase();
                        opt.textContent = s;
                        socFilter.appendChild(opt);
                    });
                }

                // Re-apply filter if inputs already had query
                if (typeof window.filterProgressMatrix === 'function') {
                    window.filterProgressMatrix('superMembersProgressGrid', 'matrixSearchInput', 'matrixSocietyFilter');
                }
            }
        }
    } catch (err) {
        console.error('Failed to load analytics from Django:', err);
    }
}

// 8. Password Management
window.openChangePasswordModal = function(promptReason = null) {
    const modal = document.getElementById('changePasswordModal');
    const desc = document.getElementById('changePasswordModalDesc');
    if (promptReason && desc) {
        desc.textContent = promptReason;
    }
    if (modal) {
        modal.classList.add('active');
        setupPasswordToggles();
    }
};

window.closeChangePasswordModal = function() {
    const modal = document.getElementById('changePasswordModal');
    if (modal) modal.classList.remove('active');
    const form = document.getElementById('changePasswordForm');
    if (form) {
        form.reset();
        form.querySelectorAll('input').forEach(inp => {
            inp.type = 'password';
            const btn = inp.parentElement?.querySelector('.password-toggle-btn i');
            if (btn) btn.className = 'fa-solid fa-eye';
        });
    }
};

function setupChangePasswordListeners() {
    const btn = document.getElementById('changePasswordBtn');
    if (btn) {
        btn.addEventListener('click', () => window.openChangePasswordModal('Choose a personal password for your IEEE Workbench account.'));
    }

    const form = document.getElementById('changePasswordForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const new_password = document.getElementById('modalNewPassword').value.trim();
            const confirm_password = document.getElementById('modalConfirmPassword').value.trim();

            if (new_password.length < 6) {
                showToast('Password must be at least 6 characters long.', 'error');
                return;
            }
            if (new_password !== confirm_password) {
                showToast('Passwords do not match.', 'error');
                return;
            }

            try {
                let res = null;
                try {
                    res = await apiRequest('/workbench/change-password/', 'POST', { new_password, confirm_password });
                } catch (firstErr) {
                    res = await apiRequest('/change-password/', 'POST', { new_password, confirm_password });
                }

                showToast(res?.message || 'Password updated successfully!');
                const user = getStoredUser();
                if (user) {
                    user.must_change_password = false;
                    localStorage.setItem('club_user', JSON.stringify(user));
                }
                window.closeChangePasswordModal();
            } catch (err) {
                showToast(err.message, 'error');
            }
        });
    }
}

function checkFirstLoginPasswordPrompt(user) {
    if (user && user.must_change_password && !sessionStorage.getItem('dismissed_pwd_prompt')) {
        sessionStorage.setItem('dismissed_pwd_prompt', 'true');
        setTimeout(() => {
            window.openChangePasswordModal('Welcome to IEEE Workbench! You are currently signed in with the default password. Please choose a personal password of your choice to secure your account.');
        }, 800);
    }
}

// =============================================================
// 9. Member Performance & Detailed Profile Modal
// =============================================================

function formatDateTime(isoString) {
    if (!isoString) return 'N/A';
    try {
        const d = new Date(isoString);
        if (isNaN(d.getTime())) return isoString;
        return d.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        return isoString;
    }
}

function formatDateOnly(isoString) {
    if (!isoString) return 'N/A';
    try {
        const d = new Date(isoString);
        if (isNaN(d.getTime())) return isoString;
        return d.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    } catch (e) {
        return isoString;
    }
}

window.openMemberPerformanceModal = async function(memberId, initialData = null) {
    const modal = document.getElementById('memberPerformanceModal');
    if (!modal) return;

    modal.classList.add('active');

    const bodyEl = document.getElementById('memberPerformanceModalBody');
    if (!bodyEl) return;

    bodyEl.innerHTML = `
        <div style="text-align: center; padding: 3rem 1rem;">
            <div style="display: inline-block; width: 36px; height: 36px; border: 3px solid var(--border-subtle); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
            <div style="color: var(--text-secondary); font-size: 0.88rem; margin-top: 0.85rem;">Loading member performance profile & deliverables...</div>
        </div>
    `;

    try {
        let data = null;
        try {
            data = await apiRequest(`/workbench/members/${memberId}/performance/`);
        } catch (e1) {
            data = await apiRequest(`/members/${memberId}/performance/`);
        }

        if (!data || data.status !== 'success') {
            throw new Error(data?.error || 'Failed to load member performance data.');
        }

        window.renderMemberPerformanceModal(data);
    } catch (err) {
        bodyEl.innerHTML = `
            <div style="text-align: center; padding: 2.5rem 1rem; color: var(--accent-rose);">
                <i class="fa-solid fa-triangle-exclamation" style="font-size: 2.2rem; margin-bottom: 0.75rem; color: #ef4444;"></i>
                <div style="font-weight: 700; font-size: 1.05rem; margin-bottom: 0.4rem; color: var(--text-primary);">Unable to Load Performance Profile</div>
                <div style="font-size: 0.85rem; color: var(--text-secondary); max-width: 440px; margin: 0 auto 1.5rem auto; line-height: 1.5;">${escapeHtml(err.message || 'Access restricted or network communication error.')}</div>
                <button type="button" class="btn btn-secondary btn-sm" onclick="closeMemberPerformanceModal()">Close</button>
            </div>
        `;
    }
};

window.closeMemberPerformanceModal = function() {
    const modal = document.getElementById('memberPerformanceModal');
    if (modal) modal.classList.remove('active');
};

window.renderMemberPerformanceModal = function(data) {
    const bodyEl = document.getElementById('memberPerformanceModalBody');
    if (!bodyEl) return;

    const m = data.member || {};
    const stats = data.stats || {};
    const tasks = data.tasks || [];

    const initials = (m.name || m.username || 'U').split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase();
    const avatarHtml = m.photo_url ? `
        <img src="${escapeHtml(m.photo_url)}" class="member-perf-avatar" alt="${escapeHtml(m.name)}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
        <div class="member-perf-avatar-fallback" style="display: none;">${initials}</div>
    ` : `
        <div class="member-perf-avatar-fallback">${initials}</div>
    `;

    let roleBadge = '';
    const normRole = (m.role || '').toLowerCase();
    if (normRole === 'superadmin') {
        roleBadge = '<span class="badge badge-super"><i class="fa-solid fa-shield-halved"></i> SUPERADMIN</span>';
    } else if (normRole === 'team_lead' || normRole === 'admin') {
        roleBadge = '<span class="badge badge-admin"><i class="fa-solid fa-user-tie"></i> TEAM LEAD</span>';
    } else {
        roleBadge = '<span class="badge badge-member"><i class="fa-solid fa-user"></i> MEMBER</span>';
    }

    const positionHtml = m.position ? `<span class="badge" style="background: rgba(99, 102, 241, 0.12); color: #6366f1; border: 1px solid rgba(99, 102, 241, 0.25);"><i class="fa-solid fa-briefcase"></i> ${escapeHtml(m.position)}</span>` : '';
    const teamHtml = m.team_name ? `<span class="badge" style="background: rgba(14, 165, 233, 0.12); color: #0284c7; border: 1px solid rgba(14, 165, 233, 0.25);"><i class="fa-solid fa-users"></i> ${escapeHtml(m.team_name)}</span>` : '';

    let html = `
        <div class="member-perf-header">
            <div class="member-perf-avatar-wrap">
                ${avatarHtml}
            </div>
            <div class="member-perf-meta">
                <div class="member-perf-name">
                    ${escapeHtml(m.name || 'Execom Member')}
                </div>
                <div class="member-perf-badges">
                    ${roleBadge}
                    ${positionHtml}
                    ${teamHtml}
                </div>
            </div>
        </div>

        <!-- Metric Summary Cards -->
        <div class="member-perf-stats-grid">
            <div class="perf-stat-card done" title="Total deliverables completed">
                <span class="perf-stat-label">Tasks Done</span>
                <span class="perf-stat-num">${stats.completed || 0}</span>
                <span class="perf-stat-sub">${stats.completion_rate || 0}% of ${stats.total || 0}</span>
            </div>
            <div class="perf-stat-card todo" title="Active deliverables pending completion">
                <span class="perf-stat-label">To Be Done</span>
                <span class="perf-stat-num">${stats.tasks_to_do || 0}</span>
                <span class="perf-stat-sub">active workload</span>
            </div>
            <div class="perf-stat-card overdue" title="Currently overdue past deadline">
                <span class="perf-stat-label">Overdue</span>
                <span class="perf-stat-num">${stats.overdue || 0}</span>
                <span class="perf-stat-sub">action required</span>
            </div>
            <div class="perf-stat-card before" title="Completed before the deadline date">
                <span class="perf-stat-label">Before Deadline</span>
                <span class="perf-stat-num">${stats.completed_before_deadline || 0}</span>
                <span class="perf-stat-sub">finished early</span>
            </div>
            <div class="perf-stat-card ondeadline" title="Completed on the deadline date">
                <span class="perf-stat-label">On Deadline</span>
                <span class="perf-stat-num">${stats.completed_on_deadline || 0}</span>
                <span class="perf-stat-sub">exact due date</span>
            </div>
            <div class="perf-stat-card late" title="Completed after deadline">
                <span class="perf-stat-label">After Deadline</span>
                <span class="perf-stat-num">${stats.completed_after_deadline || 0}</span>
                <span class="perf-stat-sub">finished late</span>
            </div>
        </div>

        <!-- Workflow States Strip -->
        <div class="perf-chips-strip">
            <span style="font-size: 0.72rem; font-weight: 700; text-transform: uppercase; color: var(--text-tertiary); margin-right: 0.25rem;">Workflow Counts:</span>
            <span class="perf-chip"><i class="fa-solid fa-hourglass-start" style="color: #6366f1;"></i> ${stats.pending || 0} Pending</span>
            <span class="perf-chip"><i class="fa-solid fa-eye" style="color: #f59e0b;"></i> ${stats.under_review || 0} Under Review</span>
            <span class="perf-chip"><i class="fa-solid fa-rotate-left" style="color: #ef4444;"></i> ${stats.rework || 0} Rework Needed</span>
            <span class="perf-chip"><i class="fa-solid fa-user-pen" style="color: #8b5cf6;"></i> ${stats.reassigned || 0} Reassigned</span>
        </div>

        <!-- Deliverables List Section -->
        <div class="perf-tasks-header">
            <div style="font-weight: 800; font-size: 0.95rem; color: var(--text-primary); display: flex; align-items: center; gap: 0.5rem;">
                <i class="fa-solid fa-list-check" style="color: var(--primary);"></i> Deliverable History (${tasks.length})
            </div>
            <div class="perf-filter-tabs">
                <button type="button" class="perf-tab-btn active" onclick="filterPerfTasks('all', this)">All (${tasks.length})</button>
                <button type="button" class="perf-tab-btn" onclick="filterPerfTasks('completed', this)">Done (${stats.completed || 0})</button>
                <button type="button" class="perf-tab-btn" onclick="filterPerfTasks('todo', this)">To Do (${stats.tasks_to_do || 0})</button>
                <button type="button" class="perf-tab-btn" onclick="filterPerfTasks('rework', this)">Rework / Review (${(stats.rework || 0) + (stats.under_review || 0)})</button>
            </div>
        </div>

        <div class="perf-tasks-list" id="perfTasksListContainer">
    `;

    if (tasks.length === 0) {
        html += `
            <div style="text-align: center; padding: 2.5rem 1rem; color: var(--text-tertiary);">
                <i class="fa-solid fa-folder-open" style="font-size: 2rem; margin-bottom: 0.5rem; opacity: 0.5;"></i>
                <div style="font-size: 0.88rem;">No deliverables assigned to this member yet.</div>
            </div>
        `;
    } else {
        tasks.forEach(t => {
            let statusBadge = '';
            if (t.is_completed) {
                statusBadge = '<span class="badge badge-done"><i class="fa-solid fa-circle-check"></i> Completed</span>';
            } else if (t.status === 'under_review') {
                statusBadge = '<span class="badge badge-review"><i class="fa-solid fa-eye"></i> Under Review</span>';
            } else if (t.status === 'rework' || t.status === 'rework_needed') {
                statusBadge = '<span class="badge badge-rework"><i class="fa-solid fa-rotate-left"></i> Rework Needed</span>';
            } else if (t.is_overdue) {
                statusBadge = '<span class="badge badge-overdue"><i class="fa-solid fa-hourglass-end"></i> Overdue</span>';
            } else {
                statusBadge = `<span class="badge" style="background: #f1f5f9; color: #475569;"><i class="fa-solid fa-clock"></i> ${escapeHtml(t.status_name || 'Pending')}</span>`;
            }

            let priBadge = '';
            const pri = (t.priority || 'medium').toLowerCase();
            if (pri === 'urgent') {
                priBadge = '<span class="badge" style="background: #fee2e2; color: #dc2626; font-size: 0.68rem;"><i class="fa-solid fa-angles-up"></i> Urgent</span>';
            } else if (pri === 'high') {
                priBadge = '<span class="badge" style="background: #ffedd5; color: #ea580c; font-size: 0.68rem;"><i class="fa-solid fa-angle-up"></i> High</span>';
            }

            let timingPill = '';
            if (t.is_completed) {
                if (t.timing_verdict === 'before_deadline') {
                    const d = Math.abs(t.timing_diff_days || 0);
                    timingPill = `<span class="badge-timing before" title="Completed before deadline"><i class="fa-solid fa-bolt"></i> ${d === 0 ? 'Before deadline' : `${d} day${d === 1 ? '' : 's'} early`}</span>`;
                } else if (t.timing_verdict === 'on_deadline') {
                    timingPill = `<span class="badge-timing on" title="Completed on deadline"><i class="fa-solid fa-calendar-check"></i> On deadline</span>`;
                } else if (t.timing_verdict === 'after_deadline') {
                    const d = Math.abs(t.timing_diff_days || 0);
                    timingPill = `<span class="badge-timing after" title="Completed after deadline"><i class="fa-solid fa-clock-rotate-left"></i> ${d === 0 ? 'Late' : `${d} day${d === 1 ? '' : 's'} late`}</span>`;
                }
            } else if (t.is_overdue) {
                timingPill = `<span class="badge-timing overdue"><i class="fa-solid fa-triangle-exclamation"></i> Overdue</span>`;
            }

            let auditInfoHtml = '';
            if (t.is_completed) {
                const closedDateStr = formatDateTime(t.closed_at || t.completed_at);
                auditInfoHtml = `
                    <div class="perf-task-audit-row">
                        <span><i class="fa-solid fa-circle-check" style="color: #10b981;"></i> Closed on: <strong>${closedDateStr}</strong>${t.closed_by_name ? ` by <strong>${escapeHtml(t.closed_by_name)}</strong>` : ''}</span>
                        ${timingPill}
                    </div>
                `;
            } else if (t.status === 'under_review') {
                auditInfoHtml = `
                    <div class="perf-task-audit-row">
                        <span style="color: #f59e0b;"><i class="fa-solid fa-eye"></i> Submitted for verification &bull; Awaiting lead close</span>
                        ${timingPill}
                    </div>
                `;
            } else {
                auditInfoHtml = `
                    <div class="perf-task-audit-row">
                        <span><i class="fa-regular fa-clock"></i> Status: ${escapeHtml(t.status_name || 'Active')}</span>
                        ${timingPill}
                    </div>
                `;
            }

            let reworkHtml = '';
            if (t.rework_notes) {
                const isReassign = t.rework_notes.toLowerCase().startsWith('reassigned from');
                reworkHtml = `
                    <div style="margin-top: 0.35rem; padding: 0.45rem 0.75rem; background: ${isReassign ? 'rgba(139, 92, 246, 0.08)' : 'rgba(245, 158, 11, 0.08)'}; border-left: 3px solid ${isReassign ? '#8b5cf6' : '#f59e0b'}; border-radius: 4px; font-size: 0.78rem;">
                        <strong><i class="fa-solid ${isReassign ? 'fa-user-pen' : 'fa-circle-info'}"></i> ${isReassign ? 'Handover Note' : 'Rework Guidance'}:</strong>
                        <div style="margin-top: 0.15rem; color: var(--text-secondary);">${escapeHtml(t.rework_notes)}</div>
                    </div>
                `;
            }

            const filterGroup = t.is_completed ? 'completed' : ((t.status === 'rework' || t.status === 'rework_needed' || t.status === 'under_review') ? 'rework' : 'todo');

            html += `
                <div class="perf-task-item" data-group="${filterGroup}" data-status="${t.status}">
                    <div class="perf-task-top">
                        <div style="flex: 1; min-width: 0;">
                            <div class="perf-task-title">${escapeHtml(t.title)}</div>
                            ${t.description ? `<div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.2rem; line-height: 1.4;">${escapeHtml(t.description)}</div>` : ''}
                        </div>
                        <div style="display: flex; gap: 0.35rem; align-items: center; flex-shrink: 0;">
                            ${priBadge}
                            ${statusBadge}
                        </div>
                    </div>

                    <div style="display: flex; flex-wrap: wrap; gap: 0.85rem; font-size: 0.78rem; color: var(--text-tertiary); margin-top: 0.25rem;">
                        <span><i class="fa-regular fa-calendar-check" style="margin-right: 0.25rem;"></i>Deadline: <strong>${formatDateTime(t.deadline)}</strong></span>
                        ${t.created_at ? `<span><i class="fa-regular fa-calendar-plus" style="margin-right: 0.25rem;"></i>Created: <strong>${formatDateTime(t.created_at)}</strong></span>` : ''}
                        ${t.assigned_by_name ? `<span><i class="fa-solid fa-user-tag" style="margin-right: 0.25rem;"></i>By: ${escapeHtml(t.assigned_by_name)}</span>` : ''}
                    </div>

                    ${reworkHtml}
                    ${auditInfoHtml}
                </div>
            `;
        });
    }

    const curStoredUser = getStoredUser();
    const curViewerRole = curStoredUser ? normalizeRole(curStoredUser.role, curStoredUser) : null;
    const resetBtnHtml = curViewerRole === 'superadmin' ? `
        <button type="button" class="btn btn-warning btn-sm" onclick="superAdminResetUserPassword(${m.id}, '${escapeHtml(m.name)}')" style="display: flex; align-items: center; gap: 0.4rem; font-weight: 700;">
            <i class="fa-solid fa-key"></i> Reset to Default Password
        </button>
    ` : '';

    html += `
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid var(--border-subtle); flex-wrap: wrap; gap: 0.75rem;">
            <div>
                ${resetBtnHtml}
            </div>
            <button type="button" class="btn btn-secondary btn-sm" onclick="closeMemberPerformanceModal()">Close Profile</button>
        </div>
    `;

    bodyEl.innerHTML = html;
};

window.superAdminResetUserPassword = async function(userId, userName = null) {
    if (!userId) return;

    const targetName = userName || document.getElementById('modalUsernameHeading')?.textContent || 'this Execom member';

    const confirmed = window.confirm(`Reset password for "${targetName}" to default formula?\n\nTheir current custom password will be cleared, and they will be prompted to set a new personal password on their next sign-in.`);
    if (!confirmed) return;

    try {
        let res = null;
        try {
            res = await apiRequest(`/workbench/users/${userId}/reset-password/`, 'POST');
        } catch (err1) {
            try {
                res = await apiRequest(`/users/${userId}/reset-password/`, 'POST');
            } catch (err2) {
                res = await apiRequest(`/workbench/members/${userId}/reset-password/`, 'POST');
            }
        }

        if (res && res.status === 'success') {
            showToast(res.message || `Password for ${targetName} has been reset to default!`);
        } else {
            showToast(res?.message || 'Password reset completed.');
        }
    } catch (err) {
        showToast(err.message || 'Failed to reset password.', 'error');
    }
};

window.filterPerfTasks = function(filterGroup, tabBtn) {
    if (tabBtn) {
        const container = tabBtn.parentElement;
        if (container) {
            container.querySelectorAll('.perf-tab-btn').forEach(btn => btn.classList.remove('active'));
            tabBtn.classList.add('active');
        }
    }
    const container = document.getElementById('perfTasksListContainer');
    if (!container) return;

    container.querySelectorAll('.perf-task-item').forEach(item => {
        const g = item.getAttribute('data-group');
        if (filterGroup === 'all') {
            item.style.display = '';
        } else if (filterGroup === 'completed' && g === 'completed') {
            item.style.display = '';
        } else if (filterGroup === 'todo' && (g === 'todo' || g === 'rework')) {
            item.style.display = '';
        } else if (filterGroup === 'rework' && g === 'rework') {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    });
};

// =========================================================
// 10. Mobile Responsive Drawer & Section Navigation System
// =========================================================

let currentMobileSection = 'deliverables';

window.openMobileNavDrawer = function() {
    const drawer = document.getElementById('mobileNavDrawer');
    if (drawer) {
        drawer.classList.add('is-open');
        document.body.style.overflow = 'hidden';
        if (typeof window.updateMobileDrawerProfile === 'function') {
            window.updateMobileDrawerProfile();
        }
    }
};

window.closeMobileNavDrawer = function() {
    const drawer = document.getElementById('mobileNavDrawer');
    if (drawer) {
        drawer.classList.remove('is-open');
        document.body.style.overflow = '';
    }
};

window.toggleMobileNavDrawer = function() {
    const drawer = document.getElementById('mobileNavDrawer');
    if (drawer && drawer.classList.contains('is-open')) {
        window.closeMobileNavDrawer();
    } else {
        window.openMobileNavDrawer();
    }
};

window.handleDrawerBackdropClick = function(event) {
    if (event.target && event.target.id === 'mobileNavDrawer') {
        window.closeMobileNavDrawer();
    }
};

window.updateMobileDrawerProfile = function(user = null) {
    if (!user) {
        user = getStoredUser();
    }
    if (!user) return;

    const nameEl = document.getElementById('drawerUserName');
    const avatarEl = document.getElementById('drawerUserAvatar');
    const badgeEl = document.getElementById('drawerUserRoleBadge');
    const subEl = document.getElementById('drawerUserSub');

    const name = user.name || user.username || 'User';
    if (nameEl) nameEl.textContent = name;
    if (avatarEl) {
        const initials = (name.split(' ').map(p => p[0]).filter(Boolean).slice(0, 2).join('') || 'U').toUpperCase();
        avatarEl.textContent = initials;
    }

    const normRole = normalizeRole(user.role, user);
    if (badgeEl) {
        if (normRole === 'superadmin') {
            badgeEl.className = 'badge badge-super';
            badgeEl.textContent = 'SUPERADMIN';
            if (subEl) subEl.textContent = 'Executive Command Center';
        } else if (normRole === 'admin') {
            badgeEl.className = 'badge badge-admin';
            badgeEl.textContent = 'ADMIN';
            if (subEl) subEl.textContent = user.team_name ? `${user.team_name} Operations` : 'Operations Lead';
        } else if (normRole === 'team_lead') {
            badgeEl.className = 'badge badge-lead';
            badgeEl.textContent = 'TEAM LEAD';
            if (subEl) subEl.textContent = user.team_name ? `${user.team_name} Lead` : 'Chapter Lead';
        } else {
            badgeEl.className = 'badge badge-member';
            badgeEl.textContent = 'MEMBER';
            if (subEl) subEl.textContent = user.team_name || 'Execom Member';
        }
    }

    window.updateMobileThemeState();
};

window.updateMobileThemeState = function() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const iconEl = document.getElementById('drawerThemeIcon');
    const textEl = document.getElementById('drawerThemeText');
    const badgeEl = document.getElementById('drawerThemeBadge');
    if (iconEl) {
        iconEl.className = isDark ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
        iconEl.style.color = isDark ? '#f59e0b' : '#3b82f6';
    }
    if (textEl) {
        textEl.textContent = isDark ? 'Dark Theme' : 'Light Theme';
    }
    if (badgeEl) {
        badgeEl.textContent = isDark ? 'Dark' : 'Light';
    }
};

window.handleMobileThemeToggle = function() {
    if (typeof window.toggleWorkbenchTheme === 'function') {
        window.toggleWorkbenchTheme();
    }
    window.updateMobileThemeState();
};

window.handleMobileChangePassword = function() {
    window.closeMobileNavDrawer();
    if (typeof window.openChangePasswordModal === 'function') {
        window.openChangePasswordModal('Choose a personal password for your IEEE Workbench account.');
    }
};

window.navigateWorkbenchSection = function(sectionKey) {
    currentMobileSection = sectionKey;
    const isMobile = window.innerWidth <= 768;

    const sections = {
        deliverables: document.getElementById('sectionDeliverables'),
        analytics: document.getElementById('sectionAnalytics'),
        matrix: document.getElementById('sectionMatrix'),
        management: document.getElementById('superadminManagementGrid')
    };

    const sectionTitles = {
        deliverables: { icon: 'fa-list-check', title: 'Task Assignment & Deliverables' },
        analytics: { icon: 'fa-chart-line', title: 'Deliverables Analytics' },
        matrix: { icon: 'fa-ranking-star', title: 'Member Progress Matrix' },
        management: { icon: 'fa-users-gear', title: 'Execom User Management' }
    };

    const storedUser = getStoredUser();
    const normRole = storedUser ? normalizeRole(storedUser.role, storedUser) : null;

    if (isMobile) {
        Object.keys(sections).forEach(key => {
            const el = sections[key];
            if (!el) return;
            // Admin role cannot see management section
            if (key === 'management' && normRole === 'admin') {
                el.style.display = 'none';
                return;
            }

            if (key === sectionKey) {
                if (key === 'management' || el.classList.contains('kanban-grid') || el.classList.contains('super-grid')) {
                    el.style.display = 'grid';
                } else {
                    el.style.display = 'block';
                }
            } else {
                el.style.display = 'none';
            }
        });

        // Update mobile active bar
        const bar = document.getElementById('mobileActiveSectionBar');
        const titleEl = document.getElementById('mobileActiveSectionTitle');
        if (bar) bar.style.display = 'flex';
        if (titleEl && sectionTitles[sectionKey]) {
            titleEl.innerHTML = `<i class="fa-solid ${sectionTitles[sectionKey].icon}" style="color: var(--primary);"></i> <span>${sectionTitles[sectionKey].title}</span>`;
        }
    } else {
        // Desktop: restore layout for all sections
        Object.keys(sections).forEach(key => {
            const el = sections[key];
            if (!el) return;
            if (key === 'management' && normRole === 'admin') {
                el.style.display = 'none';
            } else {
                el.style.display = '';
            }
        });
        const bar = document.getElementById('mobileActiveSectionBar');
        if (bar) bar.style.display = 'none';
    }

    // Update active state in drawer
    document.querySelectorAll('.mobile-nav-link[data-section]').forEach(link => {
        if (link.getAttribute('data-section') === sectionKey) {
            link.classList.add('is-active');
        } else {
            link.classList.remove('is-active');
        }
    });

    window.closeMobileNavDrawer();
};

window.initMobileWorkbenchView = function() {
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
        window.navigateWorkbenchSection(currentMobileSection || 'deliverables');
    } else {
        window.navigateWorkbenchSection('all');
    }
};

let workbenchResizeTimer = null;
window.addEventListener('resize', function() {
    clearTimeout(workbenchResizeTimer);
    workbenchResizeTimer = setTimeout(() => {
        window.initMobileWorkbenchView();
    }, 120);
});

// =========================================================
// 11. Collapsible Execom Progress Matrix Accordion
// =========================================================

window.toggleProgressMatrixCollapse = function() {
    const contentArea = document.getElementById('matrixContentArea');
    const toggleText = document.getElementById('matrixToggleText');
    const toggleIcon = document.getElementById('matrixToggleIcon');
    const statusBadge = document.getElementById('matrixStatusBadge');
    const subTitle = document.getElementById('matrixHeaderSubtitle');
    if (!contentArea) return;

    const isCollapsed = contentArea.style.display === 'none' || getComputedStyle(contentArea).display === 'none';
    if (isCollapsed) {
        contentArea.style.display = 'block';
        if (toggleText) toggleText.textContent = 'Collapse';
        if (toggleIcon) toggleIcon.className = 'fa-solid fa-chevron-up';
        if (statusBadge) {
            statusBadge.textContent = 'EXPANDED';
            statusBadge.style.color = 'var(--primary)';
            statusBadge.style.background = 'rgba(0, 85, 164, 0.12)';
        }
        if (subTitle) subTitle.textContent = 'Real-time progress circles per person — click to collapse';
        if (typeof window.filterProgressMatrix === 'function') {
            window.filterProgressMatrix('superMembersProgressGrid', 'matrixSearchInput', 'matrixSocietyFilter');
        }
    } else {
        contentArea.style.display = 'none';
        if (toggleText) toggleText.textContent = 'Expand';
        if (toggleIcon) toggleIcon.className = 'fa-solid fa-chevron-down';
        if (statusBadge) {
            statusBadge.textContent = 'COLLAPSED';
            statusBadge.style.color = 'var(--text-secondary)';
            statusBadge.style.background = 'var(--bg-surface-elevated)';
        }
        if (subTitle) subTitle.textContent = 'Click to expand and view real-time progress circles per person';
    }
};

window.toggleAdminProgressMatrixCollapse = function() {
    const contentArea = document.getElementById('adminMatrixContentArea');
    const toggleText = document.getElementById('adminMatrixToggleText');
    const toggleIcon = document.getElementById('adminMatrixToggleIcon');
    const statusBadge = document.getElementById('adminMatrixStatusBadge');
    const subTitle = document.getElementById('adminMatrixHeaderSubtitle');
    if (!contentArea) return;

    const isCollapsed = contentArea.style.display === 'none' || getComputedStyle(contentArea).display === 'none';
    if (isCollapsed) {
        contentArea.style.display = 'block';
        if (toggleText) toggleText.textContent = 'Collapse';
        if (toggleIcon) toggleIcon.className = 'fa-solid fa-chevron-up';
        if (statusBadge) {
            statusBadge.textContent = 'EXPANDED';
            statusBadge.style.color = 'var(--primary)';
            statusBadge.style.background = 'rgba(0, 85, 164, 0.12)';
        }
        if (subTitle) subTitle.textContent = 'Team progress circles per person — click to collapse';
        if (typeof window.filterProgressMatrix === 'function') {
            window.filterProgressMatrix('adminMembersProgressGrid', 'adminMatrixSearchInput', null);
        }
    } else {
        contentArea.style.display = 'none';
        if (toggleText) toggleText.textContent = 'Expand';
        if (toggleIcon) toggleIcon.className = 'fa-solid fa-chevron-down';
        if (statusBadge) {
            statusBadge.textContent = 'COLLAPSED';
            statusBadge.style.color = 'var(--text-secondary)';
            statusBadge.style.background = 'var(--bg-surface-elevated)';
        }
        if (subTitle) subTitle.textContent = 'Click to expand and view progress circles per person';
    }
};

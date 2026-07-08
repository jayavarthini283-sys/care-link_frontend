// Authentication Actions
async function login(email, password) {
    try {
        const response = await apiFetch('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        saveAuth(response.token, response.email, response.role);
        return response;
    } catch (error) {
        throw error;
    }
}

async function register(email, password, fullName, bloodGroup, emergencyContact) {
    try {
        const response = await apiFetch('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({
                email,
                password,
                fullName,
                bloodGroup,
                emergencyContact
            })
        });

        // Auto-login after registration by saving the token
        saveAuth(response.token, response.email, response.role);

        return response;

    } catch (error) {
        throw error;
    }
}

// Dynamic Navigation Rendering
document.addEventListener('DOMContentLoaded', () => {
    // If we are on login or register, do not inject navigation
    const path = window.location.pathname;
    if (path.includes('login.html') || path.includes('register.html')) {
        if (isAuthenticated()) {
            window.location.href = 'index.html';
        }
        return;
    }
    
    // Otherwise check auth
    if (!isAuthenticated()) {
        window.location.href = 'login.html';
        return;
    }
    
    renderNavbar();
    renderSidebar();
    highlightActiveLink();
});

function renderNavbar() {
    const headerEl = document.getElementById('navbar-container');
    if (!headerEl) return;
    
    const email = getUserEmail() || 'user@carelink.com';
    const role = getUserRole() || 'PATIENT';
    const formattedRole = role.replace('_', ' ');
    
    headerEl.innerHTML = `
        <nav class="navbar navbar-expand-lg navbar-custom">
            <div class="container-fluid">
                <button type="button" id="sidebarCollapse" class="btn btn-outline-primary me-3">
                    <i class="bi bi-justify"></i>
                </button>
                <span class="navbar-brand mb-0 h1 d-none d-sm-inline text-primary fw-bold">CareLink Portal</span>
                <div class="ms-auto d-flex align-items-center">
                    <div class="text-end me-3 d-none d-md-block">
                        <div class="font-semibold text-dark">${email}</div>
                        <div class="text-xs text-muted fw-bold text-uppercase">${formattedRole}</div>
                    </div>
                    <div class="dropdown">
                        <a href="#" class="d-flex align-items-center text-decoration-none dropdown-toggle" id="dropdownUser" data-bs-toggle="dropdown" aria-expanded="false">
                            <div class="profile-img bg-primary text-white d-flex align-items-center justify-content-center fw-bold">
                                ${email.charAt(0).toUpperCase()}
                            </div>
                        </a>
                        <ul class="dropdown-menu dropdown-menu-end shadow-sm border-0" aria-labelledby="dropdownUser">
                            <li><span class="dropdown-item-text text-muted text-xs">Signed in as<br><strong>${email}</strong></span></li>
                            <li><hr class="dropdown-divider"></li>
                            <li><a class="dropdown-item" href="index.html"><i class="bi bi-speedometer2 me-2"></i>Dashboard</a></li>
                            <li><a class="dropdown-item text-danger" href="#" onclick="logout()"><i class="bi bi-box-arrow-right me-2"></i>Sign Out</a></li>
                        </ul>
                    </div>
                </div>
            </div>
        </nav>
    `;
    
    // Style the initial avatar icon if needed
    const imgEl = headerEl.querySelector('.profile-img');
    if (imgEl && !imgEl.src) {
        imgEl.style.width = '38px';
        imgEl.style.height = '38px';
        imgEl.style.borderRadius = '50%';
        imgEl.style.fontSize = '1.1rem';
    }
    
    // Bind Sidebar Collapse Button
    const collapseBtn = document.getElementById('sidebarCollapse');
    if (collapseBtn) {
        collapseBtn.addEventListener('click', () => {
            const sidebar = document.getElementById('sidebar');
            if (sidebar) {
                sidebar.classList.toggle('active');
            }
        });
    }
}

function renderSidebar() {
    const sidebarEl = document.getElementById('sidebar-container');
    if (!sidebarEl) return;
    
    const role = getUserRole();
    let menuItems = '';
    
    if (role === 'CLINIC_ADMIN') {
        menuItems = `
            <li id="menu-dashboard">
                <a href="index.html"><i class="bi bi-speedometer2"></i> Dashboard</a>
            </li>
            <li id="menu-admin-doctors">
                <a href="admin-doctors.html"><i class="bi bi-person-badge-fill"></i> Manage Doctors</a>
            </li>
            <li id="menu-admin-patients">
                <a href="admin-patients.html"><i class="bi bi-people-fill"></i> Manage Patients</a>
            </li>
            <li id="menu-allappointments">
                <a href="allappointments.html"><i class="bi bi-calendar-event-fill"></i> All Appointments</a>
            </li>
        `;
    } else if (role === 'DOCTOR') {
        menuItems = `
            <li id="menu-dashboard">
                <a href="index.html"><i class="bi bi-speedometer2"></i> Dashboard</a>
            </li>
            <li id="menu-schedule">
                <a href="schedule.html"><i class="bi bi-calendar-week"></i> Schedule Slots</a>
            </li>
            <li id="menu-consultations">
                <a href="consultations.html"><i class="bi bi-chat-square-text-fill"></i> Consultations</a>
            </li>
        `;
    } else { // PATIENT
        menuItems = `
            <li id="menu-dashboard">
                <a href="index.html"><i class="bi bi-speedometer2"></i> Dashboard</a>
            </li>
            <li id="menu-doctors">
                <a href="doctors.html"><i class="bi bi-person-heart"></i> Find Doctors</a>
            </li>
            <li id="menu-appointment">
                <a href="appointment.html"><i class="bi bi-calendar-plus"></i> Book Appointment</a>
            </li>
            <li id="menu-myappointments">
                <a href="myappointments.html"><i class="bi bi-calendar-check"></i> My Appointments</a>
            </li>
        `;
    }
    
    sidebarEl.innerHTML = `
        <nav id="sidebar">
            <div class="sidebar-header d-flex align-items-center">
                <i class="bi bi-activity text-primary fs-3 me-2"></i>
                <h4 class="mb-0 fw-bold">CareLink</h4>
            </div>
            <ul class="list-unstyled components">
                ${menuItems}
                <li class="mt-5 border-top border-secondary">
                    <a href="#" onclick="logout()"><i class="bi bi-box-arrow-right text-danger"></i> <span class="text-danger fw-bold">Sign Out</span></a>
                </li>
            </ul>
        </nav>
    `;
}

function highlightActiveLink() {
    const path = window.location.pathname;
    let activeId = 'menu-dashboard';
    
    if (path.includes('admin-doctors.html')) {
        activeId = 'menu-admin-doctors';
    } else if (path.includes('admin-patients.html')) {
        activeId = 'menu-admin-patients';
    } else if (path.includes('allappointments.html')) {
        activeId = 'menu-allappointments';
    } else if (path.includes('schedule.html')) {
        activeId = 'menu-schedule';
    } else if (path.includes('consultations.html')) {
        activeId = 'menu-consultations';
    } else if (path.includes('doctors.html')) {
        activeId = 'menu-doctors';
    } else if (path.includes('appointment.html')) {
        activeId = 'menu-appointment';
    } else if (path.includes('myappointments.html')) {
        activeId = 'menu-myappointments';
    }
    
    const activeLi = document.getElementById(activeId);
    if (activeLi) {
        activeLi.classList.add('active');
    }
}

// Logout: clears session and redirects to login page
function logout() {
    clearAuth();
    window.location.href = 'login.html';
}

// Role-based page protection: redirect away if user's role is not allowed
function protectPage(allowedRoles) {
    const role = getUserRole();
    if (!role || !allowedRoles.includes(role)) {
        alert('Access denied. You do not have permission to view this page.');
        window.location.href = 'index.html';
    }
}

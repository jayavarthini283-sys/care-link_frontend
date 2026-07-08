document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication and load stats
    const role = getUserRole();
    const email = getUserEmail();
    
    // Set Profile details
    document.getElementById('welcome-name').textContent = email.split('@')[0];
    document.getElementById('profile-email').textContent = email;
    document.getElementById('profile-role').textContent = role.replace('_', ' ');
    document.getElementById('large-avatar').textContent = email.charAt(0).toUpperCase();
    
    // Customize stats labels and load data based on role
    try {
        if (role === 'CLINIC_ADMIN') {
            await loadAdminDashboard();
        } else if (role === 'DOCTOR') {
            await loadDoctorDashboard();
        } else { // PATIENT
            await loadPatientDashboard();
        }
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showErrorAlert('Failed to load dashboard statistics. Is the backend running?');
        document.getElementById('loading-spinner').classList.add('d-none');
    }
});

function showErrorAlert(message) {
    const content = document.getElementById('content');
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-danger alert-custom alert-dismissible fade show mb-4';
    alertDiv.role = 'alert';
    alertDiv.innerHTML = `
        <i class="bi bi-exclamation-octagon-fill me-2"></i>
        <strong>Connection Error:</strong> ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    content.insertBefore(alertDiv, content.firstChild);
}

// Patient Dashboard Flow
async function loadPatientDashboard() {
    setupPatientQuickActions();
    
    // Fetch patient appointments
    const appointments = await apiFetch('/api/appointments/my');
    
    let total = appointments.length;
    let pending = 0;
    let confirmedOrCompleted = 0;
    let cancelled = 0;
    
    appointments.forEach(app => {
        if (app.status === 'PENDING') pending++;
        else if (app.status === 'CONFIRMED' || app.status === 'IN_PROGRESS' || app.status === 'COMPLETED') confirmedOrCompleted++;
        else if (app.status === 'CANCELLED') cancelled++;
    });
    
    // Update stats cards
    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-pending').textContent = pending;
    document.getElementById('stat-confirmed').textContent = confirmedOrCompleted;
    document.getElementById('stat-cancelled').textContent = cancelled;
    
    renderPatientActivities(appointments);
}

function setupPatientQuickActions() {
    const grid = document.getElementById('quick-actions-grid');
    grid.innerHTML = `
        <div class="col-6">
            <a href="doctors.html" class="btn-quick-action">
                <i class="bi bi-search text-primary"></i>
                <span class="text-xs fw-bold">Find Doctor</span>
            </a>
        </div>
        <div class="col-6">
            <a href="appointment.html" class="btn-quick-action">
                <i class="bi bi-calendar-plus text-success"></i>
                <span class="text-xs fw-bold">Book Visit</span>
            </a>
        </div>
        <div class="col-6">
            <a href="myappointments.html" class="btn-quick-action">
                <i class="bi bi-clock-history text-info"></i>
                <span class="text-xs fw-bold">My Bookings</span>
            </a>
        </div>
        <div class="col-6">
            <a href="#" onclick="logout()" class="btn-quick-action text-danger">
                <i class="bi bi-box-arrow-right"></i>
                <span class="text-xs fw-bold">Sign Out</span>
            </a>
        </div>
    `;
}

function renderPatientActivities(appointments) {
    const spinner = document.getElementById('loading-spinner');
    const noAct = document.getElementById('no-activity');
    const list = document.getElementById('activity-list');
    
    spinner.classList.add('d-none');
    
    if (appointments.length === 0) {
        noAct.classList.remove('d-none');
        const actionBtn = noAct.querySelector('.id-action-btn');
        if (actionBtn) {
            actionBtn.href = 'doctors.html';
            actionBtn.textContent = 'Book Your First Appointment';
        }
        return;
    }
    
    list.classList.remove('d-none');
    list.innerHTML = '';
    
    // Get last 4 appointments (most recent first)
    const recent = appointments.slice().reverse().slice(0, 4);
    
    recent.forEach(app => {
        const docEmail = app.doctor.account ? app.doctor.account.email : 'Doctor';
        const docSpec = app.doctor.specialization || 'General';
        const dateStr = formatDateTime(app.slot.startTime);
        const statusClass = getStatusClass(app.status);
        
        const item = document.createElement('div');
        item.className = `activity-item ${statusClass}`;
        item.innerHTML = `
            <div class="d-flex justify-content-between mb-1">
                <span class="font-semibold text-dark">Appointment with Dr. ${docEmail.split('@')[0]}</span>
                <span class="badge badge-status bg-${statusClass}-light text-${statusClass}">${app.status}</span>
            </div>
            <div class="text-xs text-muted">Specialization: ${docSpec} | Scheduled on: ${dateStr}</div>
            ${app.reasonForVisit ? `<div class="text-sm mt-1 text-secondary italic">Reason: "${app.reasonForVisit}"</div>` : ''}
        `;
        list.appendChild(item);
    });
}

// Doctor Dashboard Flow
async function loadDoctorDashboard() {
    setupDoctorQuickActions();
    
    // Customize Labels
    document.querySelector('[id="stats-container"] .col-md-3:nth-child(3) .card-subtitle').textContent = 'Active consultations';
    
    // Fetch doctor appointments
    const appointments = await apiFetch('/api/appointments/my');
    
    let total = appointments.length;
    let pending = 0;
    let active = 0;
    let cancelled = 0;
    
    appointments.forEach(app => {
        if (app.status === 'PENDING') pending++;
        else if (app.status === 'CONFIRMED' || app.status === 'IN_PROGRESS') active++;
        else if (app.status === 'CANCELLED') cancelled++;
    });
    
    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-pending').textContent = pending;
    document.getElementById('stat-confirmed').textContent = active;
    document.getElementById('stat-cancelled').textContent = cancelled;
    
    renderDoctorActivities(appointments);
}

function setupDoctorQuickActions() {
    const grid = document.getElementById('quick-actions-grid');
    grid.innerHTML = `
        <div class="col-6">
            <a href="schedule.html" class="btn-quick-action">
                <i class="bi bi-calendar-range text-primary"></i>
                <span class="text-xs fw-bold">Manage Slots</span>
            </a>
        </div>
        <div class="col-6">
            <a href="consultations.html" class="btn-quick-action">
                <i class="bi bi-chat-square-dots text-success"></i>
                <span class="text-xs fw-bold">Consultations</span>
            </a>
        </div>
        <div class="col-6">
            <a href="#" onclick="logout()" class="btn-quick-action text-danger">
                <i class="bi bi-box-arrow-right"></i>
                <span class="text-xs fw-bold">Sign Out</span>
            </a>
        </div>
    `;
}

function renderDoctorActivities(appointments) {
    const spinner = document.getElementById('loading-spinner');
    const noAct = document.getElementById('no-activity');
    const list = document.getElementById('activity-list');
    
    spinner.classList.add('d-none');
    
    if (appointments.length === 0) {
        noAct.classList.remove('d-none');
        const actionBtn = noAct.querySelector('.id-action-btn');
        if (actionBtn) {
            actionBtn.href = 'schedule.html';
            actionBtn.textContent = 'Manage Your Schedule';
        }
        return;
    }
    
    list.classList.remove('d-none');
    list.innerHTML = '';
    
    const recent = appointments.slice().reverse().slice(0, 4);
    
    recent.forEach(app => {
        const patientName = app.patient.fullName || 'Patient';
        const dateStr = formatDateTime(app.slot.startTime);
        const statusClass = getStatusClass(app.status);
        
        const item = document.createElement('div');
        item.className = `activity-item ${statusClass}`;
        item.innerHTML = `
            <div class="d-flex justify-content-between mb-1">
                <span class="font-semibold text-dark">Consultation with ${patientName}</span>
                <span class="badge badge-status bg-${statusClass}-light text-${statusClass}">${app.status}</span>
            </div>
            <div class="text-xs text-muted">Scheduled for: ${dateStr}</div>
            ${app.reasonForVisit ? `<div class="text-sm mt-1 text-secondary italic">Reason: "${app.reasonForVisit}"</div>` : ''}
        `;
        list.appendChild(item);
    });
}

// Clinic Admin Dashboard Flow
async function loadAdminDashboard() {
    setupAdminQuickActions();
    
    // Change labels dynamically
    const subtitles = document.querySelectorAll('[id="stats-container"] .card-subtitle');
    const icons = document.querySelectorAll('[id="stats-container"] .card-icon');
    
    subtitles[0].textContent = 'Registered Patients';
    icons[0].innerHTML = '<i class="bi bi-people-fill"></i>';
    icons[0].className = 'card-icon bg-info-light text-info';
    
    subtitles[1].textContent = 'Active Doctors';
    icons[1].innerHTML = '<i class="bi bi-person-badge-fill"></i>';
    icons[1].className = 'card-icon bg-primary-light text-primary';
    
    subtitles[2].textContent = 'Total Appointments';
    icons[2].innerHTML = '<i class="bi bi-calendar-event"></i>';
    icons[2].className = 'card-icon bg-success-light text-success';
    
    subtitles[3].textContent = 'Pending Bookings';
    icons[3].innerHTML = '<i class="bi bi-hourglass-split"></i>';
    icons[3].className = 'card-icon bg-warning-light text-warning';
    
    // Fetch Admin statistical data
    const [patients, doctors, appointments] = await Promise.all([
        apiFetch('/api/patients'),
        apiFetch('/api/doctors'),
        apiFetch('/api/appointments')
    ]);
    
    let pending = 0;
    appointments.forEach(app => {
        if (app.status === 'PENDING') pending++;
    });
    
    document.getElementById('stat-total').textContent = patients.length;
    document.getElementById('stat-pending').textContent = doctors.length;
    document.getElementById('stat-confirmed').textContent = appointments.length;
    document.getElementById('stat-cancelled').textContent = pending;
    
    renderAdminActivities(appointments);
}

function setupAdminQuickActions() {
    const grid = document.getElementById('quick-actions-grid');
    grid.innerHTML = `
        <div class="col-6">
            <a href="admin-doctors.html" class="btn-quick-action">
                <i class="bi bi-person-badge text-primary"></i>
                <span class="text-xs fw-bold">Doctors List</span>
            </a>
        </div>
        <div class="col-6">
            <a href="admin-patients.html" class="btn-quick-action">
                <i class="bi bi-people text-success"></i>
                <span class="text-xs fw-bold">Patients List</span>
            </a>
        </div>
        <div class="col-6">
            <a href="allappointments.html" class="btn-quick-action">
                <i class="bi bi-calendar3 text-info"></i>
                <span class="text-xs fw-bold">Bookings Log</span>
            </a>
        </div>
        <div class="col-6">
            <a href="#" onclick="logout()" class="btn-quick-action text-danger">
                <i class="bi bi-box-arrow-right"></i>
                <span class="text-xs fw-bold">Sign Out</span>
            </a>
        </div>
    `;
}

function renderAdminActivities(appointments) {
    const spinner = document.getElementById('loading-spinner');
    const noAct = document.getElementById('no-activity');
    const list = document.getElementById('activity-list');
    
    spinner.classList.add('d-none');
    
    if (appointments.length === 0) {
        noAct.classList.remove('d-none');
        const actionBtn = noAct.querySelector('.id-action-btn');
        if (actionBtn) {
            actionBtn.classList.add('d-none');
        }
        return;
    }
    
    list.classList.remove('d-none');
    list.innerHTML = '';
    
    const recent = appointments.slice().reverse().slice(0, 4);
    
    recent.forEach(app => {
        const patientName = app.patient.fullName || 'Patient';
        const docEmail = app.doctor.account ? app.doctor.account.email : 'Doctor';
        const dateStr = formatDateTime(app.slot.startTime);
        const statusClass = getStatusClass(app.status);
        
        const item = document.createElement('div');
        item.className = `activity-item ${statusClass}`;
        item.innerHTML = `
            <div class="d-flex justify-content-between mb-1">
                <span class="font-semibold text-dark">${patientName} booked Dr. ${docEmail.split('@')[0]}</span>
                <span class="badge badge-status bg-${statusClass}-light text-${statusClass}">${app.status}</span>
            </div>
            <div class="text-xs text-muted">Scheduled time: ${dateStr}</div>
        `;
        list.appendChild(item);
    });
}

function getStatusClass(status) {
    switch (status) {
        case 'PENDING': return 'pending';
        case 'CONFIRMED':
        case 'IN_PROGRESS': return 'confirmed';
        case 'COMPLETED': return 'completed';
        case 'CANCELLED': return 'cancelled';
        default: return 'secondary';
    }
}

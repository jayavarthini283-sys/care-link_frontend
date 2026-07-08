document.addEventListener('DOMContentLoaded', async () => {
    const path = window.location.pathname;
    
    if (path.includes('appointment.html')) {
        await initBookingPage();
    } else if (path.includes('myappointments.html')) {
        await initAppointmentsListPage();
    }
});

// ==========================================
// 1. BOOKING PAGE CONTROLLER
// ==========================================
async function initBookingPage() {
    protectPage(['PATIENT']);
    
    const docSelect = document.getElementById('doctorSelect');
    const slotsSection = document.getElementById('slots-section');
    const slotsSpinner = document.getElementById('slots-spinner');
    const slotsGrid = document.getElementById('slots-grid');
    const noSlotsAlert = document.getElementById('no-slots-alert');
    const hiddenSlotInput = document.getElementById('selectedSlotId');
    const bookBtn = document.getElementById('bookBtn');
    const bookingForm = document.getElementById('bookingForm');
    const alertContainer = document.getElementById('alert-container');
    
    // Parse URL params for pre-selected doctor
    const urlParams = new URLSearchParams(window.location.search);
    const preSelectedDocId = urlParams.get('doctorId');
    
    let doctorsList = [];
    
    try {
        // Fetch all doctors to populate dropdown
        doctorsList = await apiFetch('/api/doctors');
        
        doctorsList.forEach(doc => {
            const email = doc.account ? doc.account.email : 'Doctor';
            const name = email.split('@')[0];
            const formattedName = name.charAt(0).toUpperCase() + name.slice(1);
            
            const opt = document.createElement('option');
            opt.value = doc.id;
            opt.textContent = `Dr. ${formattedName} (${doc.specialization || 'General'} - $${doc.consultationFee})`;
            docSelect.appendChild(opt);
        });
        
        // If doctor was pre-selected from URL
        if (preSelectedDocId) {
            docSelect.value = preSelectedDocId;
            // Trigger manual change to fetch slots
            await handleDoctorSelection(preSelectedDocId);
        }
    } catch (e) {
        console.error(e);
        showLocalAlert('danger', 'Failed to retrieve doctor directory. Please verify backend state.');
    }
    
    docSelect.addEventListener('change', async (e) => {
        const docId = e.target.value;
        await handleDoctorSelection(docId);
    });
    
    async function handleDoctorSelection(doctorId) {
        if (!doctorId) {
            slotsSection.classList.add('d-none');
            bookBtn.disabled = true;
            return;
        }
        
        slotsSection.classList.remove('d-none');
        slotsSpinner.classList.remove('d-none');
        slotsGrid.innerHTML = '';
        noSlotsAlert.classList.add('d-none');
        hiddenSlotInput.value = '';
        bookBtn.disabled = true;
        
        try {
            // Fetch slots for selected doctor
            const slots = await apiFetch(`/api/schedule/slots/${doctorId}`);
            slotsSpinner.classList.add('d-none');
            
            // Filter only available (not booked) slots
            const availableSlots = slots.filter(s => !s.booked);
            
            if (availableSlots.length === 0) {
                noSlotsAlert.classList.remove('d-none');
                return;
            }
            
            availableSlots.forEach(slot => {
                const dateStr = formatDateTime(slot.startTime);
                const endStr = formatDateTime(slot.endTime).split(', ')[1] || ''; // just show time for end
                
                const col = document.createElement('div');
                col.className = 'col';
                col.innerHTML = `
                    <input type="radio" class="btn-check" name="slotRadio" id="slot_${slot.id}" value="${slot.id}" autocomplete="off">
                    <label class="btn btn-outline-primary w-100 p-3 text-start d-flex justify-content-between align-items-center" for="slot_${slot.id}">
                        <div>
                            <div class="fw-bold"><i class="bi bi-calendar-event me-1"></i> ${dateStr.split(', ')[0]}</div>
                            <div class="text-xs text-muted mt-1"><i class="bi bi-clock me-1"></i> ${dateStr.split(', ')[1]} - ${endStr}</div>
                        </div>
                        <i class="bi bi-check-circle-fill text-success fs-5 check-icon d-none"></i>
                    </label>
                `;
                slotsGrid.appendChild(col);
                
                // Add event listener to each radio label interaction
                const input = col.querySelector('input');
                input.addEventListener('change', (e) => {
                    hiddenSlotInput.value = e.target.value;
                    bookBtn.disabled = false;
                    
                    // Toggle check icons
                    document.querySelectorAll('#slots-grid .check-icon').forEach(icon => icon.classList.add('d-none'));
                    col.querySelector('.check-icon').classList.remove('d-none');
                });
            });
            
        } catch (err) {
            console.error(err);
            slotsSpinner.classList.add('d-none');
            showLocalAlert('danger', 'Failed to retrieve available slots for the selected doctor.');
        }
    }
    
    // Form Submission
    bookingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        alertContainer.innerHTML = '';
        
        if (!bookingForm.checkValidity() || !hiddenSlotInput.value) {
            bookingForm.classList.add('was-validated');
            if (!hiddenSlotInput.value) {
                document.getElementById('slot-validation-msg').style.display = 'block';
            }
            return;
        }
        
        const slotId = parseInt(hiddenSlotInput.value);
        const reasonForVisit = document.getElementById('reasonForVisit').value.trim();
        
        const bookSpinner = document.getElementById('bookSpinner');
        const bookIcon = document.getElementById('bookIcon');
        
        bookBtn.disabled = true;
        bookSpinner.classList.remove('d-none');
        bookIcon.classList.add('d-none');
        
        try {
            await apiFetch('/api/appointments/book', {
                method: 'POST',
                body: JSON.stringify({ slotId, reasonForVisit })
            });
            
            showLocalAlert('success', 'Appointment booked successfully! Redirecting to schedule list...');
            setTimeout(() => {
                window.location.href = 'myappointments.html';
            }, 1500);
        } catch (err) {
            console.error(err);
            showLocalAlert('danger', err.message || 'Failed to book appointment. Check booking rules.');
            
            bookBtn.disabled = false;
            bookSpinner.classList.add('d-none');
            bookIcon.classList.remove('d-none');
        }
    });
    
    function showLocalAlert(type, message) {
        alertContainer.innerHTML = `
            <div class="alert alert-${type} alert-custom d-flex align-items-center animate__animated animate__shakeX" role="alert">
                <i class="bi bi-${type === 'success' ? 'check-circle-fill' : 'exclamation-triangle-fill'} me-2 fs-5"></i>
                <div>${message}</div>
            </div>
        `;
    }
}

// ==========================================
// 2. APPOINTMENTS LIST PAGE CONTROLLER
// ==========================================
async function initAppointmentsListPage() {
    protectPage(['PATIENT', 'DOCTOR']);
    
    const role = getUserRole();
    const spinner = document.getElementById('appointments-spinner');
    const noAppointments = document.getElementById('no-appointments');
    const tableCard = document.getElementById('table-card');
    const tbody = document.getElementById('appointments-tbody');
    const headersTr = document.getElementById('table-headers');
    const newBookingBtn = document.querySelector('.id-new-booking-btn');
    const alertContainer = document.getElementById('alert-container');
    
    // Hide new booking button for doctors (as they can't book appointments)
    if (role === 'DOCTOR') {
        newBookingBtn.classList.add('d-none');
        headersTr.children[1].textContent = 'Patient Details';
    } else {
        headersTr.children[1].textContent = 'Doctor Details';
    }
    
    await loadAppointmentsList();
    
    async function loadAppointmentsList() {
        spinner.classList.remove('d-none');
        tableCard.classList.add('d-none');
        noAppointments.classList.add('d-none');
        tbody.innerHTML = '';
        
        try {
            const appointments = await apiFetch('/api/appointments/my');
            spinner.classList.add('d-none');
            
            if (appointments.length === 0) {
                noAppointments.classList.remove('d-none');
                const actionBtn = noAppointments.querySelector('.id-action-btn');
                if (role === 'DOCTOR') {
                    noAppointments.querySelector('h5').textContent = 'No Consultations Scheduled';
                    noAppointments.querySelector('p').textContent = 'You do not have any patient appointments booked yet.';
                    actionBtn.href = 'schedule.html';
                    actionBtn.textContent = 'Manage Your Availability Slots';
                } else {
                    actionBtn.href = 'doctors.html';
                    actionBtn.textContent = 'Browse Available Doctors';
                }
                return;
            }
            
            tableCard.classList.remove('d-none');
            
            // Sort appointments: most recent first
            appointments.slice().reverse().forEach(app => {
                const tr = document.createElement('tr');
                
                // Column 2 - Details based on role
                let detailHtml = '';
                if (role === 'PATIENT') {
                    const docEmail = app.doctor.account ? app.doctor.account.email : 'Doctor';
                    const namePart = docEmail.split('@')[0];
                    detailHtml = `
                        <div class="fw-semibold text-dark">Dr. ${namePart.charAt(0).toUpperCase() + namePart.slice(1)}</div>
                        <div class="text-xs text-muted">${app.doctor.specialization || 'General Practice'}</div>
                    `;
                } else {
                    const patientName = app.patient.fullName || 'Patient';
                    detailHtml = `
                        <div class="fw-semibold text-dark">${patientName}</div>
                        <div class="text-xs text-muted">Blood: ${app.patient.bloodGroup || 'N/A'} | Mob: ${app.patient.emergencyContact || 'N/A'}</div>
                    `;
                }
                
                // Column 3 - Time Slot
                const dateStr = formatDateTime(app.slot.startTime);
                const endStr = formatDateTime(app.slot.endTime).split(', ')[1] || '';
                const timeHtml = `
                    <div class="fw-semibold">${dateStr.split(', ')[0]}</div>
                    <div class="text-xs text-muted">${dateStr.split(', ')[1]} - ${endStr}</div>
                `;
                
                // Column 5 - Status badge
                const statusClass = getStatusClass(app.status);
                const statusBadge = `<span class="badge badge-status bg-${statusClass}-light text-${statusClass}">${app.status}</span>`;
                
                // Column 6 - Actions
                let actionsHtml = '';
                if (app.status === 'PENDING' || app.status === 'CONFIRMED') {
                    actionsHtml = `
                        <button class="btn btn-outline-danger btn-sm rounded-pill px-3 py-1" onclick="triggerCancelAppointment(${app.id})">
                            <i class="bi bi-x-circle me-1"></i> Cancel
                        </button>
                    `;
                } else if (app.status === 'COMPLETED') {
                    actionsHtml = `
                        <button class="btn btn-outline-primary btn-sm rounded-pill px-3 py-1" onclick="viewPrescriptionModal(${app.id}, '${escapeHtml(app.diagnosis || '')}', '${escapeHtml(app.medications || '')}')">
                            <i class="bi bi-file-earmark-medical me-1"></i> View Prescription
                        </button>
                    `;
                } else {
                    actionsHtml = `<span class="text-muted text-xs">No actions</span>`;
                }
                
                tr.innerHTML = `
                    <td class="fw-bold">#${app.id}</td>
                    <td>${detailHtml}</td>
                    <td>${timeHtml}</td>
                    <td><div class="text-truncate text-sm" style="max-width: 200px;" title="${escapeHtml(app.reasonForVisit || '')}">${escapeHtml(app.reasonForVisit || 'N/A')}</div></td>
                    <td>${statusBadge}</td>
                    <td class="text-center">${actionsHtml}</td>
                `;
                tbody.appendChild(tr);
            });
            
        } catch (err) {
            console.error(err);
            spinner.classList.add('d-none');
            showGlobalAlert('danger', 'Failed to retrieve appointments list.');
        }
    }
    
    // Bind cancellation function globally so inline onclick works
    window.triggerCancelAppointment = async (appointmentId) => {
        if (!confirm('Are you sure you want to cancel this appointment? This cannot be undone.')) {
            return;
        }
        
        try {
            await apiFetch(`/api/appointments/cancel/${appointmentId}`, {
                method: 'PUT'
            });
            
            showGlobalAlert('success', 'Appointment cancelled successfully!');
            await loadAppointmentsList();
        } catch (err) {
            console.error(err);
            showGlobalAlert('danger', err.message || 'Failed to cancel appointment.');
        }
    };
    
    // Prescription Modal View
    window.viewPrescriptionModal = (id, diagnosis, medications) => {
        // Create dynamic modal
        let modalEl = document.getElementById('prescriptionModal');
        if (modalEl) {
            modalEl.remove();
        }
        
        modalEl = document.createElement('div');
        modalEl.className = 'modal fade';
        modalEl.id = 'prescriptionModal';
        modalEl.tabIndex = -1;
        modalEl.innerHTML = `
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content border-0 shadow-lg" style="border-radius: 15px;">
                    <div class="modal-header bg-primary text-white" style="border-top-left-radius: 15px; border-top-right-radius: 15px;">
                        <h5 class="modal-title fw-bold"><i class="bi bi-file-earmark-medical me-2"></i>Medical Record / Prescription</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body p-4">
                        <div class="mb-4">
                            <h6 class="fw-bold text-dark"><i class="bi bi-clipboard-pulse text-primary me-2"></i>Diagnosis</h6>
                            <p class="bg-light p-3 rounded-3 text-secondary text-sm border-start border-primary border-3" style="white-space: pre-wrap;">${diagnosis || 'No diagnosis recorded.'}</p>
                        </div>
                        <div>
                            <h6 class="fw-bold text-dark"><i class="bi bi-capsule text-success me-2"></i>Medications & Instructions</h6>
                            <p class="bg-light p-3 rounded-3 text-secondary text-sm border-start border-success border-3" style="white-space: pre-wrap;">${medications || 'No prescriptions written.'}</p>
                        </div>
                    </div>
                    <div class="modal-footer bg-light border-0" style="border-bottom-left-radius: 15px; border-bottom-right-radius: 15px;">
                        <button type="button" class="btn btn-secondary rounded-pill px-4" data-bs-dismiss="modal">Close</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modalEl);
        
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
    };
    
    function showGlobalAlert(type, message) {
        alertContainer.innerHTML = `
            <div class="alert alert-${type} alert-custom alert-dismissible fade show d-flex align-items-center mb-4" role="alert">
                <i class="bi bi-${type === 'success' ? 'check-circle-fill' : 'exclamation-triangle-fill'} me-2 fs-5"></i>
                <div>${message}</div>
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;
    }
}

function getStatusClass(status) {
    switch (status) {
        case 'PENDING': return 'warning';
        case 'CONFIRMED': return 'primary';
        case 'IN_PROGRESS': return 'info';
        case 'COMPLETED': return 'success';
        case 'CANCELLED': return 'danger';
        default: return 'secondary';
    }
}

function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

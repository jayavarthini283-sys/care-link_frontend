document.addEventListener('DOMContentLoaded', async () => {
    protectPage(['DOCTOR']);
    
    const spinner = document.getElementById('consultations-spinner');
    const noConsultations = document.getElementById('no-consultations');
    const tableCard = document.getElementById('table-card');
    const tbody = document.getElementById('consultations-tbody');
    const alertContainer = document.getElementById('alert-container');
    
    const finalizeModalEl = document.getElementById('finalizeModal');
    const finalizeForm = document.getElementById('finalizeForm');
    const finalizeApptIdInput = document.getElementById('finalizeApptId');
    const diagnosisInput = document.getElementById('diagnosis');
    const medicationsInput = document.getElementById('medications');
    const submitFinalizeBtn = document.getElementById('submitFinalizeBtn');
    const finalizeSpinner = document.getElementById('finalizeSpinner');
    const finalizeIcon = document.getElementById('finalizeIcon');
    
    let finalizeModal = null;
    if (finalizeModalEl) {
        finalizeModal = new bootstrap.Modal(finalizeModalEl);
    }
    
    await loadConsultations();
    
    async function loadConsultations() {
        spinner.classList.remove('d-none');
        tableCard.classList.add('d-none');
        noConsultations.classList.add('d-none');
        tbody.innerHTML = '';
        
        try {
            // Under DOCTOR role, /api/appointments/my returns doctor's assigned appointments
            const appointments = await apiFetch('/api/appointments/my');
            spinner.classList.add('d-none');
            
            if (appointments.length === 0) {
                noConsultations.classList.remove('d-none');
                return;
            }
            
            tableCard.classList.remove('d-none');
            
            // Render list (most recent first)
            appointments.slice().reverse().forEach(app => {
                const tr = document.createElement('tr');
                const patientName = app.patient.fullName || 'Patient';
                const dateStr = formatDateTime(app.slot.startTime);
                const statusClass = getStatusClass(app.status);
                
                // Determine action button
                let actionBtnHtml = '';
                if (app.status === 'PENDING') {
                    actionBtnHtml = `
                        <button class="btn btn-primary btn-sm rounded-pill px-3" onclick="triggerApprove(${app.id})">
                            <i class="bi bi-check-circle me-1"></i> Approve
                        </button>
                    `;
                } else if (app.status === 'CONFIRMED') {
                    actionBtnHtml = `
                        <button class="btn btn-warning btn-sm rounded-pill px-3 text-dark" onclick="triggerStart(${app.id})">
                            <i class="bi bi-play-circle me-1"></i> Start Consultation
                        </button>
                    `;
                } else if (app.status === 'IN_PROGRESS') {
                    actionBtnHtml = `
                        <button class="btn btn-success btn-sm rounded-pill px-3" onclick="openFinalizeModal(${app.id})">
                            <i class="bi bi-file-earmark-medical me-1"></i> Finalize Consultation
                        </button>
                    `;
                } else if (app.status === 'COMPLETED') {
                    actionBtnHtml = `
                        <button class="btn btn-outline-secondary btn-sm rounded-pill px-3" onclick="viewPrescriptionRecord(${app.id}, '${escapeHtml(app.diagnosis || '')}', '${escapeHtml(app.medications || '')}')">
                            <i class="bi bi-eye me-1"></i> View Record
                        </button>
                    `;
                } else {
                    actionBtnHtml = `<span class="text-muted text-xs">Cancelled</span>`;
                }
                
                tr.innerHTML = `
                    <td class="fw-bold">#${app.id}</td>
                    <td>
                        <div class="fw-semibold text-dark">${patientName}</div>
                        <div class="text-xs text-muted">${app.patient.account ? app.patient.account.email : ''}</div>
                    </td>
                    <td>
                        <div class="fw-semibold">${dateStr.split(', ')[0]}</div>
                        <div class="text-xs text-muted">${dateStr.split(', ')[1] || ''}</div>
                    </td>
                    <td><div class="text-truncate text-sm" style="max-width: 220px;" title="${escapeHtml(app.reasonForVisit || '')}">${escapeHtml(app.reasonForVisit || 'N/A')}</div></td>
                    <td>
                        <span class="badge badge-status bg-${statusClass}-light text-${statusClass}">${app.status}</span>
                    </td>
                    <td class="text-center">${actionBtnHtml}</td>
                `;
                tbody.appendChild(tr);
            });
        } catch (e) {
            console.error(e);
            spinner.classList.add('d-none');
            showGlobalAlert('danger', 'Failed to retrieve patient consultations directory.');
        }
    }
    
    // Core Action: Approve Appointment
    window.triggerApprove = async (id) => {
        try {
            await apiFetch(`/api/consultations/${id}/approve`, {
                method: 'POST'
            });
            showGlobalAlert('success', `Appointment #${id} approved and confirmed.`);
            await loadConsultations();
        } catch (e) {
            console.error(e);
            showGlobalAlert('danger', e.message || 'Failed to approve appointment.');
        }
    };
    
    // Core Action: Start Consultation
    window.triggerStart = async (id) => {
        try {
            await apiFetch(`/api/consultations/${id}/start`, {
                method: 'POST'
            });
            showGlobalAlert('success', `Consultation session initiated for Appointment #${id}.`);
            await loadConsultations();
        } catch (e) {
            console.error(e);
            showGlobalAlert('danger', e.message || 'Failed to start consultation.');
        }
    };
    
    // Open Finalize Dialog
    window.openFinalizeModal = (id) => {
        finalizeApptIdInput.value = id;
        diagnosisInput.value = '';
        medicationsInput.value = '';
        finalizeForm.classList.remove('was-validated');
        if (finalizeModal) {
            finalizeModal.show();
        }
    };
    
    // Submit Finalize Consultation Detail
    finalizeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!finalizeForm.checkValidity()) {
            finalizeForm.classList.add('was-validated');
            return;
        }
        
        const id = finalizeApptIdInput.value;
        const diagnosis = diagnosisInput.value.trim();
        const meds = medicationsInput.value.trim();
        
        submitFinalizeBtn.disabled = true;
        finalizeSpinner.classList.remove('d-none');
        finalizeIcon.classList.add('d-none');
        
        try {
            // Note: parameters must be passed in the URL (query parameters) per the backend controller definition
            await apiFetch(`/api/consultations/${id}/finalize?diagnosis=${encodeURIComponent(diagnosis)}&medicationsJson=${encodeURIComponent(meds)}`, {
                method: 'POST'
            });
            
            if (finalizeModal) {
                finalizeModal.hide();
            }
            
            showGlobalAlert('success', `Consultation #${id} finalized and prescription logged.`);
            await loadConsultations();
        } catch (err) {
            console.error(err);
            // Show error inside modal or global
            alert(`Finalize Failed: ${err.message || 'Check for prohibited substances.'}`);
        } finally {
            submitFinalizeBtn.disabled = false;
            finalizeSpinner.classList.add('d-none');
            finalizeIcon.classList.remove('d-none');
        }
    });
    
    // View Completed consultation prescription records
    window.viewPrescriptionRecord = (id, diagnosis, medications) => {
        let viewModalEl = document.getElementById('viewRecordModal');
        if (viewModalEl) {
            viewModalEl.remove();
        }
        
        viewModalEl = document.createElement('div');
        viewModalEl.className = 'modal fade';
        viewModalEl.id = 'viewRecordModal';
        viewModalEl.tabIndex = -1;
        viewModalEl.innerHTML = `
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content border-0 shadow-lg" style="border-radius: 15px;">
                    <div class="modal-header bg-secondary text-white" style="border-top-left-radius: 15px; border-top-right-radius: 15px;">
                        <h5 class="modal-title fw-bold"><i class="bi bi-file-earmark-text me-2"></i>Consultation Record #${id}</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body p-4">
                        <div class="mb-4">
                            <h6 class="fw-bold text-dark"><i class="bi bi-clipboard-pulse text-primary me-2"></i>Diagnosis Findings</h6>
                            <p class="bg-light p-3 rounded-3 text-secondary text-sm border-start border-primary border-3" style="white-space: pre-wrap;">${diagnosis || 'No diagnosis logged.'}</p>
                        </div>
                        <div>
                            <h6 class="fw-bold text-dark"><i class="bi bi-capsule text-success me-2"></i>Prescribed Medications</h6>
                            <p class="bg-light p-3 rounded-3 text-secondary text-sm border-start border-success border-3" style="white-space: pre-wrap;">${medications || 'No medications prescribed.'}</p>
                        </div>
                    </div>
                    <div class="modal-footer bg-light border-0" style="border-bottom-left-radius: 15px; border-bottom-right-radius: 15px;">
                        <button type="button" class="btn btn-secondary rounded-pill px-4" data-bs-dismiss="modal">Close</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(viewModalEl);
        
        const modal = new bootstrap.Modal(viewModalEl);
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
});

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

document.addEventListener('DOMContentLoaded', async () => {
    protectPage(['DOCTOR']);
    
    const form = document.getElementById('createSlotForm');
    const startInput = document.getElementById('startTime');
    const endInput = document.getElementById('endTime');
    const createBtn = document.getElementById('createBtn');
    const createSpinner = document.getElementById('createSpinner');
    const createIcon = document.getElementById('createIcon');
    
    const spinner = document.getElementById('slots-spinner');
    const noSlots = document.getElementById('no-slots');
    const tableWrapper = document.getElementById('slots-table-wrapper');
    const tbody = document.getElementById('slots-tbody');
    const alertContainer = document.getElementById('alert-container');
    
    // Set default datetimes (future, e.g., today + 1 hour)
    const now = new Date();
    now.setHours(now.getHours() + 1);
    now.setMinutes(0);
    now.setSeconds(0);
    
    const isoString = now.toISOString().slice(0, 16);
    startInput.value = isoString;
    
    now.setHours(now.getHours() + 1);
    endInput.value = now.toISOString().slice(0, 16);
    
    await loadSlots();
    
    async function loadSlots() {
        spinner.classList.remove('d-none');
        tableWrapper.classList.add('d-none');
        noSlots.classList.add('d-none');
        tbody.innerHTML = '';
        
        try {
            const slots = await apiFetch('/api/schedule/my');
            spinner.classList.add('d-none');
            
            if (slots.length === 0) {
                noSlots.classList.remove('d-none');
                return;
            }
            
            tableWrapper.classList.remove('d-none');
            
            // Sort: latest slots first
            slots.slice().reverse().forEach(slot => {
                const tr = document.createElement('tr');
                const startStr = formatDateTime(slot.startTime);
                const endStr = formatDateTime(slot.endTime);
                
                const statusBadge = slot.booked 
                    ? '<span class="badge bg-danger-light text-danger rounded-pill px-3 py-1.5 text-xs"><i class="bi bi-bookmark-fill me-1"></i> Booked</span>'
                    : '<span class="badge bg-success-light text-success rounded-pill px-3 py-1.5 text-xs"><i class="bi bi-check-circle-fill me-1"></i> Available</span>';
                
                tr.innerHTML = `
                    <td class="fw-bold">#${slot.id}</td>
                    <td>${startStr.split(', ')[0]}</td>
                    <td>${startStr.split(', ')[1] || 'N/A'}</td>
                    <td>${endStr.split(', ')[1] || 'N/A'}</td>
                    <td class="text-center">${statusBadge}</td>
                `;
                tbody.appendChild(tr);
            });
        } catch (e) {
            console.error(e);
            spinner.classList.add('d-none');
            showLocalAlert('danger', 'Failed to retrieve availability slots catalog.');
        }
    }
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        alertContainer.innerHTML = '';
        
        const startVal = startInput.value;
        const endVal = endInput.value;
        
        if (!form.checkValidity()) {
            form.classList.add('was-validated');
            return;
        }
        
        const startDate = new Date(startVal);
        const endDate = new Date(endVal);
        
        // Validation: Start time must be in future
        if (startDate < new Date()) {
            showLocalAlert('danger', 'Start time must be in the future.');
            return;
        }
        
        // Validation: End time must be after start time
        if (endDate <= startDate) {
            showLocalAlert('danger', 'End time must be after start time.');
            return;
        }
        
        // Format to ISO LocalDateTime string format expected by Spring Boot (YYYY-MM-DDTHH:MM:SS)
        // input value is YYYY-MM-DDTHH:MM, so we append :00
        const startIso = startVal + ':00';
        const endIso = endVal + ':00';
        
        createBtn.disabled = true;
        createSpinner.classList.remove('d-none');
        createIcon.classList.add('d-none');
        
        try {
            await apiFetch(`/api/schedule/slots?start=${encodeURIComponent(startIso)}&end=${encodeURIComponent(endIso)}`, {
                method: 'POST'
            });
            
            showLocalAlert('success', 'Availability slot created successfully!');
            form.classList.remove('was-validated');
            
            // Reload schedule list
            await loadSlots();
        } catch (err) {
            console.error(err);
            showLocalAlert('danger', err.message || 'Failed to create slot. Check for overlap.');
        } finally {
            createBtn.disabled = false;
            createSpinner.classList.add('d-none');
            createIcon.classList.remove('d-none');
        }
    });
    
    function showLocalAlert(type, message) {
        alertContainer.innerHTML = `
            <div class="alert alert-${type} alert-custom alert-dismissible fade show d-flex align-items-center mb-4" role="alert">
                <i class="bi bi-${type === 'success' ? 'check-circle-fill' : 'exclamation-triangle-fill'} me-2 fs-5"></i>
                <div>${message}</div>
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;
    }
});

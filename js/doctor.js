document.addEventListener('DOMContentLoaded', async () => {
    // Only patients can browse doctors and book
    protectPage(['PATIENT']);
    
    const searchInput = document.getElementById('search-input');
    const specFilter = document.getElementById('specialization-filter');
    const spinner = document.getElementById('doctors-spinner');
    const noDocs = document.getElementById('no-doctors');
    const grid = document.getElementById('doctors-grid');
    
    let doctors = [];
    
    try {
        doctors = await apiFetch('/api/doctors');
        spinner.classList.add('d-none');
        
        if (doctors.length === 0) {
            noDocs.classList.remove('d-none');
            return;
        }
        
        populateSpecializations(doctors);
        renderDoctors(doctors);
        
        // Search & filter event listeners
        searchInput.addEventListener('input', filterDoctors);
        specFilter.addEventListener('change', filterDoctors);
        
    } catch (error) {
        console.error('Error fetching doctors:', error);
        spinner.classList.add('d-none');
        noDocs.classList.remove('d-none');
        noDocs.innerHTML = `
            <div class="text-danger">
                <i class="bi bi-exclamation-triangle-fill display-4 mb-3"></i>
                <p>Failed to retrieve doctors list. Please check if the server is running.</p>
            </div>
        `;
    }
    
    function populateSpecializations(docList) {
        const specs = new Set();
        docList.forEach(d => {
            if (d.specialization) specs.add(d.specialization);
        });
        
        specs.forEach(spec => {
            const opt = document.createElement('option');
            opt.value = spec;
            opt.textContent = spec;
            specFilter.appendChild(opt);
        });
    }
    
    function renderDoctors(docList) {
        grid.innerHTML = '';
        if (docList.length === 0) {
            noDocs.classList.remove('d-none');
            return;
        }
        
        noDocs.classList.add('d-none');
        
        docList.forEach(doc => {
            const email = doc.account ? doc.account.email : 'Doctor';
            const name = email.split('@')[0];
            const formattedName = name.charAt(0).toUpperCase() + name.slice(1);
            
            const cardCol = document.createElement('div');
            cardCol.className = 'col animate__animated animate__fadeIn';
            cardCol.innerHTML = `
                <div class="card card-custom h-100 shadow-sm">
                    <div class="card-body d-flex flex-column">
                        <div class="d-flex align-items-center mb-3">
                            <div class="bg-primary-light text-primary rounded-circle d-flex align-items-center justify-content-center fw-bold fs-4 me-3" style="width: 50px; height: 50px;">
                                ${formattedName.charAt(0)}
                            </div>
                            <div>
                                <h5 class="card-title mb-0 fw-bold">Dr. ${formattedName}</h5>
                                <span class="text-xs text-muted fw-bold text-uppercase">${doc.specialization || 'General Practice'}</span>
                            </div>
                        </div>
                        
                        <hr class="mt-0">
                        
                        <div class="mb-3 flex-grow-1">
                            <div class="d-flex justify-content-between mb-2">
                                <span class="text-muted text-sm"><i class="bi bi-envelope me-1"></i> Email:</span>
                                <span class="text-dark text-sm fw-medium">${email}</span>
                            </div>
                            <div class="d-flex justify-content-between mb-2">
                                <span class="text-muted text-sm"><i class="bi bi-briefcase me-1"></i> Experience:</span>
                                <span class="text-dark text-sm fw-medium">${doc.yearsOfExperience || 0} years</span>
                            </div>
                            <div class="d-flex justify-content-between">
                                <span class="text-muted text-sm"><i class="bi bi-credit-card me-1"></i> Consultation Fee:</span>
                                <span class="text-dark text-sm fw-bold text-primary">$${doc.consultationFee || '0.00'}</span>
                            </div>
                        </div>
                        
                        <a href="appointment.html?doctorId=${doc.id}&doctorEmail=${encodeURIComponent(email)}&doctorSpec=${encodeURIComponent(doc.specialization || '')}" class="btn btn-primary w-100 mt-auto rounded-pill py-2 font-semibold">
                            <i class="bi bi-calendar-plus me-1"></i> Book Appointment
                        </a>
                    </div>
                </div>
            `;
            grid.appendChild(cardCol);
        });
    }
    
    function filterDoctors() {
        const query = searchInput.value.toLowerCase().trim();
        const spec = specFilter.value;
        
        const filtered = doctors.filter(doc => {
            const email = (doc.account ? doc.account.email : '').toLowerCase();
            const specialization = (doc.specialization || '').toLowerCase();
            const matchesQuery = email.includes(query) || specialization.includes(query);
            const matchesSpec = !spec || doc.specialization === spec;
            return matchesQuery && matchesSpec;
        });
        
        renderDoctors(filtered);
    }
});

const API_BASE_URL_SURAT = 'http://127.0.0.1:8000/api/persuratan';

function showToast(message, type = 'info') {
    let toastContainer = document.querySelector('.toast-container.position-fixed.top-0.end-0');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
        toastContainer.style.zIndex = '1150';
        document.body.appendChild(toastContainer);
    }

    let bgColorClass = 'text-bg-info';
    let iconClass = 'fas fa-info-circle';
    switch (type) {
        case 'success': bgColorClass = 'text-bg-success'; iconClass = 'fas fa-check-circle'; break;
        case 'danger': bgColorClass = 'text-bg-danger'; iconClass = 'fas fa-exclamation-triangle'; break;
        case 'warning': bgColorClass = 'text-bg-warning text-dark'; iconClass = 'fas fa-exclamation-circle'; break;
    }

    const toastEl = document.createElement('div');
    toastEl.className = `toast align-items-center ${bgColorClass} border-0`;
    toastEl.setAttribute('role', 'alert');
    toastEl.setAttribute('aria-live', 'assertive');
    toastEl.setAttribute('aria-atomic', 'true');
    toastEl.innerHTML = `
        <div class="d-flex">
            <div class="toast-body"><i class="${iconClass} me-2"></i> ${message}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;
    toastContainer.appendChild(toastEl);

    if (typeof bootstrap !== 'undefined' && bootstrap.Toast) {
        const toast = new bootstrap.Toast(toastEl, { delay: 4000 });
        try { toast.show(); } catch (e) { console.error("Gagal menampilkan Bootstrap toast:", e); alert(message); }
    } else {
        console.error("Komponen Bootstrap Toast tidak tersedia.");
        alert(message);
    }
    toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
}

function formatDateForInput(isoString) {
    if (!isoString) return '';
    try {
        return isoString.split('T')[0];
    } catch (e) {
        console.error("Error formatting date for input:", isoString, e);
        return '';
    }
}

function goBack() {
    window.history.back();
}

function toggleSidebar() {
    document.body.classList.toggle("sidebar-open");
    const sidebar = document.querySelector(".sidebar");
    if (sidebar) sidebar.classList.toggle("active");
}

function closeSidebar() {
    document.body.classList.remove("sidebar-open");
    const sidebar = document.querySelector(".sidebar");
    if (sidebar) sidebar.classList.remove("active");
}

async function fetchAndPopulateFormSurat(id, token, form) {
    console.log(`Mengambil data surat ID: ${id}`);
    const apiUrl = `${API_BASE_URL_SURAT}/${id}`;
    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton) submitButton.disabled = true;

    try {
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
        });

        if (response.status === 401) {
            showToast('Sesi tidak valid. Silakan login ulang.', 'danger');
            localStorage.removeItem('access_token');
            localStorage.removeItem('user_id');
            setTimeout(() => { window.location.href = 'login.html'; }, 2500);
            throw new Error('Unauthorized');
        }
        if (response.status === 404) throw new Error(`Data surat ID ${id} tidak ditemukan.`);
        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({}));
            throw new Error(errorBody.message || `Gagal memuat data (Status: ${response.status})`);
        }
        
        let suratData = await response.json();
        if (suratData.data && typeof suratData.data === 'object') {
             suratData = suratData.data;
        }
        console.log("Data surat diterima:", suratData);

        const setInputValue = (elementId, value) => {
            const el = form.querySelector(`#${elementId}`);
            if (el) {
                el.value = value !== null && value !== undefined ? value : '';
            } else {
                console.warn(`Elemen #${elementId} tidak ditemukan di form.`);
            }
        };

        setInputValue("suratId", suratData.id);
        setInputValue("no_surat", suratData.no_surat);
        setInputValue("tanggal_masuk", formatDateForInput(suratData.tanggal_masuk));
        setInputValue("dari", suratData.dari);
        setInputValue("kepada", suratData.kepada);
        setInputValue("perihal", suratData.perihal);
        setInputValue("catatan", suratData.catatan);
        setInputValue("jenis_surat", suratData.jenis_surat);
        setInputValue("status", suratData.status);

        const currentFileDataInput = form.querySelector('#current_file_data');
        let fileToStore = '[]';

        if (suratData.file_lampiran) {
            if (typeof suratData.file_lampiran === 'string') {
                try {
                    JSON.parse(suratData.file_lampiran);
                    fileToStore = suratData.file_lampiran;
                } catch (e) {
                    fileToStore = JSON.stringify([suratData.file_lampiran]);
                }
            } else if (Array.isArray(suratData.file_lampiran)) {
                fileToStore = JSON.stringify(suratData.file_lampiran);
            }
        }
        if (currentFileDataInput) { currentFileDataInput.value = fileToStore; }
        else { console.warn("Hidden input #current_file_data tidak ditemukan."); }

        const currentFileContainer = document.getElementById("currentFilePreview");
        if (currentFileContainer) {
            currentFileContainer.innerHTML = '';
            try {
                const fileList = JSON.parse(fileToStore);
                if (Array.isArray(fileList) && fileList.length > 0) {
                    fileList.forEach(filePath => {
                        if (typeof filePath === 'string' && filePath.trim()) {
                            const fileName = filePath.split('/').pop();
                            const fileUrl = `http://127.0.0.1:8000/storage/${filePath}`; 
                            
                            const fileLink = document.createElement('a');
                            fileLink.href = fileUrl;
                            fileLink.target = '_blank';
                            
                            fileLink.className = 'btn btn-sm btn-success text-white btn-sm me-2 mb-2 text-decoration-none'; 
                            fileLink.innerHTML = `<i class="fas fa-file-alt me-1"></i> ${fileName}`;
                            currentFileContainer.appendChild(fileLink);
                        }
                    });
                } else {
                    currentFileContainer.innerHTML = '<p class="text-muted fst-italic">Tidak ada file lampiran.</p>';
                }
            } catch (e) {
                console.error("Error proses preview file:", e);
                currentFileContainer.innerHTML = '<p class="text-danger"><em>Gagal memuat preview file.</em></p>';
            }
        } else {
             console.warn("Elemen #currentFilePreview untuk menampilkan file lama tidak ditemukan.");
        }

        if (submitButton) submitButton.disabled = false;

    } catch (error) {
        console.error("Error fetch/populate:", error);
        if (error.message !== 'Unauthorized') {
            showToast(error.message || "Gagal memuat data surat.", 'danger');
            if (form) form.innerHTML = `<div class="alert alert-danger p-4 text-center">${error.message || "Gagal memuat data surat."} <br> <a href="persuratan.html">Kembali ke Daftar Surat</a></div>`;
        }
        if (submitButton) submitButton.disabled = true;
    }
}

async function handleUpdateSubmitSurat(id, token, form) {
    console.log(`Menyimpan perubahan surat ID: ${id}`);
    const submitButton = form.querySelector('button[type="submit"]');
    const originalButtonText = submitButton ? submitButton.innerHTML : 'Simpan Perubahan';
    if (submitButton) {
        submitButton.disabled = true;
        submitButton.innerHTML = `<span class="spinner-border spinner-border-sm" aria-hidden="true"></span> Menyimpan...`;
    }

    const formData = new FormData();
    formData.append('_method', 'PUT');

    const userId = localStorage.getItem("user_id");
    if (userId) {
        formData.append("user_id", userId);
    } else {
        showToast('ID pengguna tidak ditemukan. Sesi mungkin berakhir, silakan login ulang.', 'danger');
        if (submitButton) { submitButton.disabled = false; submitButton.innerHTML = originalButtonText; }
        return;
    }

    const fieldsToGet = {
        "suratId": "suratId",
        "no_surat": "no_surat",
        "tanggal_masuk": "tanggal_masuk",
        "dari": "dari",
        "kepada": "kepada",
        "perihal": "perihal",
        "catatan": "catatan",
        "jenis_surat": "jenis_surat",
        "status": "status"
    };

    for (const htmlId in fieldsToGet) {
        const backendFieldName = fieldsToGet[htmlId];
        const element = form.querySelector(`#${htmlId}`);
        if (element) {
            formData.append(backendFieldName, element.value);
        } else {
            console.warn(`Elemen #${htmlId} untuk field '${backendFieldName}' tidak ditemukan saat submit.`);
        }
    }
    
    const newFileInput = form.querySelector('#file_lampiran_input');
    const files = newFileInput ? newFileInput.files : null;

    if (files && files.length > 0) {
        console.log(`File baru terdeteksi: ${files.length}`);
        for (const file of files) {
            if (file.size > 10 * 1024 * 1024) {
                showToast(`Ukuran file '${file.name}' (${(file.size / (1024 * 1024)).toFixed(2)} MB) melebihi batas.`, 'warning');
                if (submitButton) { submitButton.disabled = false; submitButton.innerHTML = originalButtonText; }
                return;
            }
            formData.append("file_lampiran[]", file, file.name);
        }
    } else {
        console.log("Tidak ada file baru diunggah. Mempertahankan file lama jika ada.");
    }

    const apiUrl = `${API_BASE_URL_SURAT}/${id}`;

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
            body: formData
        });

        const result = await response.json().catch(() => ({ message: "Respons error tidak valid dari server." }));

        if (response.ok) {
            console.log("Update sukses:", result);
            showToast(result.message || "Data surat berhasil diperbarui.", 'success');
            setTimeout(() => { window.location.href = `persuratan.html`; }, 1500);
        } else {
            let errorMessage = result.message || `Gagal menyimpan data (Status: ${response.status}).`;
            if (response.status === 422 && result.errors) {
                errorMessage = "Terdapat kesalahan input:<br>";
                Object.keys(result.errors).forEach(field => {
                    errorMessage += `- ${field}: ${result.errors[field].join(', ')}<br>`;
                });
            }
            throw new Error(errorMessage);
        }
    } catch (error) {
        console.error("Error saat update:", error);
        showToast(error.message || "Gagal menyimpan perubahan data surat.", 'danger');
    } finally {
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
        showToast('Anda harus login untuk mengakses halaman ini.', 'danger');
        setTimeout(() => { window.location.href = 'login.html'; }, 2500);
        return;
    }

    const form = document.getElementById('suratUpdateForm');
    const logoutLink = document.getElementById('logoutLink');
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get("id");

    if (!form) {
        console.error("Form #suratUpdateForm tidak ditemukan!");
        showToast("Error Kritis: Form update tidak ditemukan.", "danger");
        const mainContent = document.querySelector('.main-content, .main, .container-fluid');
        if(mainContent) mainContent.innerHTML = '<div class="alert alert-danger m-5 text-center">Error: Form update tidak dapat dimuat. <br> <a href="persuratan.html">Kembali ke Daftar Surat</a></div>';
        return;
    }

    if (!form.querySelector('#current_file_data')) {
        const hiddenInput = document.createElement('input');
        hiddenInput.type = 'hidden';
        hiddenInput.id = 'current_file_data';
        form.appendChild(hiddenInput);
        console.log("Hidden input #current_file_data telah ditambahkan ke form.");
    }

    if (!id) {
        showToast("ID surat tidak ditemukan di URL. Tidak dapat memuat data.", "warning");
        form.innerHTML = '<div class="alert alert-warning p-4 text-center">ID surat tidak valid atau tidak disertakan. <br> <a href="persuratan.html">Kembali ke Daftar Surat</a></div>';
        return;
    }

    fetchAndPopulateFormSurat(id, token, form);

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        handleUpdateSubmitSurat(id, token, form);
    });

    if (logoutLink) {
        logoutLink.addEventListener('click', (event) => {
            event.preventDefault();
            localStorage.clear();
            showToast('Logout berhasil.', 'success');
            setTimeout(() => { window.location.href = 'login.html'; }, 1000);
        });
    }
});

window.toggleSidebar = toggleSidebar;
window.closeSidebar = closeSidebar;
window.goBack = goBack;
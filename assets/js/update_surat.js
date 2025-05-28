/**
 * update_surat.js
 * Mirip dengan update_item.js, tetapi untuk entitas "surat".
 */

// --- Global Constants ---
const API_BASE_URL_SURAT = 'http://127.0.0.1:8000/api/persuratan';

// --- Utility Functions ---
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

// Format tanggal ISO ke YYYY-MM-DD
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

// --- Fetch and Populate Form (for Surat) ---
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
            setTimeout(() => { window.location.href = 'login.html'; }, 2500);
            throw new Error('Unauthorized');
        }
        if (response.status === 404) throw new Error(`Data surat ID ${id} tidak ditemukan.`);
        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({}));
            throw new Error(errorBody.message || `Gagal memuat data (Status: ${response.status})`);
        }
        const data = await response.json();
        console.log("Data surat diterima:", data);

        const setInputValue = (elementId, value) => {
            const el = form.querySelector(`#${elementId}`);
            if (el) { el.value = value ?? ''; }
            else { console.warn(`Elemen #${elementId} tidak ditemukan.`); }
        };

        // Populate surat specific fields
        setInputValue("suratId", data.id); // Hidden ID for surat
        setInputValue("no_surat", data.no_surat);
        setInputValue("tanggal_masuk", formatDateForInput(data.tanggal_masuk));
        setInputValue("dari", data.dari);
        setInputValue("kepada", data.kepada);
        setInputValue("perihal", data.perihal);
        setInputValue("catatan", data.catatan);

        // Simpan file lama (sebagai string JSON) di hidden input
        const currentFileDataInput = form.querySelector('#current_file_data');
        let fileToStore = '[]';
        if (data.file) {
            if (typeof data.file === 'string') {
                try { JSON.parse(data.file); fileToStore = data.file; }
                catch(e) { fileToStore = JSON.stringify([data.file]); }
            } else if (Array.isArray(data.file)) {
                fileToStore = JSON.stringify(data.file);
            }
        }
        if (currentFileDataInput) { currentFileDataInput.value = fileToStore; }
        else { console.warn("Hidden input #current_file_data tidak ditemukan."); }

        // Tampilkan preview file lama
        const currentFileContainer = document.getElementById("currentFile");
        if (currentFileContainer) {
            currentFileContainer.innerHTML = '';
            try {
                const fileList = JSON.parse(fileToStore);
                if (Array.isArray(fileList) && fileList.length > 0) {
                    fileList.forEach(src => {
                        if (typeof src === 'string' && src.trim()) {
                            let filePath = src.replace(/\\/g, '/').replace(/^surat\/?/i, '');
                            const fileUrl = `http://127.0.0.1:8000/storage/surat/${filePath}`;
                            const fileLink = document.createElement('a');
                            fileLink.href = fileUrl; fileLink.target = '_blank';
                            fileLink.className = 'd-inline-block me-2 mb-2 border rounded p-1';
                            fileLink.innerText = filePath.split('/').pop();
                            currentFileContainer.appendChild(fileLink);
                        }
                    });
                } else {
                    currentFileContainer.innerHTML = '<p class="text-muted fst-italic">Tidak ada file.</p>';
                }
            } catch (e) {
                console.error("Error proses preview file:", e);
                currentFileContainer.innerHTML = '<p class="text-danger"><em>Gagal memuat preview.</em></p>';
            }
        }

        if (submitButton) submitButton.disabled = false;

    } catch (error) {
        console.error("Error fetch/populate:", error);
        if (error.message !== 'Unauthorized') {
            showToast(error.message || "Gagal memuat data.", 'danger');
            if (form) form.innerHTML = `<div class="alert alert-danger p-4">${error.message || "Gagal memuat data."}</div>`;
        }
        if (submitButton) submitButton.disabled = true;
    }
}

// --- Handle Update Submit (for Surat) ---
async function handleUpdateSubmitSurat(id, token, form) {
    console.log(`Menyimpan perubahan surat ID: ${id}`);
    const submitButton = form.querySelector('button[type="submit"]');
    const originalButtonText = submitButton ? submitButton.innerHTML : 'Simpan';
    if (submitButton) {
        submitButton.disabled = true;
        submitButton.innerHTML = `<span class="spinner-border spinner-border-sm" aria-hidden="true"></span> Menyimpan...`;
    }

    const formData = new FormData();
    formData.append('_method', 'PUT');

    // Pastikan user_id juga dikirim
    const userId = localStorage.getItem("user_id");
    if (userId) {
        formData.append("user_id", userId);
    } else {
        showToast('ID pengguna tidak ditemukan. Silakan login ulang.', 'danger');
        setTimeout(() => { window.location.href = 'login.html'; }, 1500);
        if (submitButton) { submitButton.disabled = false; submitButton.innerHTML = originalButtonText; }
        return;
    }

    // Append surat specific fields
    const fieldsToAppend = ["nomor_surat", "pengirim", "penerima", "perihal", "keterangan"];
    fieldsToAppend.forEach(fieldId => {
        const element = form.querySelector(`#${fieldId}`);
        if (element) {
            formData.append(fieldId, element.value);
        }
    });

    // Tanggal Surat
    const tanggalSuratInput = form.querySelector('#tanggal_surat');
    if (tanggalSuratInput && tanggalSuratInput.value) {
        formData.append("tanggal_surat", tanggalSuratInput.value);
    } else {
        formData.append("tanggal_surat", '');
    }

    // Handle new file uploads
    const fileInput = form.querySelector('#file'); // ID for new file input
    const files = fileInput ? fileInput.files : null;

    if (files && files.length > 0) {
        console.log(`File baru terdeteksi: ${files.length}`);
        for (const file of files) {
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                showToast(`Ukuran file '${file.name}' (${(file.size / (1024 * 1024)).toFixed(2)} MB) melebihi batas 5MB.`, 'warning');
                if (submitButton) { submitButton.disabled = false; submitButton.innerHTML = originalButtonText; }
                return;
            }
            formData.append("file[]", file);
        }
    } else {
        console.log("Tidak ada file baru. Mengirim info file lama.");
        const currentFileDataInput = form.querySelector('#current_file_data');
        if (currentFileDataInput && currentFileDataInput.value && currentFileDataInput.value !== '[]') {
            formData.append("current_file", currentFileDataInput.value);
        }
    }

    // Add updated_at timestamp
    const now = new Date().toISOString().slice(0, 19).replace("T", " ");
    formData.append("updated_at", now);

    const apiUrl = `${API_BASE_URL_SURAT}/${id}`;

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
            body: formData
        });

        if (response.ok) {
            const data = await response.json();
            console.log("Update sukses:", data);
            showToast(data.message || "Data surat berhasil diperbarui.", 'success');
            setTimeout(() => { window.location.href = `surat.html`; }, 1500);
        } else {
            const errorData = await response.json().catch(() => ({ message: "Respons error tidak valid." }));
            let errorMessage = errorData.message || `Gagal menyimpan (Status: ${response.status}).`;
            if (response.status === 422 && errorData.errors) {
                errorMessage = "Kesalahan input:<br>";
                Object.keys(errorData.errors).forEach(field => {
                    errorMessage += `- ${field}: ${errorData.errors[field].join(', ')}<br>`;
                });
            }
            throw new Error(errorMessage);
        }
    } catch (error) {
        console.error("Error saat update:", error);
        showToast(error.message || "Gagal menyimpan data.", 'danger');
    } finally {
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;
        }
    }
}

// --- Page Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
        showToast('Anda harus login.', 'danger');
        setTimeout(() => { window.location.href = 'login.html'; }, 2500);
        return;
    }

    const form = document.getElementById('suratUpdateForm');
    const logoutLink = document.getElementById('logoutLink');
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get("id");

    if (!form) {
        console.error("Form #suratUpdateForm tidak ditemukan!");
        document.body.innerHTML = '<div class="alert alert-danger m-5">Error: Form update tidak ditemukan.</div>';
        return;
    }

    // Dinamis tambahkan hidden input untuk file lama jika tidak ada di HTML
    if (!form.querySelector('#current_file_data')) {
        const hiddenInput = document.createElement('input');
        hiddenInput.type = 'hidden';
        hiddenInput.id = 'current_file_data';
        form.appendChild(hiddenInput);
    }

    if (!id) {
        showToast("ID surat tidak ditemukan di URL.", "warning");
        form.innerHTML = '<div class="alert alert-warning p-4">ID surat tidak valid.</div>';
        return;
    }

    // Panggil fetch data awal
    fetchAndPopulateFormSurat(id, token, form);

    // Tambahkan listener submit
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        handleUpdateSubmitSurat(id, token, form);
    });

    // Tambahkan listener logout
    if (logoutLink) {
        logoutLink.addEventListener('click', (event) => {
            event.preventDefault();
            localStorage.clear();
            showToast('Logout berhasil.', 'success');
            setTimeout(() => { window.location.href = 'login.html'; }, 1000);
        });
    }
});

// Expose functions to global scope for HTML onclick attributes
window.toggleSidebar = toggleSidebar;
window.closeSidebar = closeSidebar;
window.goBack = goBack;
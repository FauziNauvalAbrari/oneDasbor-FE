const API_BASE_URL_INVENTORY = 'http://127.0.0.1:8000/api/inventory';

function showToast(message, type = 'info') {
    let toastContainer = document.querySelector('.toast-container.position-fixed.top-0.end-0');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
        toastContainer.style.zIndex = '1100';
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

async function fetchAndPopulateForm(id, token, form) {
    console.log(`Mengambil data inventaris ID: ${id}`);
    const apiUrl = `${API_BASE_URL_INVENTORY}/${id}`;
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
        if (response.status === 404) throw new Error(`Data inventaris ID ${id} tidak ditemukan.`);
        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({}));
            throw new Error(errorBody.message || `Gagal memuat data (Status: ${response.status})`);
        }
        const data = await response.json();
        console.log("Data inventaris diterima:", data);

        const setInputValue = (elementId, value) => {
            const el = form.querySelector(`#${elementId}`);
            if (el) { el.value = value ?? ''; }
            else { console.warn(`Elemen #${elementId} tidak ditemukan.`); }
        };
        
        setInputValue("itemId", data.id);
        setInputValue("kode_barang", data.kode_barang);
        setInputValue("nama_barang", data.nama_barang);
        setInputValue("stok", data.stok);
        setInputValue("status", data.status);
        setInputValue("lokasi", data.lokasi);
        setInputValue("pemilik", data.pemilik);
        setInputValue("tanggal_masuk", formatDateForInput(data.tanggal_masuk));
        setInputValue("tanggal_terpakai", formatDateForInput(data.tanggal_terpakai));

        const currentFotoDataInput = form.querySelector('#current_foto_data');
        let fotoToStore = '[]';
        if (data.foto) {
            if (typeof data.foto === 'string') {
                try { JSON.parse(data.foto); fotoToStore = data.foto; }
                catch(e) { fotoToStore = JSON.stringify([data.foto]); }
            } else if (Array.isArray(data.foto)) {
                fotoToStore = JSON.stringify(data.foto);
            }
        }
        if (currentFotoDataInput) { currentFotoDataInput.value = fotoToStore; }
        else { console.warn("Hidden input #current_foto_data tidak ditemukan."); }

        const currentFotoContainer = document.getElementById("currentFoto");
        if (currentFotoContainer) {
            currentFotoContainer.innerHTML = '';
            try {
                const fotoList = JSON.parse(fotoToStore);
                if (Array.isArray(fotoList) && fotoList.length > 0) {
                    fotoList.forEach(src => {
                        if (typeof src === 'string' && src.trim()) {
                            let imagePath = src.replace(/\\/g, '/').replace(/^inventaris\/?/i, '');
                            const imageUrl = `http://127.0.0.1:8000/storage/inventaris/${imagePath}`;
                            const imgLink = document.createElement('a');
                            imgLink.href = imageUrl; imgLink.target = '_blank';
                            imgLink.className = 'd-inline-block me-2 mb-2 border rounded p-1';
                            const img = document.createElement('img');
                            img.src = imageUrl; img.className = "img-fluid";
                            img.style.cssText = 'max-width: 100px; max-height: 80px;';
                            img.alt = imagePath.split('/').pop();
                            img.onerror = () => { imgLink.style.display = 'none'; console.warn(`Gagal load image: ${imageUrl}`); };
                            imgLink.appendChild(img);
                            currentFotoContainer.appendChild(imgLink);
                        }
                    });
                } else {
                    currentFotoContainer.innerHTML = '<p class="text-muted fst-italic">Tidak ada foto.</p>';
                }
            } catch (e) {
                console.error("Error proses preview foto:", e);
                currentFotoContainer.innerHTML = '<p class="text-danger"><em>Gagal memuat preview.</em></p>';
            }
        }

        if (submitButton) submitButton.disabled = false;

        manageTanggalTerpakaiStatus();

    } catch (error) {
        console.error("Error fetch/populate:", error);
        if (error.message !== 'Unauthorized') {
            showToast(error.message || "Gagal memuat data.", 'danger');
            if (form) form.innerHTML = `<div class="alert alert-danger p-4">${error.message || "Gagal memuat data."}</div>`;
        }
        if (submitButton) submitButton.disabled = true;
    }
}

async function handleUpdateSubmit(id, token, form) {
    console.log(`Menyimpan perubahan inventaris ID: ${id}`);
    const submitButton = form.querySelector('button[type="submit"]');
    const originalButtonText = submitButton ? submitButton.innerHTML : 'Simpan';
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
        showToast('ID pengguna tidak ditemukan. Silakan login ulang.', 'danger');
        setTimeout(() => { window.location.href = 'login.html'; }, 1500);
        if (submitButton) { submitButton.disabled = false; submitButton.innerHTML = originalButtonText; }
        return;
    }

    const fieldsToAppend = ["kode_barang", "nama_barang", "stok", "lokasi", "pemilik"];
    fieldsToAppend.forEach(fieldId => {
        const element = form.querySelector(`#${fieldId}`);
        if (element) {
            formData.append(fieldId, element.value);
        }
    });

    const tanggalMasukInput = form.querySelector('#tanggal_masuk');
    if (tanggalMasukInput && tanggalMasukInput.value) {
        formData.append("tanggal_masuk", tanggalMasukInput.value);
    } else {
        formData.append("tanggal_masuk", '');
    }

    const statusSelect = form.querySelector('#status');
    const tanggalTerpakaiInput = form.querySelector('#tanggal_terpakai');
    if (statusSelect && statusSelect.value !== 'tersedia' && tanggalTerpakaiInput && tanggalTerpakaiInput.value) {
        formData.append("tanggal_terpakai", tanggalTerpakaiInput.value);
    } else {
        formData.append("tanggal_terpakai", '');
    }
    if (statusSelect) {
        formData.append("status", statusSelect.value);
    }

    const fileInput = form.querySelector('#foto');
    const files = fileInput ? fileInput.files : null;

    if (files && files.length > 0) {
        console.log(`File baru terdeteksi: ${files.length}`);
        for (const file of files) {
            if (file.size > 2 * 1024 * 1024) {
                showToast(`Ukuran foto '${file.name}' (${(file.size / (1024 * 1024)).toFixed(2)} MB) melebihi batas 2MB.`, 'warning');
                if (submitButton) { submitButton.disabled = false; submitButton.innerHTML = originalButtonText; }
                return;
            }
            formData.append("foto[]", file);
        }
    } else {
        console.log("Tidak ada file baru. Mengirim info foto lama.");
        const currentFotoDataInput = form.querySelector('#current_foto_data');
        if (currentFotoDataInput && currentFotoDataInput.value && currentFotoDataInput.value !== '[]') {
            formData.append("current_foto", currentFotoDataInput.value);
        }
    }
    
    const now = new Date().toISOString().slice(0, 19).replace("T", " ");
    formData.append("updated_at", now);

    const apiUrl = `${API_BASE_URL_INVENTORY}/${id}`;

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
            body: formData
        });

        if (response.ok) {
            const data = await response.json();
            console.log("Update sukses:", data);
            showToast(data.message || "Data barang berhasil diperbarui.", 'success');
            setTimeout(() => { window.location.href = `inventory.html`; }, 1500);
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

function manageTanggalTerpakaiStatus() {
    const statusSelect = document.getElementById('status');
    const tanggalTerpakaiInput = document.getElementById('tanggal_terpakai');
    if (statusSelect && tanggalTerpakaiInput) {
        if (statusSelect.value === 'tersedia') {
            tanggalTerpakaiInput.value = '';
            tanggalTerpakaiInput.disabled = true;
            tanggalTerpakaiInput.placeholder = 'Tidak berlaku untuk status tersedia';
        } else {
            tanggalTerpakaiInput.disabled = false;
            tanggalTerpakaiInput.placeholder = '';
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
        showToast('Anda harus login.', 'danger');
        setTimeout(() => { window.location.href = 'login.html'; }, 2500);
        return;
    }

    const form = document.getElementById('itemUpdateForm');
    const logoutLink = document.getElementById('logoutLink');
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get("id");

    if (!form) {
        console.error("Form #itemUpdateForm tidak ditemukan!");
        document.body.innerHTML = '<div class="alert alert-danger m-5">Error: Form update tidak ditemukan.</div>';
        return;
    }

    if (!form.querySelector('#current_foto_data')) {
        const hiddenInput = document.createElement('input');
        hiddenInput.type = 'hidden';
        hiddenInput.id = 'current_foto_data';
        form.appendChild(hiddenInput);
    }
    
    const statusSelect = document.getElementById('status');
    if (statusSelect) {
        statusSelect.addEventListener('change', manageTanggalTerpakaiStatus);
    }

    if (!id) {
        showToast("ID inventaris tidak ditemukan di URL.", "warning");
        form.innerHTML = '<div class="alert alert-warning p-4">ID inventaris tidak valid.</div>';
        return;
    }

    fetchAndPopulateForm(id, token, form);

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        handleUpdateSubmit(id, token, form);
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
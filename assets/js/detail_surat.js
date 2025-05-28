const API_BASE_URL_SURAT = 'http://127.0.0.1:8000/api/persuratan'; // Pastikan URL ini benar

// --- Fungsi Utilitas ---
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
    // ... (sisa implementasi toast) ...
    toastEl.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                <i class="${iconClass} me-2"></i> ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;
    toastContainer.appendChild(toastEl);
    if (typeof bootstrap !== 'undefined' && bootstrap.Toast) {
        const toast = new bootstrap.Toast(toastEl, { delay: 4000 });
        try { toast.show(); } catch (e) { console.error("Gagal menampilkan Bootstrap toast:", e); alert(message); }
    } else {
        console.error("Komponen Bootstrap Toast tidak tersedia."); alert(message);
    }
    toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
}

function goBack() { window.history.back(); }
function toggleSidebar() { /* ... implementasi Anda ... */ 
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
        document.body.classList.toggle('sidebar-open');
        sidebar.classList.toggle('active');
    }
}
function closeSidebar() { /* ... implementasi Anda ... */
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
        document.body.classList.remove('sidebar-open');
        sidebar.classList.remove('active');
    }
}

// Fungsi badge status TERBARU dengan TULISAN PUTIH
function getStatusBadgeSuratHtml(status) {
    status = status ? status.toLowerCase().trim() : 'unknown';
    const statusMap = {
        'pending': { class: 'bg-gradient-warning text-white', text: 'PENDING' },
        'diajukan': { class: 'bg-gradient-info text-white', text: 'DIAJUKAN' },
        'disetujui': { class: 'bg-gradient-success text-white', text: 'DISETUJUI' },
        'ditolak': { class: 'bg-gradient-danger text-white', text: 'DITOLAK' },
        'selesai': { class: 'bg-gradient-primary text-white', text: 'SELESAI' },
        'diperbaiki': { class: 'bg-gradient-secondary text-white', text: 'PERLU DIPERBAIKI' },
        'approve': { class: 'bg-gradient-success text-white', text: 'APPROVED' }, // Alias
        'approved': { class: 'bg-gradient-success text-white', text: 'APPROVED' }, // Alias
        'disapprove': { class: 'bg-gradient-danger text-white', text: 'DISAPPROVED' }, // Alias
        'disapproved': { class: 'bg-gradient-danger text-white', text: 'DISAPPROVED' }, // Alias
        'on progress': { class: 'bg-gradient-info text-white', text: 'ON PROGRESS' } // Alias
    };
    const currentStatus = statusMap[status] || { class: 'bg-gradient-dark text-white', text: status.toUpperCase() };
    return `<span class="badge badge-sm ${currentStatus.class}">${currentStatus.text}</span>`;
}

// --- Main Script Execution ---
document.addEventListener('DOMContentLoaded', function() {
    const token = localStorage.getItem('access_token');
    if (!token) {
        showToast('Anda harus login untuk mengakses halaman ini.', 'danger');
        setTimeout(() => { window.location.href = 'login.html'; }, 2500);
        return;
    }

    const logoutLink = document.getElementById('logoutLink');
    if (logoutLink) {
        logoutLink.addEventListener('click', (event) => {
            event.preventDefault();
            localStorage.removeItem('access_token');
            localStorage.removeItem('user');
            showToast("Anda telah logout.", "info");
            setTimeout(() => { window.location.href = 'login.html'; }, 1000);
        });
    }

    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get("id");

    if (id) {
        fetchDetailSurat(id, token);
    } else {
        showToast("ID surat tidak ditemukan di URL.", "warning");
        const mainContentArea = document.querySelector('.main .container-fluid');
        if (mainContentArea) {
            mainContentArea.innerHTML = `
                <div class="card shadow-sm">
                    <div class="card-body text-center py-5">
                        <i class="fas fa-exclamation-triangle fa-3x text-danger mb-3"></i>
                        <h2 class="text-danger">ID Surat Tidak Valid</h2>
                        <p class="text-muted">Parameter ID tidak ditemukan pada URL.</p>
                        <button class="btn btn-gradient-primary mt-3" onclick="goBack()">Kembali</button>
                    </div>
                </div>`;
        }
    }
});

// --- Fetch Surat Detail ---
async function fetchDetailSurat(id, token) {
    console.log(`Workspaceing detail for surat ID: ${id}`);
    const apiUrl = `${API_BASE_URL_SURAT}/${id}`;
    const detailContainer = document.querySelector('.item-detail-container');
    let originalDetailContainerHTML = ''; // Simpan HTML kerangka asli dari detailContainer

    if (detailContainer) {
        originalDetailContainerHTML = detailContainer.innerHTML; // Simpan kerangka detail
        detailContainer.innerHTML = `
            <div class="d-flex justify-content-center align-items-center py-5" style="min-height: 200px;">
                <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;">
                    <span class="visually-hidden">Memuat detail surat...</span>
                </div>
                <p class="ms-3 mb-0 fs-5">Memuat detail surat...</p>
            </div>`;
    }

    try {
        const response = await fetch(apiUrl, {
            headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
        });

        if (response.status === 401) {
            showToast('Sesi Anda telah berakhir. Silakan login ulang.', 'danger');
            localStorage.removeItem('access_token'); localStorage.removeItem('user');
            setTimeout(() => { window.location.href = 'login.html'; }, 2500);
            if (detailContainer) detailContainer.innerHTML = originalDetailContainerHTML; // Kembalikan jika error
            return;
        }
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: `Gagal memuat data (Status: ${response.status})` }));
            throw new Error(errorData.message || `Gagal memuat data surat.`);
        }
        const data = await response.json();
        console.log("Data detail surat diterima:", data);

        if (detailContainer) {
            detailContainer.innerHTML = originalDetailContainerHTML; // Kembalikan kerangka asli SEBELUM mengisi
        }

        const populateField = (elementId, value, isHtml = false) => {
            const el = document.getElementById(elementId);
            if (el) {
                if (isHtml) el.innerHTML = value || "-"; else el.textContent = value || "-";
            } else { console.warn(`Element with ID "${elementId}" not found.`); }
        };

        const formatDisplayDate = (dateString, showTime = false) => {
            // ... (fungsi formatDisplayDate Anda, pastikan sudah benar) ...
            if (!dateString) return "-";
            try {
                const date = new Date(dateString);
                if (isNaN(date.getTime())) return "Format Tanggal Salah";
                const options = { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Makassar' };
                if (showTime) { options.hour = '2-digit'; options.minute = '2-digit'; options.second = '2-digit';}
                return date.toLocaleDateString('id-ID', options);
            } catch (e) { return "Tanggal Invalid"; }
        };
        
        populateField("no_surat", data.no_surat ? `${data.no_surat}` : "-", true);
        populateField("dari", data.dari);
        populateField("kepada", data.kepada);
        populateField("perihal", data.perihal);
        populateField("jenis_surat", data.jenis_surat ? data.jenis_surat.toUpperCase() : "-");
        populateField("catatan", data.catatan || "<em>Tidak ada catatan.</em>", true);
        
        const statusElement = document.getElementById("status");
        if (statusElement) statusElement.innerHTML = getStatusBadgeSuratHtml(data.status);

        populateField("tanggal_masuk", formatDisplayDate(data.tanggal_masuk));
        populateField("created_at", formatDisplayDate(data.created_at, true));
        populateField("updated_at", formatDisplayDate(data.updated_at, true));
        populateField("user_created", data.user ? data.user.name : (data.user_id || '-'));

        // Handle File Attachments - Menampilkan Tombol Download
        const lampiranContainer = document.getElementById("lampiran_surat_container");
        if (lampiranContainer) {
            lampiranContainer.innerHTML = ''; // Bersihkan konten sebelumnya
            if (data.file_lampiran && Array.isArray(data.file_lampiran) && data.file_lampiran.length > 0) {
                const titleP = document.createElement('p');
                titleP.className = 'mb-2'; // Sedikit margin bawah untuk judul
                titleP.innerHTML = '<strong>Lampiran File:</strong>';
                lampiranContainer.appendChild(titleP);

                const buttonGroup = document.createElement('div');
                buttonGroup.className = 'd-flex flex-wrap gap-2'; // Untuk tata letak tombol

                data.file_lampiran.forEach(relativePath => {
                    if (!relativePath) return; 

                    const fileName = relativePath.split('/').pop();
                    const downloadUrl = `${API_BASE_URL_SURAT}/${id}/lampiran/download?path=${encodeURIComponent(relativePath)}`;

                    const buttonLink = document.createElement('a');
                    buttonLink.href = downloadUrl;
                    buttonLink.className = 'btn btn-sm btn-outline-primary'; 
                    // buttonLink.target = "_blank"; // Untuk download, biasanya tidak perlu _blank

                    let iconClass = 'fas fa-download'; // Default download icon
                    const extension = fileName.split('.').pop().toLowerCase();
                    if (['pdf'].includes(extension)) iconClass = 'fas fa-file-pdf text-danger';
                    else if (['doc', 'docx'].includes(extension)) iconClass = 'fas fa-file-word text-primary';
                    else if (['xls', 'xlsx'].includes(extension)) iconClass = 'fas fa-file-excel text-success';
                    else if (['jpg', 'jpeg', 'png', 'gif'].includes(extension)) iconClass = 'fas fa-file-image text-info';
                    else if (['zip', 'rar'].includes(extension)) iconClass = 'fas fa-file-archive text-warning';
                    
                    buttonLink.innerHTML = `<i class="${iconClass} me-1"></i> Unduh ${fileName}`;
                    buttonGroup.appendChild(buttonLink);
                });
                lampiranContainer.appendChild(buttonGroup);
            } else {
                lampiranContainer.innerHTML = '<p class="text-muted fst-italic mb-0">Tidak ada lampiran file.</p>';
            }
        } else {
            console.warn("Element container untuk lampiran dengan ID 'lampiran_surat_container' tidak ditemukan.");
        }
        
    } catch (error) {
        console.error("Terjadi kesalahan saat memuat detail surat:", error);
        if (detailContainer && originalDetailContainerHTML) { 
            detailContainer.innerHTML = originalDetailContainerHTML; // Kembalikan kerangka jika terjadi error
        }
        showToast(error.message || "Terjadi kesalahan saat memuat data.", 'danger');
        
        const mainContentArea = document.querySelector('.main .container-fluid');
        if (mainContentArea && detailContainer && detailContainer.innerHTML.includes('spinner-border')) {
            // Tampilkan pesan error utama jika spinner masih ada
            detailContainer.innerHTML = ''; // Hapus spinner dulu
             mainContentArea.innerHTML = `
                <div class="card shadow-sm">
                    <div class="card-body text-center py-5">
                         <i class="fas fa-server fa-3x text-warning mb-3"></i>
                        <h2 class="text-danger">${error.message || "Gagal Memuat Detail Surat"}</h2>
                        <p class="text-muted">Tidak dapat mengambil data untuk surat yang diminta dari server.</p>
                        <button class="btn btn-gradient-primary mt-3" onclick="goBack()">Kembali</button>
                    </div>
                </div>`;
        }
    }
}

window.goBack = goBack;
window.toggleSidebar = toggleSidebar;
window.closeSidebar = closeSidebar;
const API_BASE_URL_SURAT = 'http://127.0.0.1:8000/api/persuratan';
let allSuratItems = [];
let currentPageSurat = 1;
const itemsPerPageSurat = 10;

let filterJenisSuratSelect, filterWilayahSuratSelect,
    suratTableBody, paginationContainerSurat, pageInfoSurat;

const getAuthTokenSurat = () => localStorage.getItem('access_token');

function showToastSurat(message, type = 'info') {
    const styles = {
        success: { bg: 'text-bg-success', icon: 'fas fa-check-circle' },
        danger: { bg: 'text-bg-danger', icon: 'fas fa-exclamation-triangle' },
        warning: { bg: 'text-bg-warning text-dark', icon: 'fas fa-exclamation-circle' },
        info: { bg: 'text-bg-info', icon: 'fas fa-info-circle' }
    };
    const currentStyle = styles[type] || styles.info;
    let toastContainer = document.querySelector('.toast-container.position-fixed.top-0.end-0');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
        toastContainer.style.zIndex = '1150';
        document.body.appendChild(toastContainer);
    }
    const toastEl = document.createElement('div');
    toastEl.className = `toast align-items-center ${currentStyle.bg} border-0`;
    toastEl.setAttribute('role', 'alert');
    toastEl.innerHTML = `<div class="d-flex"><div class="toast-body"><i class="${currentStyle.icon} me-2"></i> ${message}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button></div>`;
    toastContainer.appendChild(toastEl);
    try {
        const toast = new bootstrap.Toast(toastEl, { delay: 3000 });
        toast.show();
        toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
    } catch(e) {
        console.error("Bootstrap Toast error:", e);
        toastEl.remove();
        alert(message);
    }
}

const formatDateOnlySurat = (isoString) => {
    if (!isoString) return '-';
    try {
        return new Date(isoString).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'Asia/Makassar' });
    } catch (e) { return 'Tgl Invalid'; }
};

const redirectToLoginSurat = (message = 'Sesi Anda tidak valid. Silakan login ulang.') => {
    showToastSurat(message, 'danger');
    ['access_token', 'user', 'filter_jenis_surat', 'filter_wilayah_surat'].forEach(item => localStorage.removeItem(item));
    setTimeout(() => { window.location.href = 'login.html'; }, 2000);
};

async function apiRequestSurat(url, options = {}) {
    const token = getAuthTokenSurat();
    if (!token && !url.includes('login')) {
        redirectToLoginSurat();
        throw new Error('Tidak terautentikasi');
    }

    options.headers = { ...options.headers, 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' };
    if (options.body && !(options.body instanceof FormData) && typeof options.body !== 'string') {
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(options.body);
    }

    try {
        const response = await fetch(url, options);
        if (response.status === 401 && !url.includes('login')) {
            redirectToLoginSurat();
            throw new Error('Sesi berakhir atau tidak valid.');
        }
        const responseData = await response.json().catch(() => ({ message: `Respons server tidak valid (Status: ${response.status})` }));
        if (!response.ok) {
            const errMsg = responseData?.message || Object.values(responseData?.errors || {}).flat().join('<br>') || `HTTP error! Status: ${response.status}`;
            throw new Error(errMsg);
        }
        return responseData;
    } catch (error) {
        console.error(`API Request Error ke ${url}:`, error.message);
        showToastSurat(`Gagal: ${error.message || 'Tidak dapat terhubung ke server.'}`, 'danger');
        throw error;
    }
}

async function fetchSuratData() {
    if (suratTableBody) {
        suratTableBody.innerHTML = `<tr><td colspan="10" class="text-center py-5"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Memuat...</span></div></td></tr>`;
    }
    try {
        const data = await apiRequestSurat(API_BASE_URL_SURAT);
        allSuratItems = data || [];
        populateFilterOptionsSurat();
        applySuratFilters();
    } catch (error) {
        if (suratTableBody) suratTableBody.innerHTML = `<tr><td colspan="10" class="text-center py-4">Gagal memuat data. Coba lagi nanti.</td></tr>`;
    }
}

async function deleteSuratAPI(id) {
    try {
        return await apiRequestSurat(`${API_BASE_URL_SURAT}/${id}`, { method: 'DELETE' });
    } catch (error) {
        return null;
    }
}

function getJenisSuratFullName(kodeJenis) {
    if (!kodeJenis) return '-';
    const map = {
        'SK': 'Surat Keputusan (SK)',
        'ND': 'Nota Dinas (ND)',
        'UD': 'Surat Undangan (UD)',
        'SM': 'Surat Masuk (SM)',
        'SP': 'Surat Perintah (SP)'
    };
    const upperKode = kodeJenis.toUpperCase();
    return map[upperKode] || upperKode;
}

function getStatusBadgeSuratHtml(status) {
    status = status ? status.toLowerCase().trim() : 'unknown';
    const statusMap = {
        'pending': { class: 'bg-gradient-warning text-white', text: 'PENDING' },
        'diajukan': { class: 'bg-gradient-info text-white', text: 'DIAJUKAN' },
        'disetujui': { class: 'bg-gradient-success text-white', text: 'DISETUJUI' },
        'ditolak': { class: 'bg-gradient-danger text-white', text: 'DITOLAK' },
        'selesai': { class: 'bg-gradient-primary text-white', text: 'SELESAI' },
        'diperbaiki': { class: 'bg-gradient-secondary text-white', text: 'PERLU DIPERBAIKI' }
    };
    const currentStatus = statusMap[status] || { class: 'bg-gradient-dark text-white', text: status.toUpperCase() };
    return `<span class="badge badge-sm ${currentStatus.class}">${currentStatus.text}</span>`;
}

function displaySuratItems(dataToDisplay) {
    if (!suratTableBody) return;
    suratTableBody.innerHTML = '';

    const start = (currentPageSurat - 1) * itemsPerPageSurat;
    const paginatedItems = dataToDisplay.slice(start, start + itemsPerPageSurat);

    if (paginatedItems.length === 0) {
        suratTableBody.innerHTML = `<tr><td colspan="10" class="text-center py-4">Tidak ada data persuratan.</td></tr>`;
        renderSuratPagination(dataToDisplay);
        return;
    }

    paginatedItems.forEach((surat, index) => {
        const row = suratTableBody.insertRow();
        
        let lampiranActionButtonsHtml = '';
        if (surat.file_lampiran && Array.isArray(surat.file_lampiran) && surat.file_lampiran.length > 0) {
            lampiranActionButtonsHtml = surat.file_lampiran.map(filePath => {
                if (!filePath) return '';
                const fileName = filePath.split('/').pop();
                const downloadUrl = `${API_BASE_URL_SURAT}/${surat.id}/lampiran/download?path=${encodeURIComponent(filePath)}`;
                
                let iconClass = 'fas fa-file-download';
                const extension = fileName.split('.').pop().toLowerCase();
                if (['pdf'].includes(extension)) iconClass = 'fas fa-file-pdf text-danger text-white';
                else if (['doc', 'docx'].includes(extension)) iconClass = 'fas fa-file-word text-primary';
                else if (['jpg', 'jpeg', 'png'].includes(extension)) iconClass = 'fas fa-file-image text-info';
                else if (['xls', 'xlsx'].includes(extension)) iconClass = 'fas fa-file-excel text-success';
                else if (['zip', 'rar'].includes(extension)) iconClass = 'fas fa-file-archive text-warning';

                return `<a href="${downloadUrl}" class="badge badge-sm bg-gradient-danger border-0" title="Unduh ${fileName}"><i class="${iconClass} fs-6"></i></a>`;
            }).join('');
        }

        const detailButtonHtml = `<a href="detail_surat.html?id=${surat.id}" class="badge badge-sm bg-gradient-success border-0" title="Detail"><i class="fa-solid fa-eye fs-6"></i></a>`;
        const editButtonHtml = `<a href="update_surat.html?id=${surat.id}" class="badge badge-sm bg-gradient-info border-0" title="Edit"><i class="fa-solid fa-pen-to-square fs-6"></i></a>`;
        const deleteButtonHtml = `<a href="#" onclick="confirmDeleteSurat(${surat.id}, event)" class="badge badge-sm bg-gradient-danger border-0" title="Hapus"><i class="fa-solid fa-trash fs-6"></i></a>`;

        row.innerHTML = `
            <td class="text-center align-middle">${start + index + 1}.</td>
            <td class="align-middle">${surat.no_surat || '-'}</td>
            <td class="align-middle">${surat.dari || '-'}</td>
            <td class="align-middle">${surat.kepada || '-'}</td>
            <td>${truncateText(surat.perihal, 15) || '-'}</td>
            <td class="text-center align-middle">${formatDateOnlySurat(surat.tanggal_masuk)}</td>
            <td class="text-center align-middle">${getStatusBadgeSuratHtml(surat.status)}</td>
            <td class="text-center align-middle">${getJenisSuratFullName(surat.jenis_surat)}</td>
            <td class="text-center align-middle"> 
                ${lampiranActionButtonsHtml}
                ${detailButtonHtml}
                ${editButtonHtml}
                ${deleteButtonHtml}
            </td>`;
    });
    renderSuratPagination(dataToDisplay);
}

function renderSuratPagination(data) {
    if (!paginationContainerSurat || !pageInfoSurat) return;
    const totalItems = data.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPageSurat));
    currentPageSurat = Math.max(1, Math.min(currentPageSurat, totalPages));

    pageInfoSurat.textContent = totalItems > 0 ? `Halaman ${currentPageSurat} dari ${totalPages}` : 'Tidak ada data';
    paginationContainerSurat.innerHTML = '';
    if (totalPages <= 1) return;

    const createBtn = (html, page, isDisabled = false, isSpecial = false) => {
        const btn = document.createElement('button');
        btn.className = `btn btn-sm ${isSpecial ? 'bg-gradient-primary text-white' : 'btn-outline-primary'} me-1`;
        btn.innerHTML = html;
        btn.disabled = isDisabled || page === currentPageSurat;
        if (page === currentPageSurat) btn.classList.add('active');
        btn.onclick = () => { currentPageSurat = page; applySuratFilters(); };
        paginationContainerSurat.appendChild(btn);
    };

    if (currentPageSurat > 1) createBtn('&laquo; Awal', 1);
    if (currentPageSurat > 1) createBtn('&lsaquo; Seb', currentPageSurat - 1);
    
    let startPage = Math.max(1, currentPageSurat - 2), endPage = Math.min(totalPages, currentPageSurat + 2);
    if (totalPages <= 5) { startPage = 1; endPage = totalPages; }
    else if (currentPageSurat <= 2) endPage = 5;
    else if (currentPageSurat >= totalPages - 1) startPage = totalPages - 4;

    for (let i = startPage; i <= endPage; i++) createBtn(i, i, false, i === currentPageSurat);

    if (currentPageSurat < totalPages) createBtn('Berik &rsaquo;', currentPageSurat + 1, false, true);
    if (currentPageSurat < totalPages) createBtn('Akhir &raquo;', totalPages, false, true);
}

function populateFilterOptionsSurat() {
    if (!filterJenisSuratSelect) return;
    const uniqueJenisSurat = [...new Set(allSuratItems.map(item => item.jenis_surat).filter(Boolean).sort())];
    filterJenisSuratSelect.innerHTML = '<option value="">Semua Jenis Surat</option>';
    uniqueJenisSurat.forEach(jenis => {
        filterJenisSuratSelect.add(new Option(getJenisSuratFullName(jenis), jenis));
    });
}

function applySuratFilters() {
    const filterJenisValue = filterJenisSuratSelect?.value || '';
    const filterWilayahValue = filterWilayahSuratSelect?.value || ''; // Filter untuk field 'dari'

    localStorage.setItem('filter_jenis_surat', filterJenisValue);
    localStorage.setItem('filter_wilayah_surat', filterWilayahValue);

    const filteredData = allSuratItems.filter(item => 
        (filterJenisValue ? item.jenis_surat === filterJenisValue : true) &&
        (filterWilayahValue ? (item.dari && item.dari.toLowerCase().includes(filterWilayahValue.toLowerCase())) : true)
    );
    
    if (currentPageSurat > Math.max(1, Math.ceil(filteredData.length / itemsPerPageSurat))) {
        currentPageSurat = 1;
    }
    displaySuratItems(filteredData);
}

const truncateText = (text, maxLength) => {
    if (typeof text !== 'string' || !text) return '';
    return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
};

function confirmDeleteSurat(id, event) {
    if (event) event.preventDefault();
    const item = allSuratItems.find(s => s.id === id);
    Swal.fire({
        title: 'Konfirmasi Hapus',
        html: `Anda yakin ingin menghapus surat dengan No. <strong>${item?.no_surat || 'ini'}</strong>?<br/>Tindakan ini tidak dapat dibatalkan.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33', cancelButtonColor: '#6c757d',
        confirmButtonText: '<i class="fas fa-trash-alt me-1"></i> Ya, hapus!',
        cancelButtonText: 'Batal'
    }).then(async (result) => {
        if (result.isConfirmed) {
            const response = await deleteSuratAPI(id);
            if (response) {
                showToastSurat(response.message || 'Data surat berhasil dihapus.', 'success');
                const itemsLeft = allSuratItems.length - 1;
                currentPageSurat = Math.min(currentPageSurat, Math.max(1, Math.ceil(itemsLeft / itemsPerPageSurat)));
                await fetchSuratData();
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    filterJenisSuratSelect = document.getElementById('filterJenis');
    filterWilayahSuratSelect = document.getElementById('filterWilayah');
    suratTableBody = document.querySelector('#logTable tbody');
    paginationContainerSurat = document.getElementById('pagination');
    pageInfoSurat = document.getElementById('page-info');
    
    const logoutLink = document.getElementById('logoutLink');
    logoutLink?.addEventListener('click', (e) => { e.preventDefault(); redirectToLoginSurat('Anda telah berhasil logout.'); });

    filterJenisSuratSelect?.addEventListener('change', () => { currentPageSurat = 1; applySuratFilters(); });
    filterWilayahSuratSelect?.addEventListener('change', () => { currentPageSurat = 1; applySuratFilters(); });
    
    fetchSuratData().then(() => {
        if (filterJenisSuratSelect) filterJenisSuratSelect.value = localStorage.getItem('filter_jenis_surat') || '';
        if (filterWilayahSuratSelect) filterWilayahSuratSelect.value = localStorage.getItem('filter_wilayah_surat') || '';
        applySuratFilters();
    });
});

window.tambahData = () => { window.location.href = "add_surat.html"; };
window.viewSuratDetail = viewSuratDetail;
window.confirmDeleteSurat = confirmDeleteSurat;
window.toggleSidebar = () => document.body.classList.toggle('sidebar-open');
window.closeSidebar = () => document.body.classList.remove('sidebar-open');
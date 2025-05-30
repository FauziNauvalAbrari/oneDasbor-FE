const API_BASE_URL_SURAT = 'http://127.0.0.1:8000/api/persuratan';
let allSuratItems = [];
let currentPageSurat = 1;
const itemsPerPageSurat = 10;

let filterJenisSuratSelect, filterWilayahSuratSelect,
    suratTableBody, paginationContainerSurat, pageInfoSurat,
    jenisLaporanSelectSurat, periodeLaporanSelectSurat, tahunLaporanSelectSurat;

const getAuthTokenSurat = () => localStorage.getItem('access_token');

const monthsOptionsSurat = [
    { value: '1', text: 'Januari' }, { value: '2', text: 'Februari' },
    { value: '3', text: 'Maret' }, { value: '4', text: 'April' },
    { value: '5', text: 'Mei' }, { value: '6', text: 'Juni' },
    { value: '7', text: 'Juli' }, { value: '8', text: 'Agustus' },
    { value: '9', text: 'September' }, { value: '10', text: 'Oktober' },
    { value: '11', text: 'November' }, { value: '12', text: 'Desember' }
];

const quartersOptionsSurat = [
    { value: '1', text: 'Kuartal 1 (Jan-Mar)' }, { value: '2', text: 'Kuartal 2 (Apr-Jun)' },
    { value: '3', text: 'Kuartal 3 (Jul-Sep)' }, { value: '4', text: 'Kuartal 4 (Okt-Des)' }
];

const semestersOptionsSurat = [
    { value: '1', text: 'Semester 1 (Jan-Jun)' }, { value: '2', text: 'Semester 2 (Jul-Des)' }
];


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
    } catch (e) {
        console.error("Bootstrap Toast error:", e);
        toastEl.remove();
        alert(message);
    }
}

const formatDateOnlySurat = (isoString) => {
    if (!isoString) return '-';
    try {
        return new Date(isoString).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'Asia/Makassar' });
    } catch (e) {
        return 'Tgl Invalid';
    }
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
    const upperKode = String(kodeJenis).toUpperCase();
    return map[upperKode] || upperKode;
}

function getStatusBadgeSuratHtml(status) {
    status = status ? String(status).toLowerCase().trim() : 'unknown';
    const statusMap = {
        'pending': { class: 'bg-gradient-warning text-white', text: 'PENDING' },
        'diajukan': { class: 'bg-gradient-info text-white', text: 'DIAJUKAN' },
        'disetujui': { class: 'bg-gradient-success text-white', text: 'DISETUJUI' },
        'ditolak': { class: 'bg-gradient-danger text-white', text: 'DITOLAK' },
        'selesai': { class: 'bg-gradient-faded-success text-white', text: 'SELESAI' },
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
        suratTableBody.innerHTML = `<tr><td colspan="10" class="text-center py-4">Tidak ada data persuratan yang cocok dengan filter.</td></tr>`;
        renderSuratPagination(dataToDisplay);
        return;
    }

    paginatedItems.forEach((surat, index) => {
        const row = suratTableBody.insertRow();
        
        let lampiranActionButtonsHtml = '';
        if (surat.file_lampiran && Array.isArray(surat.file_lampiran) && surat.file_lampiran.length > 0) {
            lampiranActionButtonsHtml = surat.file_lampiran.map(filePath => {
                if (!filePath) return '';
                const fileName = String(filePath).split('/').pop();
                const downloadUrl = `${API_BASE_URL_SURAT}/${surat.id}/lampiran/download?path=${encodeURIComponent(filePath)}`;
                
                let iconClass = 'fas fa-file-download';
                const extension = fileName.split('.').pop().toLowerCase();
                if (['pdf'].includes(extension)) iconClass = 'fas fa-file-pdf text-danger text-white';
                else if (['doc', 'docx'].includes(extension)) iconClass = 'fas fa-file-word text-primary';
                else if (['jpg', 'jpeg', 'png'].includes(extension)) iconClass = 'fas fa-file-image text-info';
                else if (['xls', 'xlsx'].includes(extension)) iconClass = 'fas fa-file-excel text-success';
                else if (['zip', 'rar'].includes(extension)) iconClass = 'fas fa-file-archive text-warning';

                return `<a href="${downloadUrl}" target="_blank" class="badge badge-sm bg-gradient-danger border-0 me-1" title="Unduh ${fileName}"><i class="${iconClass} fs-6"></i></a>`;
            }).join('');
        }


        const detailButtonHtml = `<a href="detail_surat.html?id=${surat.id}" class="badge badge-sm bg-gradient-success border-0 me-1" title="Detail"><i class="fa-solid fa-eye fs-6"></i></a>`;
        const editButtonHtml = `<a href="update_surat.html?id=${surat.id}" class="badge badge-sm bg-gradient-info border-0 me-1" title="Edit"><i class="fa-solid fa-pen-to-square fs-6"></i></a>`;
        const deleteButtonHtml = `<a href="#" onclick="confirmDeleteSurat(${surat.id}, event)" class="badge badge-sm bg-gradient-danger border-0" title="Hapus"><i class="fa-solid fa-trash fs-6"></i></a>`;

        row.innerHTML = `
            <td class="text-center align-middle">${start + index + 1}.</td>
            <td class="align-middle">${surat.no_surat || '-'}</td>
            <td class="align-middle">${truncateText(surat.dari, 12) || '-'}</td>
            <td>${truncateText(surat.kepada, 15) || '-'}</td>
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
        if (page === currentPageSurat && !isSpecial) btn.classList.add('active');
        if (page === currentPageSurat && isSpecial) btn.className = `btn btn-sm bg-gradient-primary text-white active me-1`;


        btn.onclick = () => {
            currentPageSurat = page;
            applySuratFilters();
        };
        paginationContainerSurat.appendChild(btn);
    };

    if (currentPageSurat > 1) createBtn('&laquo; Awal', 1);
    if (currentPageSurat > 1) createBtn('&lsaquo; Seb', currentPageSurat - 1);
    
    let startPage = Math.max(1, currentPageSurat - 2), endPage = Math.min(totalPages, currentPageSurat + 2);
    if (totalPages <= 5) {
        startPage = 1; endPage = totalPages;
    } else {
        if (currentPageSurat <= 2) endPage = 5;
        else if (currentPageSurat >= totalPages - 1) startPage = totalPages - 4;
    }

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
    const filterWilayahValue = filterWilayahSuratSelect?.value || '';

    localStorage.setItem('filter_jenis_surat', filterJenisValue);
    localStorage.setItem('filter_wilayah_surat', filterWilayahValue);

    const filteredData = allSuratItems.filter(item => 
        (filterJenisValue ? item.jenis_surat === filterJenisValue : true) &&
        (filterWilayahValue ? (item.dari && String(item.dari).toLowerCase().includes(filterWilayahValue.toLowerCase())) : true)
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

function updatePeriodeOptionsSurat() {
    if (!jenisLaporanSelectSurat || !periodeLaporanSelectSurat) return;

    const selectedJenis = jenisLaporanSelectSurat.value;
    periodeLaporanSelectSurat.innerHTML = '';
    periodeLaporanSelectSurat.disabled = false;

    let optionsToAdd = [];
    switch (selectedJenis) {
        case 'Bulanan': optionsToAdd = monthsOptionsSurat; break;
        case '3 Bulanan (Kuartal)': optionsToAdd = quartersOptionsSurat; break;
        case '6 Bulanan (Semester)': optionsToAdd = semestersOptionsSurat; break;
        case 'Tahunan':
            periodeLaporanSelectSurat.disabled = true;
            periodeLaporanSelectSurat.add(new Option('N/A (Laporan Tahunan)', ''));
            return;
        default:
            periodeLaporanSelectSurat.disabled = true;
            periodeLaporanSelectSurat.add(new Option('Pilih Jenis Laporan Dulu', '', true, true));
            return;
    }

    periodeLaporanSelectSurat.add(new Option('Pilih Periode...', '', true, true));
    optionsToAdd.forEach(opt => periodeLaporanSelectSurat.add(new Option(opt.text, opt.value)));
}

async function downloadLaporanPDFSurat() {
    const { jsPDF } = window.jspdf;
    if (typeof jsPDF?.API?.autoTable === 'undefined') {
        showToastSurat("Gagal memuat fungsi PDF. Pastikan library PDF (jspdf & autotable) sudah dimuat dengan benar.", "danger");
        console.error("jsPDF or jsPDF.autoTable is not available. Make sure the libraries are loaded.");
        return;
    }

    if (!jenisLaporanSelectSurat || !tahunLaporanSelectSurat || !periodeLaporanSelectSurat) {
        showToastSurat("Elemen filter laporan (jenis, tahun, periode) tidak ditemukan di halaman.", "danger");
        return;
    }

    const selectedJenisLaporan = jenisLaporanSelectSurat.value;
    const selectedTahun = parseInt(tahunLaporanSelectSurat.value);
    const selectedPeriodeValue = periodeLaporanSelectSurat.value;
    const selectedPeriodeText = periodeLaporanSelectSurat.disabled ? 
                                'N/A (Laporan Tahunan)' : 
                                (periodeLaporanSelectSurat.options[periodeLaporanSelectSurat.selectedIndex]?.text || 'N/A');


    if (selectedJenisLaporan !== 'Tahunan' && !selectedPeriodeValue) {
        showToastSurat('Silakan pilih periode laporan terlebih dahulu.', 'warning');
        return;
    }

    const logoPath = 'assets/img/telkom_red.png';
    let loadedLogoImage = null;
    try {
        loadedLogoImage = await new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => { console.error(`Gagal memuat logo: ${logoPath}`); resolve(null); };
            img.src = logoPath;
        });
    } catch (error) { console.error("Error memuat gambar logo:", error); }


    let filteredForPDF = allSuratItems.filter(surat => {
        try {
            if (!surat.tanggal_masuk) return false;
            const logDate = new Date(surat.tanggal_masuk);
            const logYear = logDate.getFullYear();
            const logMonth = logDate.getMonth() + 1;

            if (logYear !== selectedTahun) return false;

            switch (selectedJenisLaporan) {
                case 'Bulanan': return logMonth === parseInt(selectedPeriodeValue);
                case '3 Bulanan (Kuartal)':
                    const q = parseInt(selectedPeriodeValue);
                    return (q === 1 && logMonth >= 1 && logMonth <= 3) ||
                           (q === 2 && logMonth >= 4 && logMonth <= 6) ||
                           (q === 3 && logMonth >= 7 && logMonth <= 9) ||
                           (q === 4 && logMonth >= 10 && logMonth <= 12);
                case '6 Bulanan (Semester)':
                    const s = parseInt(selectedPeriodeValue);
                    return (s === 1 && logMonth >= 1 && logMonth <= 6) ||
                           (s === 2 && logMonth >= 7 && logMonth <= 12);
                case 'Tahunan': return true;
                default: return false;
            }
        } catch (e) {
            console.error("Error saat memfilter tanggal surat untuk PDF:", surat.tanggal_masuk, e);
            return false;
        }
    });


    if (filteredForPDF.length === 0) {
        showToastSurat(`<b>Tidak ada data surat yang cocok untuk laporan.</b><br>Jenis: ${selectedJenisLaporan}, Tahun: ${selectedTahun}, Periode: ${selectedPeriodeText}`, 'info');
        return;
    }

    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.width || doc.internal.pageSize.getWidth();
    const margin = 14;

    const addHeaderFooterSurat = (docInstance, imageElement, isHeader) => {
        if (isHeader) {
            const logoWidth = 40, logoHeight = 30, logoX = pageWidth - logoWidth - margin, logoY = margin - 7;
            if (imageElement) {
                try {
                    docInstance.addImage(imageElement, logoPath.split('.').pop().toUpperCase(), logoX, logoY, logoWidth, logoHeight);
                } catch (e) { console.error("Error adding image to PDF:", e); docInstance.text("Logo Gagal", logoX, logoY + 5, {fontSize: 8, textColor: 'red'}); }
            } else { docInstance.text("[No Logo]", logoX + logoWidth / 2, logoY + logoHeight / 2, {align: 'center', fontSize: 8, textColor: [150,150,150]}); }
        } else { 
            const footerStartY = pageHeight - 30;
            docInstance.setLineWidth(0.1).line(margin, footerStartY + 2, pageWidth - margin, footerStartY + 2);
            docInstance.setFontSize(7.5).setFont('helvetica', 'bold').setTextColor(0,0,0).text("Kantor Divisi Regional V", margin, footerStartY + 7);
            docInstance.setFont('helvetica', 'normal');
            const addrLines = ["PT Telkom Indonesia (Persero) Tbk", "Jl. A.P.Pettarani No.2 ", "Makassar 90221 - Indonesia"];
            addrLines.forEach((line, i) => docInstance.text(line, margin, footerStartY + 7 + 3.5 * (i + 1)));
            docInstance.text(`www.telkom.co.id`, pageWidth - margin, footerStartY + 15 + 3.5, { align: 'right' });
        }
    };
    
    let currentY = 15;
    doc.setFontSize(14).setFont('helvetica', 'bold').text("LAPORAN DATA PERSURATAN", pageWidth / 2, currentY + 15, { align: 'center' });
    currentY += 25;

    doc.setFontSize(9).setFont('helvetica', 'normal');
    const infoData = [
        `Jenis Laporan : ${selectedJenisLaporan}`,
        `Tahun         : ${selectedTahun}`,
        `Periode       : ${selectedPeriodeText}`,
        `Tanggal Cetak : ${new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Makassar' })}`
    ];
    infoData.forEach(line => { doc.text(line, margin, currentY); currentY += 5; });
    currentY += 3;

    const tableColumnNames = ["No.", "No. Surat", "Dari", "Kepada", "Tgl Masuk", "Status", "Jenis Surat"];
    const tableData = filteredForPDF.map((surat, index) => [
        index + 1,
        truncateText(surat.no_surat, 20) || '-',
        truncateText(surat.dari, 20) || '-',
        truncateText(surat.kepada, 20) || '-',
        formatDateOnlySurat(surat.tanggal_masuk) || '-',
        truncateText(String(surat.status).toUpperCase(), 15) || '-',
        truncateText(getJenisSuratFullName(surat.jenis_surat), 20) || '-'
    ]);

    doc.autoTable({
        head: [tableColumnNames],
        body: tableData,
        startY: currentY,
        theme: 'grid',
        headStyles: { fillColor: [218, 41, 28], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
        styles: { fontSize: 8, cellPadding: 1.8, overflow: 'linebreak', lineWidth: 0.5 },
        columnStyles: { 
            0: { cellWidth: 8, halign: 'right' },
            1: { cellWidth: 30 },
            2: { cellWidth: 30 },
            3: { cellWidth: 30 },
            4: { cellWidth: 20, halign: 'center' },
            5: { cellWidth: 20, halign: 'center' },
            6: { cellWidth: 'auto' }
        },
        didDrawPage: (data) => { 
            addHeaderFooterSurat(doc, loadedLogoImage, true);
            addHeaderFooterSurat(doc, null, false);
        },
        margin: { top: 35, right: margin, bottom: 35, left: margin }
    });

    const cleanText = (text) => (text || '').replace(/[^a-zA-Z0-9_]/g, '');
    const fileName = `LaporanSurat_${cleanText(selectedJenisLaporan)}_${selectedTahun}_${cleanText(selectedPeriodeValue) || 'Tahunan'}.pdf`;
    doc.save(fileName);
    showToastSurat(`Laporan PDF "${fileName}" berhasil dibuat dan diunduh.`, 'success');
}


document.addEventListener('DOMContentLoaded', () => {
    filterJenisSuratSelect = document.getElementById('filterJenis');
    filterWilayahSuratSelect = document.getElementById('filterWilayah');
    suratTableBody = document.querySelector('#logTable tbody');
    paginationContainerSurat = document.getElementById('pagination');
    pageInfoSurat = document.getElementById('page-info');
    
    jenisLaporanSelectSurat = document.getElementById('jenisLaporan');
    periodeLaporanSelectSurat = document.getElementById('periodeLaporan');
    tahunLaporanSelectSurat = document.getElementById('tahunLaporan');

    const logoutLink = document.getElementById('logoutLink');
    logoutLink?.addEventListener('click', (e) => { e.preventDefault(); redirectToLoginSurat('Anda telah berhasil logout.'); });

    filterJenisSuratSelect?.addEventListener('change', () => { currentPageSurat = 1; applySuratFilters(); });
    filterWilayahSuratSelect?.addEventListener('input', () => { currentPageSurat = 1; applySuratFilters(); });

    jenisLaporanSelectSurat?.addEventListener('change', updatePeriodeOptionsSurat);
    
    fetchSuratData().then(() => {
        if (filterJenisSuratSelect) filterJenisSuratSelect.value = localStorage.getItem('filter_jenis_surat') || '';
        if (filterWilayahSuratSelect) filterWilayahSuratSelect.value = localStorage.getItem('filter_wilayah_surat') || '';
        
        if (jenisLaporanSelectSurat && periodeLaporanSelectSurat && tahunLaporanSelectSurat) {
            const currentYear = new Date().getFullYear();
            if (tahunLaporanSelectSurat.querySelector(`option[value="${currentYear}"]`)) {
                tahunLaporanSelectSurat.value = currentYear;
            } else if (tahunLaporanSelectSurat.options.length > 0) {
                tahunLaporanSelectSurat.value = tahunLaporanSelectSurat.options[0].value;
            }
            updatePeriodeOptionsSurat();
        }
        
        applySuratFilters();
    });
});

window.tambahData = () => { window.location.href = "add_surat.html"; };
window.confirmDeleteSurat = confirmDeleteSurat;
window.toggleSidebar = () => document.body.classList.toggle('sidebar-open');
window.closeSidebar = () => document.body.classList.remove('sidebar-open');
window.downloadLaporanPDFSurat = downloadLaporanPDFSurat;
window.applySuratFilters = applySuratFilters;

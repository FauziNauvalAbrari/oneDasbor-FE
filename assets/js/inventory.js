const API_BASE_URL = 'http://127.0.0.1:8000/api/inventory';
let allInventoryItems = [];
let currentPage = 1;
const itemsPerPage = 10;

let jenisLaporanSelect, periodeLaporanSelect, tahunLaporanSelect, logoutLink,
    inventoryTableBody, paginationContainer, pageInfo;

const getAuthToken = () => localStorage.getItem('access_token');
const getUserData = () => JSON.parse(localStorage.getItem('user'));

function showToast(message, type = 'info') {
    const styles = {
        success: { bg: 'text-bg-success', icon: 'fas fa-check-circle' },
        danger: { bg: 'text-bg-danger', icon: 'fas fa-exclamation-triangle' },
        warning: { bg: 'text-bg-warning text-dark', icon: 'fas fa-exclamation-circle' },
        info: { bg: 'text-bg-info', icon: 'fas fa-info-circle' }
    };
    const currentStyle = styles[type] || styles.info;

    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
        toastContainer.style.zIndex = '1100';
        document.body.appendChild(toastContainer);
    }

    const toastEl = document.createElement('div');
    toastEl.className = `toast align-items-center ${currentStyle.bg} border-0`;
    toastEl.setAttribute('role', 'alert');
    toastEl.innerHTML = `<div class="d-flex"><div class="toast-body"><i class="${currentStyle.icon} me-2"></i> ${message}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button></div>`;
    toastContainer.appendChild(toastEl);

    const toast = new bootstrap.Toast(toastEl, { delay: 5000 });
    toast.show();
    toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
}

const formatDateOnly = (dateString) => {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        return `${year}-${month}-${day}`;
    } catch (e) {
        console.error("Error formatting date:", dateString, e);
        return 'Invalid Date';
    }
};

const truncateText = (text, maxLength) => {
    if (typeof text !== 'string' || !text) return '';
    return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
};

const redirectToLogin = (message = 'Sesi Anda tidak valid. Silakan login ulang.') => {
    showToast(message, 'danger');
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    setTimeout(() => { window.location.href = 'login.html'; }, 2500);
};

async function apiRequest(url, options = {}) {
    const token = getAuthToken();
    if (!token && !url.includes('login')) {
        redirectToLogin();
        return null;
    }

    options.headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
    };

    if (!(options.body instanceof FormData) && options.body) {
        options.headers['Content-Type'] = 'application/json';
        if (typeof options.body !== 'string') {
            options.body = JSON.stringify(options.body);
        }
    }

    try {
        const response = await fetch(url, options);

        if (response.status === 401 && !url.includes('login')) {
            redirectToLogin();
            return null;
        }

        if (!response.ok) {
            let errorData = null;
            try {
                errorData = await response.json();
            } catch (e) {
                console.warn("Response error body was not JSON or empty.");
            }
            const errorMessage = errorData?.message || 
                               (errorData?.errors ? Object.values(errorData.errors).flat().join('<br>') : '') || 
                               `HTTP error! Status: ${response.status} (${response.statusText || 'Unknown Error'})`;
            throw new Error(errorMessage);
        }

        if (response.status === 204) {
            return { success: true, message: "Operasi berhasil (No Content)" };
        }
        
        const contentLength = response.headers.get('Content-Length');
        if (contentLength === '0') {
             return { success: true, message: "Operasi berhasil (Empty Body)" };
        }

        try {
            return await response.json();
        } catch (e) {
            console.warn(`API request ke ${url} berhasil (status ${response.status}) tapi respons bukan JSON valid.`);
            return { success: true, message: "Operasi berhasil (Respons bukan JSON tapi status OK)" };
        }

    } catch (error) {
        console.error(`API Request Error ke ${url} (Metode: ${options.method || 'GET'}):`, error);
        showToast(`Gagal: ${error.message || 'Terjadi kesalahan yang tidak diketahui.'}`, 'danger');
        return null;
    }
}

const fetchInventory = async () => {
    if (inventoryTableBody) {
        inventoryTableBody.innerHTML = '<tr><td colspan="9" class="text-center py-5"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div></td></tr>';
    }
    const data = await apiRequest(API_BASE_URL);
    return data || [];
};

async function deleteInventoryItem(id) {
    const responseData = await apiRequest(`${API_BASE_URL}/${id}`, { method: 'DELETE' });

    if (responseData) {
        showToast(`Item inventaris berhasil dihapus.`, 'success');
        await loadInventoryData();
        return true;
    } else {
        return false;
    }
}

function getStatusBadgeHtml(status) {
    const statusMap = {
        'tersedia': 'bg-gradient-success',
        'terpakai': 'bg-blue',
        'rusak': 'bg-gradient-warning',
        'hilang': 'bg-gradient-danger'
    };
    const badgeClass = statusMap[status] || 'bg-gradient-secondary';
    const displayText = (status || '-').toUpperCase();
    return `<span class="badge badge-sm ${badgeClass}">${displayText}</span>`;
}

function displayInventoryItems(data) {
    if (!inventoryTableBody) return;
    inventoryTableBody.innerHTML = '';

    const start = (currentPage - 1) * itemsPerPage;
    const paginatedData = data.slice(start, start + itemsPerPage);

    if (paginatedData.length === 0 && data.length > 0) {
        currentPage = Math.max(1, Math.ceil(data.length / itemsPerPage));
        return displayInventoryItems(data);
    }
    
    if (paginatedData.length === 0) {
        inventoryTableBody.innerHTML = '<tr><td colspan="9" class="text-center py-4">Tidak ada data inventory.</td></tr>';
    } else {
        paginatedData.forEach((item, index) => {
            const row = inventoryTableBody.insertRow();
            row.innerHTML = `
                <td class="text-center">${start + index + 1}</td>
                <td>${item.kode_barang || '-'}</td>
                <td>${truncateText(item.nama_barang, 15) || '-'}</td>
                <td class="text-center">${item.stok ?? '0'}</td>
                <td class="text-center">${item.serial_number ?? '0'}</td>
                <td class="text-center">${item.pemilik ?? '0'}</td>
                <td class="text-center">${getStatusBadgeHtml(item.status)}</td>
                <td>${formatDateOnly(item.tanggal_masuk) || '-'}</td>
                <td style="font-size: 18px;">
                    <a href="detail_item.html?id=${item.id}" title="Detail"><button class="badge badge-sm bg-gradient-success border-0"><i class="fa-solid fa-eye"></i></button></a>
                    <a href="update_item.html?id=${item.id}" title="Edit"><button class="badge badge-sm bg-blue border-0"><i class="fa-solid fa-pen-to-square"></i></button></a>
                    <a href="#" onclick="confirmDeleteItem(${item.id}, event)" title="Delete"><button class="badge badge-sm bg-gradient-danger border-0"><i class="fa-solid fa-trash"></i></button></a>
                </td>`;
        });
    }
    renderPagination(data);
}

function renderPagination(data) {
    if (!paginationContainer || !pageInfo) return;
    const totalItems = data.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

    pageInfo.textContent = totalItems > 0 ? `Halaman ${currentPage} dari ${totalPages}` : 'Tidak ada data';
    paginationContainer.innerHTML = '';

    if (totalPages <= 1 && totalItems === 0) return;
    if (totalPages <= 1) return;


    const createBtn = (text, isDisabled, onClick, isNext = false) => {
        const btn = document.createElement('button');
        btn.className = `btn btn-sm ${isNext ? 'bg-gradient-info' : 'btn-outline-secondary'} me-1`;
        btn.innerHTML = text;
        btn.disabled = isDisabled;
        btn.onclick = onClick;
        paginationContainer.appendChild(btn);
    };

    createBtn('&lsaquo; Sebelumnya', currentPage === 1, () => { if (currentPage > 1) { currentPage--; applyMainTableFilter(); }});
    createBtn('Berikutnya &rsaquo;', currentPage === totalPages, () => { if (currentPage < totalPages) { currentPage++; applyMainTableFilter(); }}, true);
}

async function loadInventoryData() {
    allInventoryItems = await fetchInventory();
    applyMainTableFilter();
}

function applyMainTableFilter() {
    let filtered = allInventoryItems;
    const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
    currentPage = Math.min(currentPage, totalPages);
    currentPage = Math.max(1, currentPage);
    displayInventoryItems(filtered);
}

const reportPeriodOptions = {
    months: [{ value: '01', text: 'Januari' }, { value: '02', text: 'Februari' }, { value: '03', text: 'Maret' }, { value: '04', text: 'April' }, { value: '05', text: 'Mei' }, { value: '06', text: 'Juni' }, { value: '07', text: 'Juli' }, { value: '08', text: 'Agustus' }, { value: '09', text: 'September' }, { value: '10', text: 'Oktober' }, { value: '11', text: 'November' }, { value: '12', text: 'Desember' }],
    quarters: [{ value: '1', text: 'Kuartal 1 (Jan-Mar)' }, { value: '2', text: 'Kuartal 2 (Apr-Jun)' }, { value: '3', text: 'Kuartal 3 (Jul-Sep)' }, { value: '4', text: 'Kuartal 4 (Okt-Des)' }],
    semesters: [{ value: '1', text: 'Semester 1 (Jan-Jun)' }, { value: '2', text: 'Semester 2 (Jul-Des)' }]
};

function populateYears() {
    if (!tahunLaporanSelect) return;
    const currentYear = new Date().getFullYear();
    tahunLaporanSelect.innerHTML = '';
    for (let i = currentYear + 1; i >= 2023; i--) {
        tahunLaporanSelect.add(new Option(i, i, i === currentYear, i === currentYear));
    }
}

function updatePeriodeOptions() {
    if (!jenisLaporanSelect || !periodeLaporanSelect) return;
    const selectedJenis = jenisLaporanSelect.value;
    periodeLaporanSelect.innerHTML = '';
    periodeLaporanSelect.disabled = false;

    let optionsData = [];
    if (selectedJenis === 'Bulanan') optionsData = reportPeriodOptions.months;
    else if (selectedJenis === '3 Bulanan (Kuartal)') optionsData = reportPeriodOptions.quarters;
    else if (selectedJenis === '6 Bulanan (Semester)') optionsData = reportPeriodOptions.semesters;
    else if (selectedJenis === 'Tahunan') {
        periodeLaporanSelect.disabled = true;
        periodeLaporanSelect.add(new Option('N/A (Laporan Tahunan)', ''));
        return;
    } else {
        periodeLaporanSelect.disabled = true;
        periodeLaporanSelect.add(new Option('Pilih Jenis Laporan', '', true, true));
        return;
    }
    periodeLaporanSelect.add(new Option('Pilih Periode...', '', true, true));
    optionsData.forEach(opt => periodeLaporanSelect.add(new Option(opt.text, opt.value)));
}

const addPdfHeaderFooter = (doc, imageElement, pageWidth, pageHeight, margin, isHeader) => {
    const logoPath = 'assets/img/telkom_red.png';
    if (isHeader) {
        const logoWidth = 40, logoHeight = 30;
        const logoX = pageWidth - logoWidth - margin, logoY = margin - 7;
        if (imageElement) {
            try {
                doc.addImage(imageElement, logoPath.split('.').pop().toUpperCase(), logoX, logoY, logoWidth, logoHeight);
            } catch (e) {
                console.error("Error adding logo:", e);
                doc.setFontSize(8).setTextColor(255,0,0).text("Logo Gagal", logoX + logoWidth/2, logoY + logoHeight/2, {align:'center'});
            }
        } else {
             doc.setFontSize(8).setTextColor(150,150,150).text("[No Logo]", logoX + logoWidth/2, logoY + logoHeight/2, {align:'center'});
        }
        doc.setTextColor(0,0,0);
    } else {
        const footerStartY = pageHeight - 30;
        doc.setLineWidth(0.1).line(margin, footerStartY + 2, pageWidth - margin, footerStartY + 2);
        doc.setFontSize(7.5).setTextColor(0,0,0);
        doc.setFont('helvetica', 'bold').text("Kantor Divisi Regional V", margin, footerStartY + 7);
        doc.setFont('helvetica', 'normal');
        ["PT Telkom Indonesia (Persero) Tbk", "Jl. A.P.Pettarani No.2", "Makassar 90221 - Indonesia"].forEach((line, i) => {
            doc.text(line, margin, footerStartY + 7 + (3.5 * (i + 1)));
        });
        doc.text(`www.telkom.co.id`, pageWidth - margin, footerStartY + 15 + 3.5, { align: 'right' });
    }
};

async function downloadLaporanPDF() {
    const { jsPDF } = window.jspdf;
    if (typeof jsPDF?.API?.autoTable !== 'function') {
        return showToast("Library PDF (jspdf & jspdf-autotable) belum dimuat.", "danger");
    }
    if (!jenisLaporanSelect || !tahunLaporanSelect || !periodeLaporanSelect) {
        return showToast("Elemen filter laporan tidak lengkap untuk PDF.", "danger");
    }

    const jenis = jenisLaporanSelect.value, tahun = parseInt(tahunLaporanSelect.value);
    const periodeVal = periodeLaporanSelect.value;
    const periodeText = periodeLaporanSelect.disabled ? 'N/A (Laporan Tahunan)' : (periodeLaporanSelect.options[periodeLaporanSelect.selectedIndex]?.text || 'N/A');

    if (jenis !== 'Tahunan' && !periodeVal) return showToast('Pilih periode laporan.', 'warning');

    let logoImg = null;
    try {
        logoImg = await new Promise(resolve => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => { console.error("Gagal memuat logo PDF."); resolve(null); };
            img.src = 'assets/img/telkom_red.png';
        });
    } catch (e) { console.error("Error promise logo:", e); }

    const itemsToReport = allInventoryItems.filter(item => {
        if (!item.tanggal_masuk) return false;
        const itemDate = new Date(item.tanggal_masuk);
        const itemYear = itemDate.getFullYear(), itemMonth = itemDate.getMonth() + 1;
        if (itemYear !== tahun) return false;
        switch (jenis) {
            case 'Bulanan': return itemMonth === parseInt(periodeVal);
            case '3 Bulanan (Kuartal)':
                const q = parseInt(periodeVal);
                return (q === 1 && itemMonth <= 3) || (q === 2 && itemMonth >= 4 && itemMonth <= 6) ||
                       (q === 3 && itemMonth >= 7 && itemMonth <= 9) || (q === 4 && itemMonth >= 10);
            case '6 Bulanan (Semester)':
                const s = parseInt(periodeVal);
                return (s === 1 && itemMonth <= 6) || (s === 2 && itemMonth >= 7);
            case 'Tahunan': return true;
            default: return false;
        }
    });

    if (itemsToReport.length === 0) {
        return showToast(`<b>Tidak ada data inventory yang cocok.</b><br><ul style="padding-left:20px;text-align:left;"><li>Jenis: ${jenis}</li><li>Tahun: ${tahun}</li><li>Periode: ${periodeText}</li></ul>`, 'info');
    }

    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 14;
    let currentY = margin + 5;

    doc.setFontSize(14).setFont('helvetica', 'bold').text("LAPORAN DATA INVENTORY", pageW / 2, currentY + 10, { align: 'center' });
    currentY += 20;
    doc.setFontSize(9).setFont('helvetica', 'normal');
    [`Jenis Laporan : ${jenis}`, `Tahun         : ${tahun}`, `Periode       : ${periodeText}`,
     `Tanggal Cetak : ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Makassar' })}`]
    .forEach(line => { doc.text(line, margin, currentY); currentY += 5; });
    currentY += 3;

    doc.autoTable({
        head: [["No", "Kode", "Nama Barang", "Stok", "Lokasi", "Status", "Tgl Masuk", "Tgl Terpakai"]],
        body: itemsToReport.map((item, i) => [
            i + 1, truncateText(item.kode_barang, 15), truncateText(item.nama_barang, 25),
            item.stok ?? '0', truncateText(item.lokasi, 20), (item.status || '-').toUpperCase(),
            formatDateOnly(item.tanggal_masuk) || 'N/A', item.tanggal_terpakai ? formatDateOnly(item.tanggal_terpakai) : '-'
        ]),
        startY: currentY, theme: 'grid',
        headStyles: { fillColor: [218, 41, 28], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
        styles: { fontSize: 8, cellPadding: 1.5, overflow: 'linebreak', lineWidth: 0.3 },
        columnStyles: {
            0: { cellWidth: 8, halign: 'right' }, 1: { cellWidth: 25 }, 2: { cellWidth: 35 },
            3: { cellWidth: 12, halign: 'center' }, 4: { cellWidth: 30 }, 5: { cellWidth: 20, halign: 'center' },
            6: { cellWidth: 20, halign: 'center' }, 7: { cellWidth: 20, halign: 'center' }
        },
        didDrawPage: data => {
            addPdfHeaderFooter(doc, logoImg, pageW, pageH, margin, true);
            addPdfHeaderFooter(doc, null, pageW, pageH, margin, false);
        },
        margin: { top: 30, right: margin, bottom: 30, left: margin }
    });

    const clean = (text) => (text || '').replace(/[^a-zA-Z0-9_]/g, '');
    const fileName = `Laporan_Inventory_${clean(jenis)}_${tahun}_${clean(periodeVal) || 'Tahunan'}.pdf`;
    doc.save(fileName);
    showToast(`PDF "${fileName}" berhasil dibuat.`, 'success');
}

const tambahData = () => { window.location.href = "add_item.html"; };

function confirmDeleteItem(id, event) {
    event.stopPropagation();
    Swal.fire({
        title: 'Anda yakin?',
        html: `Data akan dihapus permanen!<br/>Tindakan ini tidak dapat dibatalkan.`, // Anda bisa tambahkan ID item di sini jika mau: `Data item ID ${id} akan dihapus...`
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Ya, hapus!',
        cancelButtonText: 'Batal'
    }).then(async (result) => {
        if (result.isConfirmed) {
            // Panggil fungsi deleteInventoryItem yang sudah kita definisikan
            const success = await deleteInventoryItem(id); 
            
            // deleteInventoryItem sudah menangani toast dan reload data jika sukses.
            // Anda bisa menambahkan logika tambahan di sini jika 'success' adalah true atau false.
            // Misalnya, jika ada modal yang perlu ditutup atau notifikasi spesifik lainnya.
        }
    });
}

const toggleSidebar = () => document.body.classList.toggle('sidebar-open');
const closeSidebar = () => document.body.classList.remove('sidebar-open');

document.addEventListener('DOMContentLoaded', () => {
    jenisLaporanSelect = document.getElementById('jenisLaporan');
    periodeLaporanSelect = document.getElementById('periodeLaporan');
    tahunLaporanSelect = document.getElementById('tahunLaporan');
    logoutLink = document.getElementById('logoutLink');
    inventoryTableBody = document.querySelector('#logTable tbody');
    paginationContainer = document.getElementById('pagination');
    pageInfo = document.getElementById('page-info');

    if (tahunLaporanSelect) populateYears();
    if (jenisLaporanSelect) {
      jenisLaporanSelect.addEventListener('change', updatePeriodeOptions);
      updatePeriodeOptions();
    }
    
    loadInventoryData();

    document.getElementById('downloadPdfBtn')?.addEventListener('click', downloadLaporanPDF);

        if (logoutLink) {
        logoutLink.addEventListener('click', async function(event) {
        event.preventDefault();
        this.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Signing Out...';
        this.style.pointerEvents = 'none';
        const token = localStorage.getItem('access_token');
        try {
            if (token) {
            await fetch('http://127.0.0.1:8000/api/logout', {
                method: 'POST',
                headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }
            });
            }
        } catch (error) {
            console.error('Error saat API logout:', error);
        } finally {
            ['user_id', 'access_token', 'user_name', 'filter_jenis', 'filter_wilayah'].forEach(key => localStorage.removeItem(key));
            window.location.href = 'login.html';
        }
        });
    }
});
window.confirmDeleteItem = confirmDeleteItem;
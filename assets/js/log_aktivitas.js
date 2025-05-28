let allLogs = [];
let currentPage = 1;
const itemsPerPage = 10;

const monthsOptions = [
  { value: '1', text: 'Januari' }, { value: '2', text: 'Februari' },
  { value: '3', text: 'Maret' }, { value: '4', text: 'April' },
  { value: '5', text: 'Mei' }, { value: '6', text: 'Juni' },
  { value: '7', text: 'Juli' }, { value: '8', text: 'Agustus' },
  { value: '9', text: 'September' }, { value: '10', text: 'Oktober' },
  { value: '11', text: 'November' }, { value: '12', text: 'Desember' }
];

const quartersOptions = [
  { value: '1', text: 'Kuartal 1 (Jan-Mar)' }, { value: '2', text: 'Kuartal 2 (Apr-Jun)' },
  { value: '3', text: 'Kuartal 3 (Jul-Sep)' }, { value: '4', text: 'Kuartal 4 (Okt-Des)' }
];

const semestersOptions = [
  { value: '1', text: 'Semester 1 (Jan-Jun)' }, { value: '2', text: 'Semester 2 (Jul-Des)' }
];

let jenisLaporanSelect, periodeLaporanSelect, tahunLaporanSelect,
    filterJenisSelect, filterWilayahSelect, logoutLink;

const formatDate = (isoString, includeTime = false) => {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    const pad = (n) => n.toString().padStart(2, '0');
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    if (!includeTime) return `${year}-${month}-${day}`;
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  } catch (e) {
    console.error("Error formatting date:", isoString, e);
    return 'Invalid Date';
  }
};

const showToast = (message, type = 'info') => {
  let toastContainer = document.querySelector('.toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
    toastContainer.style.zIndex = '1100';
    document.body.appendChild(toastContainer);
  }

  const typeMap = {
    success: { bg: 'text-bg-success', icon: 'fas fa-check-circle' },
    danger: { bg: 'text-bg-danger', icon: 'fas fa-exclamation-triangle' },
    warning: { bg: 'text-bg-warning text-dark', icon: 'fas fa-exclamation-circle' },
    info: { bg: 'text-bg-info', icon: 'fas fa-info-circle' }
  };
  const { bg, icon } = typeMap[type] || typeMap.info;

  const toastEl = document.createElement('div');
  toastEl.className = `toast align-items-center ${bg} border-0`;
  toastEl.setAttribute('role', 'alert');
  toastEl.innerHTML = `
    <div class="d-flex">
      <div class="toast-body"><i class="${icon} me-2"></i> ${message}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>`;
  toastContainer.appendChild(toastEl);
  const toast = new bootstrap.Toast(toastEl, { delay: 5000 });
  toast.show();
  toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
};

const handleAuthError = (message = 'Sesi Anda tidak valid. Silakan login ulang.') => {
  showToast(message, 'danger');
  localStorage.removeItem('access_token');
  setTimeout(() => { window.location.href = 'login.html'; }, 2500);
};

async function loadLogAktivitas() {
  const token = localStorage.getItem('access_token');
  if (!token) {
    handleAuthError('Sesi Anda tidak valid atau telah berakhir. Silakan login ulang.');
    return;
  }

  const tableBody = document.querySelector('#logTable tbody');
  if (tableBody) {
    tableBody.innerHTML = '<tr><td colspan="8" class="text-center py-5"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div></td></tr>';
  }

  try {
    const response = await fetch('http://127.0.0.1:8000/api/logaktivitas', {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
    });

    if (!response.ok) {
      if (response.status === 401) handleAuthError();
      throw new Error(`Gagal memuat log aktivitas (Status: ${response.status})`);
    }
    allLogs = await response.json();
    applyInitialFiltersAndDisplay();
  } catch (error) {
    console.error("Error saat load log aktivitas:", error);
    if (!error.message.includes("Sesi Anda tidak valid")) {
      showToast('Gagal memuat log aktivitas. Coba lagi nanti.', 'danger');
    }
  }
}

const truncateText = (text, maxLength) => {
  if (typeof text !== 'string' || text === null) return '';
  return text.length > maxLength ? text.slice(0, maxLength) + '…' : text;
};

function displayLogAktivitas(data) {
  const tableBody = document.querySelector('#logTable tbody');
  if (!tableBody) return;
  tableBody.innerHTML = '';

  const start = (currentPage - 1) * itemsPerPage;
  const paginatedData = data.slice(start, start + itemsPerPage);

  if (paginatedData.length === 0 && data.length > 0) {
    currentPage = Math.max(1, Math.ceil(data.length / itemsPerPage));
    displayLogAktivitas(data);
    return;
  }

  if (paginatedData.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="8" class="text-center py-4">Tidak ada data yang cocok dengan filter.</td></tr>';
  } else {
    paginatedData.forEach((log, index) => {
      let statusBadge = '';
      switch (log.status) {
        case 'resolved': statusBadge = '<span class="badge badge-sm bg-gradient-success">RESOLVED</span>'; break;
        case 'pending': statusBadge = '<span class="badge badge-sm bg-gradient-primary">PENDING</span>'; break;
        case 'canceled': statusBadge = '<span class="badge badge-sm bg-gradient-danger">CANCELED</span>'; break;
        default: statusBadge = `<span class="badge badge-sm bg-secondary">${String(log.status || '').toUpperCase()}</span>`;
      }
      const row = tableBody.insertRow();
      row.innerHTML = `
        <td style="padding-left: 30px;">${start + index + 1}.</td>
        <td style="padding-left: 25px;">${log.jenis || ''}</td>
        <td>${truncateText(log.keterangan, 15)}</td>
        <td>${truncateText(`${log.lokasi_kerja || ''} - ${log.lokasi || ''}`, 25)}</td>
        <td class="text-center">${statusBadge}</td>
        <td>${truncateText(log.pic, 11)}</td>
        <td>${formatDate(log.waktu_kejadian, true)}</td>
        <td style="font-size: 18px;">
          <a href="detail_log.html?id=${log.id}" title="Detail"><button class="badge badge-sm bg-gradient-success border-0"><i class="fa-solid fa-eye"></i></button></a>
          <a href="update_log.html?id=${log.id}" title="Edit"><button class="badge badge-sm bg-blue border-0"><i class="fa-solid fa-pen-to-square"></i></button></a>
          <a href="#" onclick="confirmDelete(${log.id}, event)" title="Delete"><button class="badge badge-sm bg-gradient-danger border-0"><i class="fa-solid fa-trash"></i></button></a>
        </td>`;
    });
  }
  renderPagination(data);
}

function renderPagination(data) {
  const totalItems = data.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginationContainer = document.getElementById('pagination');
  const pageInfo = document.getElementById('page-info');

  if (!paginationContainer || !pageInfo) return;

  pageInfo.textContent = totalPages > 0 ? `Halaman ${currentPage} dari ${totalPages}` : 'Tidak ada data';
  paginationContainer.innerHTML = '';

  if (totalPages <= 1) return;

  const createButton = (text, onClick, disabled, isNext = false) => {
    const btn = document.createElement('button');
    btn.className = `btn btn-sm ${isNext ? 'bg-gradient-info' : 'btn-outline-info'}`;
    btn.innerHTML = text;
    btn.disabled = disabled;
    btn.onclick = onClick;
    return btn;
  };

  paginationContainer.appendChild(createButton('&lsaquo; Sebelumnya', () => { if (currentPage > 1) { currentPage--; filterData(); }}, currentPage === 1));
  paginationContainer.appendChild(createButton('Berikutnya &rsaquo;', () => { if (currentPage < totalPages) { currentPage++; filterData(); }}, currentPage === totalPages, true));
}

function filterData() {
  const selectedJenis = filterJenisSelect?.value || '';
  const selectedWilayah = filterWilayahSelect?.value || '';

  localStorage.setItem('filter_jenis', selectedJenis);
  localStorage.setItem('filter_wilayah', selectedWilayah);

  let filtered = allLogs;
  if (selectedJenis) filtered = filtered.filter(log => log.jenis === selectedJenis);
  if (selectedWilayah) filtered = filtered.filter(log => log.lokasi_kerja === selectedWilayah);

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  if (currentPage > totalPages) currentPage = totalPages;

  displayLogAktivitas(filtered);
}

function applyInitialFiltersAndDisplay() {
  if (filterJenisSelect) filterJenisSelect.value = localStorage.getItem('filter_jenis') || '';
  if (filterWilayahSelect) filterWilayahSelect.value = localStorage.getItem('filter_wilayah') || '';
  filterData();
}

function updatePeriodeOptions() {
  if (!jenisLaporanSelect || !periodeLaporanSelect) return;

  const selectedJenis = jenisLaporanSelect.value;
  periodeLaporanSelect.innerHTML = '';
  periodeLaporanSelect.disabled = false;

  let optionsToAdd = [];
  switch (selectedJenis) {
    case 'Bulanan': optionsToAdd = monthsOptions; break;
    case '3 Bulanan (Kuartal)': optionsToAdd = quartersOptions; break;
    case '6 Bulanan (Semester)': optionsToAdd = semestersOptions; break;
    case 'Tahunan':
      periodeLaporanSelect.disabled = true;
      periodeLaporanSelect.add(new Option('N/A (Laporan Tahunan)', ''));
      return;
    default:
      periodeLaporanSelect.disabled = true;
      periodeLaporanSelect.add(new Option('Pilih Jenis Laporan Dulu', '', true, true));
      return;
  }

  periodeLaporanSelect.add(new Option('Pilih Periode...', '', true, true));
  optionsToAdd.forEach(opt => periodeLaporanSelect.add(new Option(opt.text, opt.value)));
}

async function downloadLaporanPDF() {
  const { jsPDF } = window.jspdf;
  if (typeof jsPDF?.API?.autoTable === 'undefined') {
    showToast("Gagal memuat fungsi PDF. Pastikan library PDF sudah dimuat.", "danger");
    return;
  }

  if (!jenisLaporanSelect || !tahunLaporanSelect || !periodeLaporanSelect || !filterJenisSelect || !filterWilayahSelect) {
    showToast("Elemen filter laporan tidak lengkap untuk membuat PDF.", "danger");
    return;
  }

  const selectedJenisLaporan = jenisLaporanSelect.value;
  const selectedTahun = parseInt(tahunLaporanSelect.value);
  const selectedPeriodeValue = periodeLaporanSelect.value;
  const selectedPeriodeText = periodeLaporanSelect.disabled ? 'N/A (Laporan Tahunan)' : (periodeLaporanSelect.options[periodeLaporanSelect.selectedIndex]?.text || 'N/A');
  const selectedFilterJenis = filterJenisSelect.value;
  const selectedFilterWilayah = filterWilayahSelect.value;

  if (selectedJenisLaporan !== 'Tahunan' && !selectedPeriodeValue) {
    showToast('Silakan pilih periode laporan terlebih dahulu.', 'warning');
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

  let filteredLogs = allLogs.filter(log => {
    try {
      if (!log.waktu_kejadian) return false;
      const logDate = new Date(log.waktu_kejadian);
      const logYear = logDate.getFullYear();
      const logMonth = logDate.getMonth() + 1;

      if (logYear !== selectedTahun) return false;

      switch (selectedJenisLaporan) {
        case 'Bulanan': return logMonth === parseInt(selectedPeriodeValue);
        case '3 Bulanan (Kuartal)':
          const q = parseInt(selectedPeriodeValue);
          return (q === 1 && logMonth <= 3) || (q === 2 && logMonth >= 4 && logMonth <= 6) ||
                 (q === 3 && logMonth >= 7 && logMonth <= 9) || (q === 4 && logMonth >= 10);
        case '6 Bulanan (Semester)':
          const s = parseInt(selectedPeriodeValue);
          return (s === 1 && logMonth <= 6) || (s === 2 && logMonth >= 7);
        case 'Tahunan': return true;
        default: return false;
      }
    } catch (e) { console.error("Error filter log date:", log.waktu_kejadian, e); return false; }
  });

  if (selectedFilterJenis) filteredLogs = filteredLogs.filter(log => log.jenis === selectedFilterJenis);
  if (selectedFilterWilayah) filteredLogs = filteredLogs.filter(log => log.lokasi_kerja === selectedFilterWilayah);

  if (filteredLogs.length === 0) {
    showToast(`<b>Tidak ada data log yang cocok.</b><br>Jenis: ${selectedJenisLaporan}, Tahun: ${selectedTahun}, Periode: ${selectedPeriodeText}, Kategori: ${selectedFilterJenis || 'Semua'}, Wilayah: ${selectedFilterWilayah || 'Semua'}`, 'info');
    return;
  }

  const doc = new jsPDF();
  const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.width || doc.internal.pageSize.getWidth();
  const margin = 14;

  const addHeaderFooter = (docInstance, imageElement, isHeader) => {
    if (isHeader) {
      const logoWidth = 40, logoHeight = 30, logoX = pageWidth - logoWidth - margin, logoY = margin - 7;
      if (imageElement) {
        try {
          docInstance.addImage(imageElement, logoPath.split('.').pop().toUpperCase(), logoX, logoY, logoWidth, logoHeight);
        } catch (e) { console.error("Error addImage:", e); docInstance.text("Logo Gagal", logoX, logoY + 5, {fontSize: 8, textColor: 'red'}); }
      } else { docInstance.text("[No Logo]", logoX + logoWidth / 2, logoY + logoHeight / 2, {align: 'center', fontSize: 8, textColor: [150,150,150]}); }
    } else { // Footer
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
  doc.setFontSize(14).setFont('helvetica', 'bold').text("LAPORAN LOG AKTIVITAS", pageWidth / 2, currentY + 15, { align: 'center' });
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

  const tableColumnNames = ["No", "Kategori", "Keterangan", "Lokasi", "Status", "PIC", "Waktu Kejadian"];
  const tableData = filteredLogs.map((log, index) => [
    index + 1,
    truncateText(log.jenis, 15) || '',
    truncateText(log.keterangan, 40) || '',
    `${log.lokasi_kerja || ''} - ${log.lokasi || ''}`,
    truncateText(log.status, 12) || '',
    truncateText(log.pic, 15) || '',
    log.waktu_kejadian ? formatDate(log.waktu_kejadian, true) : 'N/A'
  ]);

  doc.autoTable({
    head: [tableColumnNames], body: tableData, startY: currentY, theme: 'grid',
    headStyles: { fillColor: [218, 41, 28], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
    styles: { fontSize: 8, cellPadding: 1.8, overflow: 'linebreak', lineWidth: 0.5 },
    columnStyles: {
      0: { cellWidth: 8, halign: 'right' }, 1: { cellWidth: 18 }, 2: { cellWidth: 50 },
      3: { cellWidth: 50 }, 4: { cellWidth: 18 }, 5: { cellWidth: 20 }, 6: { cellWidth: 22 }
    },
    didDrawPage: (data) => {
      addHeaderFooter(doc, loadedLogoImage, true);
      addHeaderFooter(doc, null, false);
    },
    margin: { top: 35, right: margin, bottom: 35, left: margin }
  });

  const cleanText = (text) => (text || '').replace(/[^a-zA-Z0-9_]/g, '');
  const fileName = `Laporan_${cleanText(selectedJenisLaporan) || 'Data'}_${selectedTahun}_${cleanText(selectedPeriodeValue) || 'Tahunan'}_Kategori-${cleanText(selectedFilterJenis) || 'Semua'}_Wilayah-${cleanText(selectedFilterWilayah) || 'Semua'}.pdf`;
  doc.save(fileName);
  showToast(`PDF "${fileName}" berhasil dibuat.`, 'success');
}

async function deleteLog(id) {
  const token = localStorage.getItem('access_token');
  if (!token) {
    handleAuthError();
    return false;
  }
  try {
    const response = await fetch(`http://127.0.0.1:8000/api/logaktivitas/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
    });

    if (response.status === 401) {
      handleAuthError();
      throw new Error('Unauthorized');
    }
    if (response.ok) {
      showToast(`Data berhasil dihapus.`, 'success');
      await loadLogAktivitas();
      return true;
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Gagal menghapus log (Status: ${response.status})`);
  } catch (error) {
    console.error("Error saat menghapus log:", error);
    if (error.message !== 'Unauthorized') {
      showToast(error.message || 'Terjadi kesalahan saat menghapus data.', 'danger');
    }
    return false;
  }
}

async function confirmDelete(id, event) {
  event.preventDefault();
  Swal.fire({
    title: 'Anda Yakin?',
    html: `Data akan dihapus permanen!<br/>Tindakan ini tidak dapat dibatalkan.`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6',
    confirmButtonText: 'Ya, Hapus!',
    cancelButtonText: 'Batal',
  }).then(async (result) => {
    if (result.isConfirmed) {
      await deleteLog(id);
    }
  });
}

const toggleSidebar = () => document.body.classList.toggle('sidebar-open');
const closeSidebar = () => document.body.classList.remove('sidebar-open');
const tambahData = () => { window.location.href = "add_log.html"; };

document.addEventListener('DOMContentLoaded', () => {
  jenisLaporanSelect = document.getElementById('jenisLaporan');
  periodeLaporanSelect = document.getElementById('periodeLaporan');
  tahunLaporanSelect = document.getElementById('tahunLaporan');
  filterJenisSelect = document.getElementById('filterJenis');
  filterWilayahSelect = document.getElementById('filterWilayah');
  logoutLink = document.getElementById('logoutLink');

  if (!jenisLaporanSelect || !filterJenisSelect) {
     console.error("Satu atau lebih elemen select filter utama tidak ditemukan. Fungsi mungkin terganggu.");
  }

  if (jenisLaporanSelect) {
    jenisLaporanSelect.addEventListener('change', updatePeriodeOptions);
    updatePeriodeOptions();
  }

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
  loadLogAktivitas();
});
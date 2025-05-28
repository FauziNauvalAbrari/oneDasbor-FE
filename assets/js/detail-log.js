
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
      case 'success': bgColorClass = 'text-bg-success'; iconClass = 'fas fa-check-circle'; break; // Hijau
      case 'danger': bgColorClass = 'text-bg-danger'; iconClass = 'fas fa-exclamation-triangle'; break; // Merah
      case 'warning': bgColorClass = 'text-bg-warning text-dark'; iconClass = 'fas fa-exclamation-circle'; break; // Kuning
  }

  // Buat elemen toast HTML
  const toastEl = document.createElement('div');
  toastEl.className = `toast align-items-center ${bgColorClass} border-0`;
  toastEl.setAttribute('role', 'alert');
  toastEl.setAttribute('aria-live', 'assertive');
  toastEl.setAttribute('aria-atomic', 'true');
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
      const toast = new bootstrap.Toast(toastEl, { delay: 4000 }); // Tampil selama 4 detik
      try {
          toast.show();
      } catch (e) {
          console.error("Gagal menampilkan Bootstrap toast:", e);
          alert(message);
      }
  } else {
      console.error("Komponen Bootstrap Toast tidak tersedia. Pastikan Bootstrap JS (Bundle) sudah dimuat.");
      alert(message);
  }

  toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
    }

    function goBack() { window.history.back(); }
    function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
        if(sidebar) {
            document.body.classList.toggle('sidebar-open');
            sidebar.classList.toggle('active');
        }
    }

    function closeSidebar() {
    const sidebar = document.querySelector('.sidebar');
        if(sidebar) {
            sidebar.classList.remove('active');
            document.body.classList.remove('sidebar-open');
        }
    }
    document.addEventListener('DOMContentLoaded', function() {

    const token = localStorage.getItem('access_token');

    if (!token) {
        showToast('Anda harus login untuk mengakses halaman ini.', 'danger');
        setTimeout(() => { window.location.href = 'login.html'; }, 2500);
        return;
    }

    const logoutLink = document.getElementById('logoutLink'); // Pastikan ID ini ada di HTML
    if (logoutLink) {
        logoutLink.addEventListener('click', (event) => {
            event.preventDefault();
                ['user_id', 
                 'user_name', 
                 'access_token', 
                 'filter_jenis', 
                 'filter_wilayah'
                ].forEach(key => localStorage.removeItem(key));
                setTimeout(() => { window.location.href = 'login.html'; }, 1000); // Redirect ke login
        });
    }

    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get("id");

    if (id) {
        fetchDetailLogAktivitas(id, token);
    } else {
        showToast("ID log aktivitas tidak ditemukan di URL.", "warning");

        const mainContentArea = document.querySelector('.main');
        if(mainContentArea) mainContentArea.innerHTML = '<div class="alert alert-warning">ID log aktivitas tidak valid.</div>';
    }

    });

function getStatusBadgeSuratHtml(statusValue) {
    console.log("[getStatusBadgeSuratHtml] Original status value received:", statusValue);

    let processedStatusKey = 'unknown';

    if (statusValue !== null && statusValue !== undefined && String(statusValue).trim() !== '') {
        processedStatusKey = String(statusValue).toLowerCase();
    }

    console.log("[getStatusBadgeSuratHtml] Processed status key for map:", processedStatusKey);

    const statusMap = {
        'pending': { class: 'bg-gradient-warning', text: 'PENDING' },
        'resolved': { class: 'bg-gradient-success', text: 'RESOLVED' },
        'canceled': { class: 'bg-gradient-danger', text: 'CANCELED' }
    };

    const currentStatusConfig = statusMap[processedStatusKey] || { class: 'bg-gradient-secondary', text: processedStatusKey.toUpperCase() };
    
    console.log("[getStatusBadgeSuratHtml] Applied badge class:", currentStatusConfig.class, "Text:", currentStatusConfig.text);

    return `<span class="badge badge-sm ${currentStatusConfig.class}">${currentStatusConfig.text}</span>`;
}

    function fetchDetailLogAktivitas(id, token) {
    console.log(`Workspaceing detail log ID: ${id}`);
    const apiUrl = `http://127.0.0.1:8000/api/logaktivitas/${id}`;

    fetch(apiUrl, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
        }
    })
    .then(response => {
        if (response.status === 401) {
            showToast('Sesi tidak valid. Silakan login ulang.', 'danger');
            localStorage.removeItem('access_token');
            setTimeout(() => { window.location.href = 'login.html'; }, 2500);
            throw new Error('Unauthorized');
        }
        if (!response.ok) {
            throw new Error(`Gagal memuat data (Status: ${response.status})`);
        }
        return response.json();
    })
    .then(data => {
        console.log("Data detail diterima:", data);

        const setText = (elementId, value) => {
            const el = document.getElementById(elementId);
            if (el) el.textContent = value || "-";
            else console.warn(`Elemen dengan ID "${elementId}" tidak ditemukan.`);
        };
        const setFormattedDate = (elementId, value) => {
            const el = document.getElementById(elementId);
            if (el) el.textContent = value ? new Date(value).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short'}) : "-";
            else console.warn(`Elemen dengan ID "${elementId}" tidak ditemukan.`);
        }

        setText("jenis", data.jenis);
        setText("keterangan", data.keterangan);
        setText("lokasi", data.lokasi);
        setText("lokasi_kerja", data.lokasi_kerja);
        const statusElement = document.getElementById("status");
        if (statusElement) {
            statusElement.innerHTML = getStatusBadgeSuratHtml(data.status);
        } else {
            console.warn(`Elemen dengan ID "status" tidak ditemukan untuk badge.`);
        }
        setText("pic", data.pic);
        setFormattedDate("waktu_kejadian", data.waktu_kejadian);
        setFormattedDate("created_at", data.created_at);
        setFormattedDate("updated_at", data.updated_at);

        const evidenContainer = document.getElementById("eviden");
        if (evidenContainer) {
            evidenContainer.innerHTML = '';
            try {
                const evidenList = data.eviden && typeof data.eviden === 'string' ? JSON.parse(data.eviden) : (Array.isArray(data.eviden) ? data.eviden : []);

                if (Array.isArray(evidenList) && evidenList.length > 0) {
                    evidenList.forEach(src => {
                        if (typeof src === 'string' && src.trim()) {
                            let imagePath = src.replace(/\\/g, '/').replace(/^eviden\//i, '');
                            console.log("Final imagePath for URL:", imagePath);
                            const img = document.createElement('img');
                            img.src = `http://127.0.0.1:8000/storage/eviden/${imagePath}`;
                            img.className = "img-fluid m-2";
                            img.style.maxWidth = '400px';
                            img.style.maxHeight = '200px';
                            img.style.borderRadius = '4px';
                            img.style.cursor = 'pointer';
                            img.onclick = () => window.open(img.src, '_blank');
                            img.onerror = () => {
                                console.error(`Gagal memuat gambar: ${img.src}`);
                                img.style.display = 'none';
                            };
                            evidenContainer.appendChild(img);
                        }
                    });
                } else {
                    evidenContainer.innerHTML = '<p class="text-muted fst-italic">Tidak ada eviden.</p>';
                }
            } catch (e) {
                console.error("Error saat memproses data eviden:", e);
                evidenContainer.innerHTML = '<p class="text-danger"><em>Gagal memuat data eviden.</em></p>';
            }
        } else {
            console.warn("Elemen container dengan ID 'eviden' tidak ditemukan.");
        }

    })
    .catch(error => {
        console.error("Terjadi kesalahan:", error);
        if (error.message !== 'Unauthorized') {
            showToast(error.message || "Terjadi kesalahan saat memuat detail.", 'danger');
            const mainContentArea = document.querySelector('.main');
            if(mainContentArea) mainContentArea.innerHTML = `<div class="alert alert-danger">${error.message || "Gagal memuat detail."}</div>`;
        }
    });
}
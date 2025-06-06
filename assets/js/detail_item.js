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
          <div class="toast-body">
              <i class="${iconClass} me-2"></i> ${message}
          </div>
          <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
  `;

  toastContainer.appendChild(toastEl);

  if (typeof bootstrap !== 'undefined' && bootstrap.Toast) {
      const toast = new bootstrap.Toast(toastEl, { delay: 4000 });
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

    const logoutLink = document.getElementById('logoutLink');
    if (logoutLink) {
        logoutLink.addEventListener('click', (event) => {
            event.preventDefault();
            ['user_id', 'user_name', 'access_token', 'filter_jenis', 'filter_wilayah'].forEach(key => localStorage.removeItem(key));
            showToast("Anda telah logout.", "info");
            setTimeout(() => { window.location.href = 'login.html'; }, 1000);
        });
    }

    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get("id");

    if (id) {
        fetchDetailInventory(id, token);
    } else {
        showToast("ID item inventaris tidak ditemukan di URL.", "warning");
        const mainContentArea = document.querySelector('.main');
        if(mainContentArea) mainContentArea.innerHTML = '<div class="alert alert-warning text-center py-5"><h2>ID item inventaris tidak valid.</h2><button class="btn btn-gradient-info mt-3" onclick="goBack()">Kembali</button></div>';
    }
});

async function fetchDetailInventory(id, token) {
    console.log(`Workspaceing detail for inventory item ID: ${id}`);
    const apiUrl = `${API_BASE_URL_INVENTORY}/${id}`;

    try {
        const response = await fetch(apiUrl, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
            }
        });

        if (response.status === 401) {
            showToast('Sesi tidak valid. Silakan login ulang.', 'danger');
            localStorage.removeItem('access_token');
            setTimeout(() => { window.location.href = 'login.html'; }, 2500);
            return;
        }
        if (!response.ok) {
            throw new Error(`Gagal memuat data (Status: ${response.status})`);
        }
        const data = await response.json();
        console.log("Data detail inventaris diterima:", data);

        // Populate HTML elements with data
        const setText = (elementId, value) => {
            const el = document.getElementById(elementId);
            if (el) el.textContent = value || "-";
            else console.warn(`Element with ID "${elementId}" not found.`);
        };

        const setFormattedDate = (elementId, value) => {
            const el = document.getElementById(elementId);
            if (el) el.textContent = value ? new Date(value).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric'}) : "-";
            else console.warn(`Element with ID "${elementId}" not found.`);
        };
        function getStatusBadgeSuratHtml(status) {
            status = status ? status.toLowerCase() : 'unknown';
            const statusMap = {
                'rusak': { class: 'bg-gradient-warning', text: 'RUSAK' },
                'tersedia': { class: 'bg-gradient-success', text: 'tersedia' },
                'terpakai': { class: 'bg-gradient-info', text: 'terpakai' },
                'hilang': { class: 'bg-gradient-danger', text: 'hilang' }
            };
            const currentStatus = statusMap[status] || { class: 'bg-gradient-secondary', text: status.toUpperCase() };
            return `<span class="badge badge-sm ${currentStatus.class}">${currentStatus.text}</span>`;
        }

        setText("kode_barang", data.kode_barang);
        setText("nama_barang", data.nama_barang);
        setText("stok", data.stok);
        setText("lokasi", data.lokasi);
        setText("serial_number", data.serial_number);
        setText("pemilik", data.pemilik);
        const statusElement = document.getElementById("status");
        if (statusElement) {
            statusElement.innerHTML = getStatusBadgeSuratHtml(data.status);
        } else {
            console.warn(`Element with ID "status" not found for badge.`);
        }
        setFormattedDate("tanggal_masuk", data.tanggal_masuk);
        setFormattedDate("tanggal_terpakai", data.tanggal_terpakai);
        setFormattedDate("created_at", data.created_at);
        setFormattedDate("updated_at", data.updated_at);

        const fotoContainer = document.getElementById("foto_barang_container");
        if (fotoContainer) {
            fotoContainer.innerHTML = '';
            try {
                const fotoList = data.foto && typeof data.foto === 'string' ? JSON.parse(data.foto) : (Array.isArray(data.foto) ? data.foto : []);

                if (Array.isArray(fotoList) && fotoList.length > 0) {
                    fotoList.forEach(src => {
                        if (typeof src === 'string' && src.trim()) {
                            let imagePath = src.replace(/\\/g, '/').replace(/^inventaris\//i, '');
                            console.log("Final imagePath for URL:", imagePath);
                            const img = document.createElement('img');
                            
                            img.src = `http://127.0.0.1:8000/storage/inventaris/${imagePath}`;
                            img.className = "img-fluid m-2 shadow-sm border";
                            img.style.maxWidth = '300px';
                            img.style.maxHeight = '200px';
                            img.style.borderRadius = '8px';
                            img.style.cursor = 'pointer';
                            img.alt = data.nama_barang;
                            img.onclick = () => window.open(img.src, '_blank');
                            img.onerror = () => {
                                console.error(`Failed to load image: ${img.src}`);
                                img.style.display = 'none';
                            };
                            fotoContainer.appendChild(img);
                        }
                    });
                } else {
                    fotoContainer.innerHTML = '<p class="text-muted fst-italic">Tidak ada foto barang.</p>';
                }
            } catch (e) {
                console.error("Error processing foto data:", e);
                fotoContainer.innerHTML = '<p class="text-danger"><em>Gagal memuat foto barang.</em></p>';
            }
        } else {
            console.warn("Element container with ID 'foto_barang_container' not found.");
        }

        const userFullName = data.user ? data.user.name : '-';
        setText("user_created", userFullName);
        
        setFormattedDate("created_at", data.created_at);
        setFormattedDate("updated_at", data.updated_at);

    } catch (error) {
        console.error("Terjadi kesalahan:", error);
        if (error.message !== 'Unauthorized') {
            showToast(error.message || "Terjadi kesalahan saat memuat detail.", 'danger');
            const mainContentArea = document.querySelector('.main');
            if(mainContentArea) mainContentArea.innerHTML = `<div class="alert alert-danger text-center py-5"><h2>${error.message || "Gagal memuat detail item inventaris."}</h2><button class="btn btn-gradient-info mt-3" onclick="goBack()">Kembali</button></div>`;
        }
    }
}

window.goBack = goBack;
window.toggleSidebar = toggleSidebar;
window.closeSidebar = closeSidebar;
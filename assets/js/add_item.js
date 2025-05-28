const API_BASE_URL_INVENTORY = 'http://127.0.0.1:8000/api/inventory';

function showToast(message, type = 'info') {
    let toastContainer = document.querySelector('.toast-container');

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
        const toast = new bootstrap.Toast(toastEl, { delay: 5000 });
        try {
            toast.show();
        } catch (e) {
            console.error("Error showing Bootstrap toast:", e);
            alert(message);
        }
    } else {
        console.error("Bootstrap Toast component is not available.");
        alert(message);
    }

    toastEl.addEventListener('hidden.bs.toast', function () {
        toastEl.remove();
    });
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

function goBack() {
    window.history.back();
}

document.addEventListener('DOMContentLoaded', function () {
    let isAuthenticated = false;

    (function checkAuthentication() {
        const token = localStorage.getItem('access_token');

        if (!token) {
            showToast('Sesi Anda tidak valid atau telah berakhir. Silakan login ulang.', 'danger');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2500);
            isAuthenticated = false;
        } else {
            isAuthenticated = true;
            console.log("User terautentikasi. Memasang event listener...");
        }
    })();

    if (isAuthenticated) {
        const itemForm = document.getElementById('itemForm');
        const statusSelect = document.getElementById('status');
        const tanggalTerpakaiInput = document.getElementById('tanggal_terpakai');
        const tanggalMasukInput = document.getElementById('tanggal_masuk');

        function manageTanggalTerpakaiStatus() {
            if (statusSelect.value === 'tersedia') {
                tanggalTerpakaiInput.value = '';
                tanggalTerpakaiInput.disabled = true;
                tanggalTerpakaiInput.placeholder = 'Tidak berlaku untuk status tersedia';
            } else {
                tanggalTerpakaiInput.disabled = false;
                tanggalTerpakaiInput.placeholder = '';
            }
        }

        if (itemForm) {
            itemForm.addEventListener('submit', async function (e) {
                e.preventDefault();

                const formData = new FormData();
                const userId = localStorage.getItem("user_id");

                if (!userId) {
                    showToast('ID pengguna tidak ditemukan. Silakan login ulang.', 'danger');
                    setTimeout(() => { window.location.href = 'login.html'; }, 1500);
                    return;
                }

                formData.append("user_id", userId);
                formData.append("nama_barang", document.getElementById("nama_barang").value);
                formData.append("stok", document.getElementById("stok").value);
                formData.append("pemilik", document.getElementById("pemilik").value);
                formData.append("status", statusSelect.value);
                formData.append("lokasi", document.getElementById("lokasi").value);

                if (tanggalMasukInput && tanggalMasukInput.value) {
                    formData.append("tanggal_masuk", tanggalMasukInput.value);
                } else {
                    formData.append("tanggal_masuk", '');
                }

                if (statusSelect.value !== 'tersedia' && tanggalTerpakaiInput && tanggalTerpakaiInput.value) {
                    formData.append("tanggal_terpakai", tanggalTerpakaiInput.value);
                } else {
                    formData.append("tanggal_terpakai", '');
                }

                const files = document.getElementById("foto").files;
                for (const file of files) {
                    if (file.size > 2 * 1024 * 1024) {
                        showToast(`Ukuran foto '${file.name}' (${(file.size / (1024 * 1024)).toFixed(2)} MB) melebihi batas 2MB.`, 'warning');
                        return;
                    }
                    formData.append("foto[]", file);
                }

                const now = new Date().toISOString().slice(0, 19).replace("T", " ");
                formData.append("created_at", now);
                formData.append("updated_at", now);

                const submitButton = this.querySelector('button[type="submit"]');
                const originalButtonText = submitButton.innerHTML;
                submitButton.disabled = true;
                submitButton.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Menyimpan...`;

                try {
                    const response = await fetch(API_BASE_URL_INVENTORY, {
                        method: "POST",
                        body: formData,
                        headers: {
                            "Accept": "application/json",
                            "Authorization": `Bearer ${localStorage.getItem('access_token')}`
                        }
                    });

                    const contentType = response.headers.get("content-type");

                    if (contentType && contentType.includes("application/json")) {
                        const result = await response.json();
                        if (response.ok) {
                            showToast("Barang berhasil ditambahkan!", 'success');
                            setTimeout(() => { window.location.href = "inventory.html"; }, 1500);
                        } else {
                            let errorMessage = `Gagal menambahkan barang: ${result.message || 'Error tidak diketahui'}`;
                            if (result.errors) {
                                errorMessage += '<br>' + Object.values(result.errors).flat().join('<br>');
                            }
                            showToast(errorMessage, 'danger');
                            submitButton.disabled = false;
                            submitButton.innerHTML = originalButtonText;
                        }
                    } else {
                        const text = await response.text();
                        console.error("Server response bukan JSON:", response.status, response.statusText, text);
                        showToast("Gagal menambahkan barang. Respon server tidak valid.", 'danger');
                        submitButton.disabled = false;
                        submitButton.innerHTML = originalButtonText;
                    }
                } catch (error) {
                    console.error("Fetch error:", error);
                    showToast("Terjadi kesalahan koneksi saat menyimpan barang.", 'danger');
                    submitButton.disabled = false;
                    submitButton.innerHTML = originalButtonText;
                }
            });
        }

        if (statusSelect) {
            statusSelect.addEventListener('change', manageTanggalTerpakaiStatus);
            manageTanggalTerpakaiStatus();
        }

        if (tanggalMasukInput) {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            tanggalMasukInput.value = `${year}-${month}-${day}`;
        }

        const logoutLink = document.getElementById('logoutLink');
        if (logoutLink) {
            logoutLink.addEventListener('click', function (event) {
                event.preventDefault();
                localStorage.removeItem('user_id');
                localStorage.removeItem('user_name');
                localStorage.removeItem('access_token');

                showToast("Anda telah logout.", "info");

                setTimeout(() => { window.location.href = 'index.html'; }, 1000);
            });
        }
    }
});

window.toggleSidebar = toggleSidebar;
window.closeSidebar = closeSidebar;
window.goBack = goBack;
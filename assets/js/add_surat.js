// Ganti URL ini dengan endpoint API Anda yang sebenarnya untuk menambah surat
const API_BASE_URL_SURAT = 'http://127.0.0.1:8000/api/persuratan'; // Contoh: sesuaikan dengan route API Laravel Anda

function showToast(message, type = 'info') {
    let toastContainer = document.querySelector('.toast-container');

    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
        toastContainer.style.zIndex = '1100'; // Pastikan toast tampil di atas elemen lain
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

    // Pastikan Bootstrap Toast tersedia
    if (typeof bootstrap !== 'undefined' && bootstrap.Toast) {
        const toast = new bootstrap.Toast(toastEl, { delay: 5000 });
        try {
            toast.show();
        } catch (e) {
            console.error("Error showing Bootstrap toast:", e);
            alert(message); // Fallback jika toast gagal
        }
    } else {
        console.error("Bootstrap Toast component is not available.");
        alert(message); // Fallback jika Bootstrap tidak dimuat
    }

    toastEl.addEventListener('hidden.bs.toast', function () {
        toastEl.remove(); // Hapus elemen toast dari DOM setelah hilang
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

    // Fungsi IIFE untuk memeriksa otentikasi saat halaman dimuat
    (function checkAuthentication() {
        const token = localStorage.getItem('access_token');

        if (!token) {
            showToast('Sesi Anda tidak valid atau telah berakhir. Silakan login ulang.', 'danger');
            setTimeout(() => {
                window.location.href = 'login.html'; // Arahkan ke halaman login
            }, 2500);
            isAuthenticated = false;
        } else {
            isAuthenticated = true;
            console.log("User terautentikasi. Memasang event listener untuk form surat...");
        }
    })();

    if (isAuthenticated) {
        const suratForm = document.getElementById('suratForm');
        const tanggalSuratInputElement = document.getElementById('tanggal_masuk'); // Elemen HTML untuk tanggal surat

        if (suratForm) {
            suratForm.addEventListener('submit', async function (e) {
                e.preventDefault(); // Mencegah submit form standar

                const submitButton = this.querySelector('button[type="submit"]');
                const originalButtonText = submitButton.innerHTML;

                const formData = new FormData();
                const userId = localStorage.getItem("user_id");

                if (!userId) {
                    showToast('ID pengguna tidak ditemukan. Silakan login ulang.', 'danger');
                    setTimeout(() => { window.location.href = 'login.html'; }, 1500);
                    return; // Hentikan eksekusi jika user_id tidak ada
                }

                // Mengumpulkan data dari form, menyesuaikan nama field dengan backend Laravel
                formData.append("user_id", userId);
                formData.append("dari", document.getElementById("dari").value); // HTML id="pengirim" -> backend "dari"
                formData.append("kepada", document.getElementById("kepada").value);
                formData.append("jenis_surat", document.getElementById("jenis_surat").value);
                formData.append("status", document.getElementById("status").value); // Backend mengharapkan "status"
                formData.append("perihal", document.getElementById("perihal").value);

                if (tanggalSuratInputElement && tanggalSuratInputElement.value) {
                    formData.append("tanggal_masuk", tanggalSuratInputElement.value); // HTML id="tanggal_surat" -> backend "tanggal_masuk"
                } else {
                    formData.append("tanggal_masuk", ''); // Kirim string kosong jika tidak ada (backend harus handle ini jika required)
                }

                const fileInputElement = document.getElementById("file_lampiran"); // Elemen HTML untuk file
                console.log('Mencari elemen file input dengan ID "file_lampiran":', fileInputElement);

                if (!fileInputElement) {
                    showToast('Error Internal: Komponen input file (ID: file_lampiran) tidak ditemukan di halaman.', 'danger');
                    console.error("Kritis: Elemen dengan ID 'file_lampiran' tidak ditemukan di DOM.");
                    // Tombol belum diubah, jadi tidak perlu reset
                    return;
                }

                if (fileInputElement.files.length > 0) {
                    const file = fileInputElement.files[0];
                    // Validasi ukuran file (10MB, sesuai backend: 'max:10240' kilobytes)
                    if (file.size > 10 * 1024 * 1024) { // 10 MB
                        showToast(`Ukuran file '${file.name}' (${(file.size / (1024 * 1024)).toFixed(2)} MB) melebihi batas 10MB.`, 'warning');
                        return; // Hentikan jika file terlalu besar
                    }
                    // Backend mengharapkan 'file_lampiran' sebagai array (validasi 'file_lampiran.*')
                    formData.append("file_lampiran[]", file, file.name);
                } else {
                    // Jika input file memiliki atribut 'required' di HTML, browser akan mencegah submit.
                    // Jika 'required' tidak ada dan file opsional (nullable di backend), maka tidak mengirim file adalah OK.
                    // Jika 'required' ada dan kode sampai sini, berarti ada masalah dengan validasi browser.
                    // Untuk 'file_lampiran.*' => 'nullable', jika tidak ada file, tidak apa-apa tidak mengirim field ini.
                    // Namun, jika input di HTML 'required', maka kita harusnya tidak sampai sini.
                    // Jika sampai sini dan file_lampiran itu required di html, maka tampilkan error.
                    if (fileInputElement.hasAttribute('required')) {
                        showToast('File surat wajib diunggah. Silakan pilih file.', 'warning');
                        return;
                    }
                    // Jika tidak required dan tidak ada file, maka tidak perlu append apa-apa untuk file_lampiran.
                    console.log("Tidak ada file dipilih (dan input tidak 'required'), field file_lampiran tidak akan dikirim.");
                }

                // Timestamp created_at dan updated_at akan dihandle oleh Laravel (Eloquent Timestamps)
                // Jadi, tidak perlu dikirim dari frontend.

                // Ubah tombol menjadi loading state sebelum request API
                submitButton.disabled = true;
                submitButton.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Menyimpan...`;

                try {
                    const response = await fetch(API_BASE_URL_SURAT, {
                        method: "POST",
                        body: formData,
                        headers: {
                            "Accept": "application/json", // Backend Laravel biasanya merespon JSON
                            "Authorization": `Bearer ${localStorage.getItem('access_token')}`
                            // 'Content-Type': 'multipart/form-data' tidak perlu di-set manual untuk FormData,
                            // browser akan menanganinya secara otomatis beserta boundary.
                        }
                    });

                    const contentType = response.headers.get("content-type");

                    if (contentType && contentType.includes("application/json")) {
                        const result = await response.json();
                        if (response.ok) { // Status 200-299 (termasuk 201 Created dari backend Anda)
                            showToast(result.message || "Surat berhasil ditambahkan!", 'success');
                            setTimeout(() => { window.location.href = "persuratan.html"; }, 1500);
                            // Tombol tidak perlu di-reset jika halaman akan redirect
                        } else {
                            // Error dari server (misalnya validasi gagal)
                            let errorMessage = `Gagal menambahkan surat (Status: ${response.status}): ${result.message || 'Error tidak diketahui dari server.'}`;
                            if (result.errors) { // Jika backend mengirim detail error validasi
                                const errorMessages = Object.values(result.errors).flat().join('<br>');
                                errorMessage += `<br><small style="font-size: 0.8em;">${errorMessages}</small>`;
                            }
                            showToast(errorMessage, 'danger');
                            submitButton.disabled = false;
                            submitButton.innerHTML = originalButtonText;
                        }
                    } else {
                        // Jika respon bukan JSON (misalnya halaman error HTML dari server)
                        const text = await response.text();
                        console.error("Server response bukan JSON:", response.status, response.statusText, text);
                        showToast(`Gagal menambahkan surat. Respon server tidak valid (Status: ${response.status}). Coba periksa log server. Preview: ${text.substring(0,100)}...`, 'danger');
                        submitButton.disabled = false;
                        submitButton.innerHTML = originalButtonText;
                    }
                } catch (error) {
                    // Error jaringan atau JavaScript lainnya
                    console.error("Fetch error atau JavaScript error:", error);
                    showToast("Terjadi kesalahan koneksi atau internal saat menyimpan surat. Silakan coba lagi.", 'danger');
                    submitButton.disabled = false;
                    submitButton.innerHTML = originalButtonText;
                }
            });
        }

        // Set tanggal surat default ke hari ini
        if (tanggalSuratInputElement) {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0'); // Bulan dimulai dari 0 (Januari=0)
            const day = String(now.getDate()).padStart(2, '0');
            tanggalSuratInputElement.value = `${year}-${month}-${day}`;
        }

        // Event listener untuk logout
        const logoutLink = document.getElementById('logoutLink');
        if (logoutLink) {
            logoutLink.addEventListener('click', function (event) {
                event.preventDefault();
                // Hapus data sesi dari localStorage
                localStorage.removeItem('user_id');
                localStorage.removeItem('user_name'); // Jika ada
                localStorage.removeItem('access_token');

                showToast("Anda telah logout.", "info");

                // Redirect ke halaman login atau halaman utama setelah logout
                setTimeout(() => { window.location.href = 'login.html'; }, 1000);
            });
        }
    } // Akhir dari if (isAuthenticated)
}); // Akhir dari DOMContentLoaded

// Membuat fungsi global agar bisa dipanggil dari HTML (misalnya onclick="toggleSidebar()")
window.toggleSidebar = toggleSidebar;
window.closeSidebar = closeSidebar;
window.goBack = goBack;
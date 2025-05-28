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
           alert(message); // Fallback ke alert jika show() gagal
      }
    } else {
        console.error("Bootstrap Toast component is not available.");
        alert(message); // Fallback ke alert jika bootstrap tidak ada
    }

    toastEl.addEventListener('hidden.bs.toast', function () {
        toastEl.remove();
    });
    }

    function toggleSidebar() {
    document.body.classList.toggle("sidebar-open");
    const sidebar = document.querySelector(".sidebar");
    if(sidebar) sidebar.classList.toggle("active");
    }

    function closeSidebar() {
    document.body.classList.remove("sidebar-open");
    const sidebar = document.querySelector(".sidebar");
    if(sidebar) sidebar.classList.remove("active");
    }

    function goBack() {
    window.history.back();
    }

document.addEventListener('DOMContentLoaded', function() {

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

      const logForm = document.getElementById('logForm');
      if (logForm) {
          logForm.addEventListener('submit', async function (e) {
               e.preventDefault();

              const formData = new FormData();
              const userId = localStorage.getItem("user_id");

              formData.append("user_id", userId);
              formData.append("jenis", document.getElementById("jenis").value);
              formData.append("keterangan", document.getElementById("keterangan").value);
              formData.append("lokasi", document.getElementById("lokasi").value);
              formData.append("lokasi_kerja", document.getElementById("lokasi_kerja").value);
              formData.append("status", document.getElementById("status").value);
              formData.append("pic", document.getElementById("pic").value);
              formData.append("waktu_kejadian", document.getElementById("waktu_kejadian").value);

              const files = document.getElementById("eviden").files;
              const fileNames = [];
              for (const file of files) {
                  formData.append("eviden[]", file);
                  fileNames.push(`eviden/${file.name}`);
              }
               if (fileNames.length > 0) {
                 formData.append("nama_eviden", JSON.stringify(fileNames));
               }

              const now = new Date().toISOString().slice(0, 19).replace("T", " ");
              formData.append("created_at", now);
              formData.append("updated_at", now);

              const submitButton = this.querySelector('button[type="submit"]');
              const originalButtonText = submitButton.innerHTML;
              submitButton.disabled = true;
              submitButton.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Menyimpan...`;

              try {
                  const response = await fetch("http://127.0.0.1:8000/api/logaktivitas", {
                      method: "POST",
                      body: formData,
                      headers: { "Accept": "application/json" }
                  });

                  const contentType = response.headers.get("content-type");

                  if (contentType && contentType.includes("application/json")) {
                      const result = await response.json();
                      if (response.ok) {
                          showToast("Data berhasil ditambahkan!", 'success');
                          setTimeout(() => { window.location.href = "log_aktivitas.html"; }, 1500);
                      } else {
                          showToast(`Gagal menambahkan data: ${result.message || 'Error tidak diketahui'}`, 'danger');
                          submitButton.disabled = false;
                          submitButton.innerHTML = originalButtonText;
                      }
                  } else {
                      const text = await response.text();
                      console.error("Server response bukan JSON:", response.status, response.statusText, text);
                      showToast("Gagal menambahkan data. Respon server tidak valid.", 'danger');
                      submitButton.disabled = false;
                      submitButton.innerHTML = originalButtonText;
                  }
              } catch (error) {
                  console.error("Fetch error:", error);
                  showToast("Terjadi kesalahan koneksi saat menyimpan data.", 'danger');
                  submitButton.disabled = false;
                  submitButton.innerHTML = originalButtonText;
              }
          });
      }

      const logoutLink = document.getElementById('logoutLink');
      if (logoutLink) {
          logoutLink.addEventListener('click', function(event) {
               event.preventDefault();
                  localStorage.removeItem('user_id');
                  localStorage.removeItem('user_name');
                  localStorage.removeItem('access_token');
                  localStorage.removeItem('filter_jenis');

                  showToast("Anda telah logout.", "info");

                  setTimeout(() => { window.location.href = 'login.html'; }, 1000);
          });
      }
    }
});
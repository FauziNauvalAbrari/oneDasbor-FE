
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
        <div class="toast-body"><i class="${iconClass} me-2"></i> ${message}</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
    `;
    toastContainer.appendChild(toastEl);
  
    if (typeof bootstrap !== 'undefined' && bootstrap.Toast) {
      const toast = new bootstrap.Toast(toastEl, { delay: 4000 });
      try { toast.show(); } catch (e) { console.error("Gagal menampilkan Bootstrap toast:", e); alert(message); }
    } else {
      console.error("Komponen Bootstrap Toast tidak tersedia.");
      alert(message);
    }
    toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
  }
  
  function formatDateTimeForInput(isoString) {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      const offset = date.getTimezoneOffset();
      const localDate = new Date(date.getTime() - (offset * 60 * 1000));
      return localDate.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
    } catch (e) {
      console.error("Error formatting date for input:", isoString, e);
      try { // Fallback format manual
           const date = new Date(isoString);
           const pad = (n) => n.toString().padStart(2, '0');
           return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
      } catch (e2) { return ''; }
    }
  }
  
  function goBack() {
    window.history.back();
  }
  
  function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const main = document.querySelector('.main');
    if (sidebar && main) {
      sidebar.classList.toggle('active');
      main.classList.toggle('active');
    }
  }
  
  function closeSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const main = document.querySelector('.main');
    if (sidebar && main) {
      sidebar.classList.remove('active');
      main.classList.remove('active');
    }
  }
  
  function fetchAndPopulateForm(id, token, form) {
    console.log(`Mengambil data log ID: ${id}`);
    const apiUrl = `http://127.0.0.1:8000/api/logaktivitas/${id}`;
    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton) submitButton.disabled = true;
  
    fetch(apiUrl, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
    })
    .then(response => {
      if (response.status === 401) {
        showToast('Sesi tidak valid. Silakan login ulang.', 'danger');
        localStorage.removeItem('access_token');
        setTimeout(() => { window.location.href = 'login.html'; }, 2500);
        throw new Error('Unauthorized');
      }
      if (response.status === 404) throw new Error(`Data log ID ${id} tidak ditemukan.`);
      if (!response.ok) {
           return response.json().catch(() => ({})).then(errorBody => {
               throw new Error(errorBody.message || `Gagal memuat data (Status: ${response.status})`);
           });
      }
      return response.json();
    })
    .then(data => {
      console.log("Data diterima:", data);
  
      const setInputValue = (elementId, value) => {
        const el = form.querySelector(`#${elementId}`);
        if (el) { el.value = value ?? ''; }
        else { console.warn(`Elemen #${elementId} tidak ditemukan.`); }
      };
  
      setInputValue("logId", data.id);
      setInputValue("jenis", data.jenis ? data.jenis.toLowerCase().trim() : "");
      setInputValue("status", data.status);
      setInputValue("lokasi_kerja", data.lokasi_kerja);
      setInputValue("lokasi", data.lokasi);
      setInputValue("waktu_kejadian", formatDateTimeForInput(data.waktu_kejadian)); // Format diperbaiki
      setInputValue("pic", data.pic);
      setInputValue("keterangan", data.keterangan);
  
      // Simpan evidens lama (sebagai string JSON) di hidden input
      const currentEvidenceDataInput = form.querySelector('#current_eviden_data');
      let evidenceToStore = '[]';
       if (data.eviden) {
            if (typeof data.eviden === 'string') {
                 try { JSON.parse(data.eviden); evidenceToStore = data.eviden; }
                 catch(e) { evidenceToStore = JSON.stringify([data.eviden]); } // Anggap path tunggal jika string non-json
            } else if (Array.isArray(data.eviden)) {
                 evidenceToStore = JSON.stringify(data.eviden);
            }
       }
      if (currentEvidenceDataInput) { currentEvidenceDataInput.value = evidenceToStore; }
      else { console.warn("Hidden input #current_eviden_data tidak ditemukan."); }
  
      // Tampilkan preview evidens lama
      const currentEvidenceContainer = document.getElementById("currentEvidence");
      if (currentEvidenceContainer) {
        currentEvidenceContainer.innerHTML = '';
        try {
          const evidenList = JSON.parse(evidenceToStore);
          if (Array.isArray(evidenList) && evidenList.length > 0) {
            evidenList.forEach(src => {
              if (typeof src === 'string' && src.trim()) {
                  let imagePath = src.replace(/\\/g, '/').replace(/^eviden\/?/i, '');
                  const imageUrl = `http://127.0.0.1:8000/storage/eviden/${imagePath}`;
                  const imgLink = document.createElement('a');
                  imgLink.href = imageUrl; imgLink.target = '_blank';
                  imgLink.className = 'd-inline-block me-2 mb-2 border rounded p-1';
                  const img = document.createElement('img');
                  img.src = imageUrl; img.className = "img-fluid";
                  img.style.cssText = 'max-width: 100px; max-height: 80px;';
                  img.alt = imagePath.split('/').pop();
                  img.onerror = () => { imgLink.style.display = 'none'; console.warn(`Gagal load image: ${imageUrl}`); };
                  imgLink.appendChild(img);
                  currentEvidenceContainer.appendChild(imgLink);
              }
            });
          } else {
            currentEvidenceContainer.innerHTML = '<p class="text-muted fst-italic">Tidak ada evidensi.</p>';
          }
        } catch (e) {
          console.error("Error proses preview evidens:", e);
          currentEvidenceContainer.innerHTML = '<p class="text-danger"><em>Gagal memuat preview.</em></p>';
        }
      }
  
      if (submitButton) submitButton.disabled = false;
    })
    .catch(error => {
      console.error("Error fetch/populate:", error);
      if (error.message !== 'Unauthorized') {
        showToast(error.message || "Gagal memuat data.", 'danger');
        if (form) form.innerHTML = `<div class="alert alert-danger p-4">${error.message || "Gagal memuat data."}</div>`;
      }
      if (submitButton) submitButton.disabled = true;
    });
  }
  
  function handleUpdateSubmit(id, token, form) {
    console.log(`Menyimpan log ID: ${id}`);
    const submitButton = form.querySelector('button[type="submit"]');
    const originalButtonText = submitButton ? submitButton.innerHTML : 'Simpan';
    if (submitButton) {
        submitButton.disabled = true;
        submitButton.innerHTML = `<span class="spinner-border spinner-border-sm" aria-hidden="true"></span> Menyimpan...`;
    }

    const formData = new FormData();
    formData.append('_method', 'PUT');

    // Append field lain seperti sebelumnya
    const fieldsToAppend = ["logId", "jenis", "keterangan", "lokasi_kerja", "lokasi", "status", "pic"];
    fieldsToAppend.forEach(fieldId => {
        const element = form.querySelector(`#${fieldId}`);
        if (element) {
            formData.append(fieldId, element.value);
        } else if (fieldId === 'logId') {
            formData.append(fieldId, id); // Fallback
        }
    });

    // --- PERBAIKAN FORMAT WAKTU KEJADIAN ---
    const waktuKejadianInput = form.querySelector('#waktu_kejadian');
    if (waktuKejadianInput && waktuKejadianInput.value) {
        // Ambil nilai dari input (misal: "2025-05-06T11:30")
        const rawValue = waktuKejadianInput.value;
        // Ubah format ke "YYYY-MM-DD HH:MM:SS"
        const formattedValue = rawValue.replace('T', ' ') + ':00'; // Ganti T dengan spasi, tambah detik :00

        formData.append("waktu_kejadian", formattedValue); // Kirim format yang sudah benar
        console.log("Mengirim waktu_kejadian (formatted):", formattedValue);
    } else {
        console.warn("Input #waktu_kejadian tidak ditemukan atau kosong.");
        // Kirim string kosong jika backend mengizinkan null/kosong
        // formData.append("waktu_kejadian", "");
    }
    // --- AKHIR PERBAIKAN ---

    // Handle evidens (logika Anda sebelumnya)
    const fileInput = form.querySelector('#eviden');
    const files = fileInput ? fileInput.files : null;
    const fileNames = [];

    if (files && files.length > 0) {
        console.log(`File baru terdeteksi: ${files.length}`);
        for (const file of files) {
            formData.append("eviden[]", file);
            fileNames.push(`eviden/${file.name}`);
        }
        formData.append("nama_eviden", JSON.stringify(fileNames));
    } else {
        console.log("Tidak ada file baru. Mengirim info evidens lama.");
        const currentEvidenceDataInput = form.querySelector('#current_eviden_data');
        if (currentEvidenceDataInput && currentEvidenceDataInput.value && currentEvidenceDataInput.value !== '[]') {
            formData.append("current_eviden", currentEvidenceDataInput.value);
        }
    }

    const apiUrl = `http://127.0.0.1:8000/api/logaktivitas/${id}`;

    // Fetch API (sama seperti sebelumnya)
    fetch(apiUrl, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json', },
        body: formData
    })
    .then(async response => { /* ... .then response ... */
         if (response.ok) return response.json();
         // Handle error (sama seperti sebelumnya)
         const errorData = await response.json().catch(() => ({ message: "Respons error tidak valid." }));
         let errorMessage = errorData.message || `Gagal menyimpan (Status: ${response.status}).`;
         if (response.status === 422 && errorData.errors) {
             errorMessage = "Kesalahan input:";
             // --- Perbaiki cara menampilkan error validasi ---
             Object.keys(errorData.errors).forEach(field => {
                 errorMessage += `\n- ${field}: ${errorData.errors[field].join(', ')}`;
             });
             // --- Akhir perbaikan error validasi ---
         }
         const error = new Error(errorMessage);
         error.status = response.status;
         error.data = errorData;
         throw error;
    })
    .then(data => { /* ... .then success ... */
        console.log("Update sukses:", data);
        showToast(data.message || "Data berhasil diperbarui.", 'success');
        setTimeout(() => { window.location.href = `log_aktivitas.html`; }, 1500);
    })
    .catch(error => { /* ... .catch ... */
        console.error("Error saat update:", error);
        // Tampilkan pesan error yang sudah diformat dari blok .then sebelumnya
        showToast(error.message || "Gagal menyimpan data.", 'danger');
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;
        }
    });
}
  // --- Inisialisasi Halaman ---
  
  document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      showToast('Anda harus login.', 'danger');
      setTimeout(() => { window.location.href = 'login.html'; }, 2500);
      return;
    }
  
    const form = document.getElementById('logUpdateForm');
    const logoutLink = document.getElementById('logoutLink');
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get("id");
  
    if (!form) {
      console.error("Form #logUpdateForm tidak ditemukan!");
      document.body.innerHTML = '<div class="alert alert-danger m-5">Error: Form update tidak ditemukan.</div>';
      return;
    }
  
    // Dinamis tambahkan hidden input jika tidak ada di HTML
    if (!form.querySelector('#current_eviden_data')) {
      const hiddenInput = document.createElement('input');
      hiddenInput.type = 'hidden';
      hiddenInput.id = 'current_eviden_data';
      form.appendChild(hiddenInput);
    }
  
  
    if (!id) {
      showToast("ID log tidak ditemukan di URL.", "warning");
      form.innerHTML = '<div class="alert alert-warning p-4">ID log aktivitas tidak valid.</div>';
      return;
    }
  
    // Panggil fetch data awal
    fetchAndPopulateForm(id, token, form);
  
    // Tambahkan listener submit
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      handleUpdateSubmit(id, token, form);
    });
  
    // Tambahkan listener logout
    if (logoutLink) {
      logoutLink.addEventListener('click', (event) => {
        event.preventDefault();
        localStorage.clear(); // Cara simpel hapus semua
        showToast('Logout berhasil.', 'success');
        setTimeout(() => { window.location.href = 'login.html'; }, 1000);
      });
    }
  });
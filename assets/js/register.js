import { registerUser } from './api.js';

const form = document.getElementById('registrationForm');
const errorMessageElement = document.getElementById('errorMessage');

if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (errorMessageElement) {
        errorMessageElement.style.display = 'none';
        errorMessageElement.textContent = '';
    } else {
        console.warn("Elemen errorMessage tidak ditemukan. Tidak dapat menampilkan pesan error UI.");
    }

    const emailInput = document.getElementById('email');
    const namaLengkapInput = document.getElementById('nama_lengkap');
    const passwordInput = document.getElementById('password');
    const passwordConfirmationInput = document.getElementById('password_confirmation');

    if (!emailInput || !namaLengkapInput || !passwordInput || !passwordConfirmationInput) {
        const msg = 'Kesalahan konfigurasi form: Satu atau lebih field input tidak ditemukan. Periksa ID HTML.';
        if (errorMessageElement) {
            errorMessageElement.textContent = msg;
            errorMessageElement.style.display = 'block';
        } else {
            alert(msg);
        }
        return;
    }

    const email = emailInput.value;
    const nama_lengkap = namaLengkapInput.value;
    const password = passwordInput.value;
    const password_confirmation = passwordConfirmationInput.value;

    if (!email.trim() || !nama_lengkap.trim() || !password.trim() || !password_confirmation.trim()) {
        if (errorMessageElement) {
            errorMessageElement.textContent = 'Semua field wajib diisi.';
            errorMessageElement.style.display = 'block';
        } else {
            alert('Semua field wajib diisi.');
        }
        return;
    }

    if (password !== password_confirmation) {
        if (errorMessageElement) {
            errorMessageElement.textContent = 'Password dan konfirmasi password tidak cocok.';
            errorMessageElement.style.display = 'block';
        } else {
            alert('Password dan konfirmasi password tidak cocok.');
        }
        return;
    }
    const userData = {
      email: email,
      name: nama_lengkap,
      password: password,
      password_confirmation: password_confirmation,
    };

    const submitButton = form.querySelector('button[type="submit"]');
    let originalButtonText;
    if (submitButton) {
      originalButtonText = submitButton.innerHTML;
      submitButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Mendaftar...';
      submitButton.disabled = true;
    }

    try {
      const data = await registerUser(userData);

      alert(data?.message || 'Registrasi berhasil! Anda akan diarahkan ke halaman login.');
      window.location.href = 'login.html';

    } catch (error) {
      if (errorMessageElement) {
        errorMessageElement.style.display = 'block';
        errorMessageElement.textContent = error.message || 'Registrasi gagal. Silakan coba lagi.';
      } else {
        alert(error.message || 'Registrasi gagal. Silakan coba lagi.');
      }
    } finally {
      if (submitButton && originalButtonText !== undefined) {
        submitButton.innerHTML = originalButtonText;
        submitButton.disabled = false;
      }
    }
  });
} else {
  console.warn('Formulir registrasi dengan ID "registrationForm" tidak ditemukan.');
}
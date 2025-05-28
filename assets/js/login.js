const form = document.getElementById('loginForm');
const errorMessage = document.getElementById('errorMessage');
const RECAPTCHA_SITE_KEY = '-';
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorMessage.style.display = 'none'; 
  
  grecaptcha.ready(function() {
    grecaptcha.execute(RECAPTCHA_SITE_KEY, {action: 'login'})
    .then(async function(token) {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
          const response = await fetch('http://127.0.0.1:8000/api/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify({
                email,
                password,
                'g-recaptcha-response': token
            }),
          });

          const data = await response.json();

          if (!response.ok) {
            errorMessage.style.display = 'block';
            errorMessage.textContent = data.message || `Login gagal (Status: ${response.status})`;
            return;
          }

          localStorage.setItem('access_token', data.access_token);
          localStorage.setItem('user_name', data.name);
          localStorage.setItem('user_id', data.id);

          window.location.href = 'dashboard.html';
        } catch (error) {
          console.error('Fetch error:', error);
          errorMessage.style.display = 'block';
          errorMessage.textContent = 'Terjadi kesalahan jaringan. Coba lagi.';
        } finally {
        }
    }).catch(function (error) {
        console.error('reCAPTCHA error:', error);
        errorMessage.style.display = 'block';
        errorMessage.textContent = 'Gagal mendapatkan token reCAPTCHA. Silakan coba lagi.';
    });
  });
});
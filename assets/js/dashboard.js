  let myChart;

  const logoutLink = document.getElementById('logoutLink');

  if (logoutLink) {
      logoutLink.addEventListener('click', async function(event) {
          event.preventDefault();

          this.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Signing Out...';
          this.style.pointerEvents = 'none'; // Nonaktifkan klik berulang
  
          const token = localStorage.getItem('access_token');
  
          try {
              if (token) {
                  console.log("Mencoba logout dari server...");
                  const response = await fetch('http://127.0.0.1:8000/api/logout', {
                      method: 'POST',
                      headers: {
                          'Accept': 'application/json',
                          'Authorization': `Bearer ${token}`
                      }
                  });
  
                  if (response.ok) {
                      console.log('Logout dari server berhasil.');
                  } else {
                      console.warn(`Logout server gagal: ${response.status} ${response.statusText}`);
                       try {
                           const errorData = await response.json();
                           console.warn('Detail error server:', errorData);
                       } catch (e) {
                       }
                  }
              } else {
                  console.warn('Token tidak ditemukan, logout lokal saja.');
              }
  
          } catch (error) {
              console.error('Error saat menghubungi API logout:', error);
          } finally {
              console.log("Melakukan pembersihan sisi klien...");
              localStorage.removeItem('user_id');
              localStorage.removeItem('user_name');
              localStorage.removeItem('access_token');
              localStorage.removeItem('filter_jenis');
              localStorage.removeItem('filter_wilayah');
  
              console.log("Mengarahkan ke halaman login...");
              window.location.href = 'login.html';
          }
      });
  }

    async function loadDashboardData() {
      try {
        const token = localStorage.getItem('access_token');
        const userName = localStorage.getItem('user_name');
        if (!token) {
          window.location.href = 'login.html';
          return;
        }

        const response = await fetch('http://127.0.0.1:8000/api/dashboard', {
          headers: {
            'Authorization': 'Bearer ' + token,
            'Accept': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Gagal memuat data dashboard');
        }

        const data = await response.json();

        // Update isi dashboard dari data API
        document.getElementById('totalInsiden').textContent = data.total_insidentil ?? 0;
        document.getElementById('totalRutin').textContent = data.total_rutin ?? 0;
        document.getElementById('totalFollowup').textContent = data.total_followup ?? 0;
        document.getElementById('totalLogHariIni').textContent = data.total_log_hari_ini ?? 0;

        // Setelah dashboard update, buat grafiknya
        renderChart(data);

      } catch (error) {
        console.error('Error saat load dashboard:', error);
        alert('Gagal load data dashboard. Silakan login lagi.');
        window.location.href = 'login.html';
      }
    }

    function renderChart(data) {
      const ctx = document.getElementById('dashboardChart').getContext('2d');

      if (myChart) {
        myChart.destroy(); // Hapus chart lama sebelum buat baru
      }

      myChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['Insiden', 'Rutin', 'Follow-Up'],
          datasets: [{
            label: 'Jumlah Aktivitas',
            data: [
              data.total_insidentil ?? 0,
              data.total_rutin ?? 0,
              data.total_followup ?? 0
            ],
            backgroundColor: [
              '#6ce5e8',
              '#41b8d5',
              '#2d8bba'
            ],
            borderWidth: 1,
            borderRadius: 10,
          }]
        },
        options: {
          responsive: true,
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                stepSize: 1,
                precision: 0,
              }
            }
          }
        }
      });
    }

    function renderCalendar() {
      const calendarEl = document.getElementById('calendar');
      const monthNameEl = document.getElementById('monthName');

      if (!calendarEl || !monthNameEl) {
        console.error('Element calendar atau monthName tidak ditemukan');
        return;
      }
    
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
    
      const monthNames = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];
    
      monthNameEl.textContent = `${monthNames[month]}`;
    
      calendarEl.innerHTML = '';
    
      const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thur', 'Fri', 'Sat'];
      daysOfWeek.forEach(day => {
        const dayNameEl = document.createElement('div');
        dayNameEl.textContent = day;
        dayNameEl.classList.add('day-name');
        calendarEl.appendChild(dayNameEl);
      });
    
      const today = now.getDate();
      const firstDay = new Date(year, month, 1).getDay();
      const totalDays = new Date(year, month + 1, 0).getDate();
    
      for (let i = 0; i < firstDay; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.classList.add('date-cell', 'empty');
        calendarEl.appendChild(emptyCell);
      }
    
      for (let day = 1; day <= totalDays; day++) {
        const dateCell = document.createElement('div');
        dateCell.textContent = day;
        dateCell.classList.add('date-cell');
        if (day === today) {
          dateCell.classList.add('today');
        }
        calendarEl.appendChild(dateCell);
      }
    }
    
    function updateUserName() {
      const userName = localStorage.getItem('user_name');
      document.getElementById('userName').textContent = userName || 'User'; 
    }

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

    window.onload = () => {
      updateUserName();
      loadDashboardData();
      renderCalendar();
    };

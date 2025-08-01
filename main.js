// Import fungsi-fungsi yang diperlukan dari Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, onSnapshot, updateDoc, deleteField } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    // --- KONFIGURASI FIREBASE ---
    const firebaseConfig = {
        apiKey: "AIzaSyBcClx0H_0RKig3fnA8GxQ4hIdiChTArzg",
        authDomain: "reportvoucherreseller.firebaseapp.com",
        projectId: "reportvoucherreseller",
        storageBucket: "reportvoucherreseller.firebasestorage.app",
        messagingSenderId: "868058615913",
        appId: "1:868058615913:web:6f9083e03524d9299d52f8"
    };

    // Inisialisasi Firebase
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    const salesDocRef = doc(db, "salesData", "main");

    // --- DATA DAN KONFIGURASI APLIKASI ---
    const adminCredentials = { email: 'edwin@dev.com', password: 'Edwin1895@' };
    const VOUCHER_LIST = {
        '6 Jam': 2000,
        '12 Jam': 3000,
        '1 Hari': 5000,
        '3 Hari': 10000,
        '30 Hari': 50000
    };
    let salesData = { weekly: {}, monthly: {} };
    let currentUser = null;
    let currentRole = null; // 'admin', 'reseller', atau 'visitor'
    let editingContext = { reseller: null, type: null };
    let weeklyChartInstance = null; // Variabel untuk menyimpan instance grafik

    // --- ELEMEN DOM ---
    const initialLoading = document.getElementById('initial-loading');
    const loginPage = document.getElementById('login-page');
    const dashboardPage = document.getElementById('dashboard-page');
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const togglePasswordVisibilityButton = document.getElementById('toggle-password-visibility');
    const eyeIcon = document.getElementById('eye-icon');
    const eyeSlashIcon = document.getElementById('eye-slash-icon');
    const visitorLoginBtn = document.getElementById('visitor-login-btn');
    const welcomeHeading = document.getElementById('welcome-heading');
    const welcomeSubheading = document.getElementById('welcome-subheading');
    const logoutButton = document.getElementById('logout-button');
    const weeklySalesBody = document.getElementById('weekly-sales-body');
    const weeklySalesFoot = document.getElementById('weekly-sales-foot');
    const monthlySalesBody = document.getElementById('monthly-sales-body');
    const monthlySalesFoot = document.getElementById('monthly-sales-foot');
    const actionHeaderWeekly = document.getElementById('action-header-weekly');
    const actionHeaderMonthly = document.getElementById('action-header-monthly');
    const editModal = document.getElementById('edit-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalSubtitle = document.getElementById('modal-subtitle');
    const editForm = document.getElementById('edit-form');
    const editStartDateInput = document.getElementById('edit-start-date');
    const editEndDateInput = document.getElementById('edit-end-date');
    const editFeePercentageInput = document.getElementById('edit-fee-percentage');
    const voucherInputsContainer = document.getElementById('voucher-inputs-container');
    const cancelEditButton = document.getElementById('cancel-edit');
    const resellerManagementSection = document.getElementById('reseller-management-section');
    const addResellerForm = document.getElementById('add-reseller-form');
    const newResellerNameInput = document.getElementById('new-reseller-name');
    const resellerList = document.getElementById('reseller-list');
    const weeklySalesChartCanvas = document.getElementById('weekly-sales-chart');
    const downloadWeeklyCsvButton = document.getElementById('download-weekly-csv');
    const downloadMonthlyCsvButton = document.getElementById('download-monthly-csv');

    /**
     * Memeriksa dan memulihkan sesi dari sessionStorage.
     */
    function checkSession() {
        const storedUser = sessionStorage.getItem('currentUser');
        const storedRole = sessionStorage.getItem('currentRole');
        if (storedUser && storedRole) {
            currentUser = storedUser;
            currentRole = storedRole;
        }
    }

    // --- FUNGSI-FUNGSI UTAMA ---

    /**
     * Merender tabel penjualan berdasarkan data saat ini.
     */
    function renderTables() {
        if (!salesData || !salesData.weekly || !salesData.monthly) return; 

        weeklySalesBody.innerHTML = '';
        monthlySalesBody.innerHTML = '';
        weeklySalesFoot.innerHTML = '';
        monthlySalesFoot.innerHTML = '';
        
        const showActions = (currentRole === 'admin');
        actionHeaderWeekly.style.display = showActions ? '' : 'none';
        actionHeaderMonthly.style.display = showActions ? '' : 'none';

        const calculateTotalSales = (vouchersSold) => {
            let total = 0;
            for (const voucherName in vouchersSold) {
                const quantity = vouchersSold[voucherName] || 0;
                const price = VOUCHER_LIST[voucherName] || 0;
                total += quantity * price;
            }
            return total;
        };

        const renderRow = (resellerName, data, type) => {
            const { startDate, endDate, feePercentage, vouchersSold } = data;
            const totalSales = calculateTotalSales(vouchersSold);
            const adminFee = totalSales * (feePercentage / 100);
            const resellerFee = totalSales - adminFee;
            return `<tr class="border-b border-gray-100 hover:bg-gray-50"><td class="py-4 px-4 font-medium">${resellerName}</td><td class="py-4 px-4 text-sm text-gray-600">${startDate}</td><td class="py-4 px-4 text-sm text-gray-600">${endDate}</td><td class="py-4 px-4 text-right font-medium">${totalSales.toLocaleString('id-ID')}</td><td class="py-4 px-4 text-right text-sm text-gray-600">${feePercentage.toFixed(1)}%</td><td class="py-4 px-4 text-right text-sm text-red-600 font-semibold">${adminFee.toLocaleString('id-ID', { minimumFractionDigits: 2 })}</td><td class="py-4 px-4 text-right text-sm text-green-600 font-semibold">${resellerFee.toLocaleString('id-ID', { minimumFractionDigits: 2 })}</td>${showActions ? `<td class="py-4 px-4 text-center"><button class="edit-btn bg-blue-100 text-blue-700 text-xs font-bold py-1 px-3 rounded-full hover:bg-blue-200" data-reseller="${resellerName}" data-type="${type}">Edit</button></td>` : '<td class="py-4 px-4"></td>'}</tr>`;
        };

        const allResellers = salesData.weekly ? Object.keys(salesData.weekly).sort((a, b) => a.localeCompare(b)) : [];
        const displayNames = (currentRole === 'admin' || currentRole === 'visitor' || currentRole === 'reseller') ? allResellers : [currentUser];
        
        let weeklyTotalSales = 0, weeklyTotalAdminFee = 0, weeklyTotalResellerFee = 0;
        let monthlyTotalSales = 0, monthlyTotalAdminFee = 0, monthlyTotalResellerFee = 0;
        
        displayNames.forEach(name => {
            if (salesData.weekly[name]) {
                weeklySalesBody.innerHTML += renderRow(name, salesData.weekly[name], 'weekly');
                const totalSales = calculateTotalSales(salesData.weekly[name].vouchersSold);
                const adminFee = totalSales * (salesData.weekly[name].feePercentage / 100);
                weeklyTotalSales += totalSales;
                weeklyTotalAdminFee += adminFee;
                weeklyTotalResellerFee += (totalSales - adminFee);
            }
            if (salesData.monthly[name]) {
                monthlySalesBody.innerHTML += renderRow(name, salesData.monthly[name], 'monthly');
                const totalSales = calculateTotalSales(salesData.monthly[name].vouchersSold);
                const adminFee = totalSales * (salesData.monthly[name].feePercentage / 100);
                monthlyTotalSales += totalSales;
                monthlyTotalAdminFee += adminFee;
                monthlyTotalResellerFee += (totalSales - adminFee);
            }
        });

        const renderFooterRow = (totalSales, totalAdminFee, totalResellerFee) => {
            const actionCols = showActions ? '<td></td>' : '<td></td>';
            return `<tr class="border-t-2 border-gray-300 bg-gray-50 font-bold"><td class="py-3 px-4" colspan="3">TOTAL</td><td class="py-3 px-4 text-right">${totalSales.toLocaleString('id-ID')}</td><td class="py-3 px-4"></td><td class="py-3 px-4 text-right text-red-700">${totalAdminFee.toLocaleString('id-ID', { minimumFractionDigits: 2 })}</td><td class="py-3 px-4 text-right text-green-700">${totalResellerFee.toLocaleString('id-ID', { minimumFractionDigits: 2 })}</td>${actionCols}</tr>`;
        };

        if (displayNames.length > 0) {
            weeklySalesFoot.innerHTML = renderFooterRow(weeklyTotalSales, weeklyTotalAdminFee, weeklyTotalResellerFee);
            monthlySalesFoot.innerHTML = renderFooterRow(monthlyTotalSales, monthlyTotalAdminFee, monthlyTotalResellerFee);
        }
    }

    /**
     * Menginisialisasi data di Firestore jika belum ada.
     */
    async function initializeDataInFirestore() {
        const formatDate = (date) => date.toISOString().split('T')[0];

        const today = new Date();
        const firstDayOfMonth = formatDate(new Date(today.getFullYear(), today.getMonth(), 1));
        const lastDayOfMonth = formatDate(new Date(today.getFullYear(), today.getMonth() + 1, 0));
        
        const dayOfWeek = today.getDay();
        const firstDayOfWeek = formatDate(new Date(new Date().setDate(today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1))));
        const lastDayOfWeek = formatDate(new Date(new Date().setDate(today.getDate() - dayOfWeek + 7)));

        const initialData = { weekly: {}, monthly: {} };
        const initialResellers = ['Iyoh', 'Eko', 'Endih', 'Anggi', 'Iyul', 'Nina', 'Cibatok', 'Baim', 'Lia', 'Oces'];

        const emptyVouchersSold = {};
        Object.keys(VOUCHER_LIST).forEach(name => {
            emptyVouchersSold[name] = 0;
        });

        initialResellers.forEach(name => {
            initialData.weekly[name] = { startDate: firstDayOfWeek, endDate: lastDayOfWeek, feePercentage: 5.0, vouchersSold: { ...emptyVouchersSold } };
            initialData.monthly[name] = { startDate: firstDayOfMonth, endDate: lastDayOfMonth, feePercentage: 5.0, vouchersSold: { ...emptyVouchersSold } };
        });

        try {
            await setDoc(salesDocRef, initialData);
            salesData = initialData;
            console.log("Initial data created in Firestore.");
        } catch (error) {
            console.error("Error creating initial data: ", error);
            alert("Gagal membuat data awal di server.");
        }
    }

    /**
     * Menangani penyimpanan data yang telah diubah ke Firestore.
     */
    async function handleSaveChanges(event) {
        event.preventDefault();
        const { reseller, type } = editingContext;
        
        const newVouchersSold = {};
        for (const voucherName in VOUCHER_LIST) {
            const input = document.getElementById(`voucher-input-${voucherName.replace(/\s+/g, '-')}`);
            newVouchersSold[voucherName] = parseInt(input.value, 10) || 0;
        }

        const updatedData = { ...salesData };
        updatedData[type][reseller] = {
            startDate: editStartDateInput.value,
            endDate: editEndDateInput.value,
            feePercentage: parseFloat(editFeePercentageInput.value),
            vouchersSold: newVouchersSold
        };

        try {
            await setDoc(salesDocRef, updatedData);
            closeEditModal();
        } catch (error) {
            console.error("Error updating document: ", error);
            alert("Gagal menyimpan perubahan ke server.");
        }
    }

    /**
     * Merender daftar reseller di panel admin.
     */
    function renderResellerList() {
        if (currentRole !== 'admin' || !salesData.weekly) return;
        resellerList.innerHTML = '';
        const allResellers = Object.keys(salesData.weekly).sort((a, b) => a.localeCompare(b));
        if (allResellers.length === 0) {
            resellerList.innerHTML = `<li class="text-sm text-gray-500">Belum ada reseller.</li>`;
            return;
        }
        allResellers.forEach(name => {
            const li = document.createElement('li');
            li.className = 'flex justify-between items-center bg-white p-2 rounded-md shadow-sm';
            li.innerHTML = `<span class="font-medium text-sm">${name}</span><button class="delete-reseller-btn text-red-500 hover:text-red-700 text-xs font-bold py-1 px-2 rounded-full hover:bg-red-100" data-reseller-name="${name}">Hapus</button>`;
            resellerList.appendChild(li);
        });
    }

    /**
     * Menangani penambahan reseller baru.
     */
    async function handleAddReseller(event) {
        event.preventDefault();
        const newName = newResellerNameInput.value.trim();
        if (!newName) {
            alert('Nama reseller tidak boleh kosong.');
            return;
        }

        const allResellers = salesData.weekly ? Object.keys(salesData.weekly) : [];
        if (allResellers.some(name => name.toLowerCase() === newName.toLowerCase())) {
            alert('Nama reseller sudah ada.');
            return;
        }

        const formatDate = (date) => date.toISOString().split('T')[0];
        const today = new Date();
        const firstDayOfMonth = formatDate(new Date(today.getFullYear(), today.getMonth(), 1));
        const lastDayOfMonth = formatDate(new Date(today.getFullYear(), today.getMonth() + 1, 0));
        const dayOfWeek = today.getDay();
        const firstDayOfWeek = formatDate(new Date(new Date().setDate(today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1))));
        const lastDayOfWeek = formatDate(new Date(new Date().setDate(today.getDate() - dayOfWeek + 7)));

        const emptyVouchersSold = {};
        Object.keys(VOUCHER_LIST).forEach(name => {
            emptyVouchersSold[name] = 0;
        });

        const newResellerData = {
            [`weekly.${newName}`]: { startDate: firstDayOfWeek, endDate: lastDayOfWeek, feePercentage: 5.0, vouchersSold: { ...emptyVouchersSold } },
            [`monthly.${newName}`]: { startDate: firstDayOfMonth, endDate: lastDayOfMonth, feePercentage: 5.0, vouchersSold: { ...emptyVouchersSold } }
        };

        try {
            await updateDoc(salesDocRef, newResellerData);
            newResellerNameInput.value = ''; // Kosongkan input setelah berhasil
        } catch (error) {
            console.error("Error adding new reseller: ", error);
            alert("Gagal menambahkan reseller baru.");
        }
    }

    /**
     * Merender grafik penjualan mingguan menggunakan Chart.js.
     */
    function renderWeeklySalesChart() {
        if (!salesData.weekly || !weeklySalesChartCanvas || (currentRole !== 'admin' && currentRole !== 'visitor' && currentRole !== 'reseller')) {
            return;
        }

        if (weeklyChartInstance) {
            weeklyChartInstance.destroy();
        }

        const calculateTotalSales = (vouchersSold) => {
            let total = 0;
            for (const voucherName in vouchersSold) {
                total += (vouchersSold[voucherName] || 0) * (VOUCHER_LIST[voucherName] || 0);
            }
            return total;
        };

        const sortedResellers = Object.keys(salesData.weekly).sort((a, b) => a.localeCompare(b));
        const labels = sortedResellers;
        const dataPoints = sortedResellers.map(name => calculateTotalSales(salesData.weekly[name].vouchersSold));

        const data = {
            labels: labels,
            datasets: [{
                label: 'Total Penjualan (Rp)',
                data: dataPoints,
                backgroundColor: 'rgba(59, 130, 246, 0.5)',
                borderColor: 'rgba(59, 130, 246, 1)',
                borderWidth: 1,
                borderRadius: 5,
            }]
        };

        const config = {
            type: 'bar',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, title: { display: true, text: 'Total Penjualan (Rp)' } }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: Rp ${context.parsed.y.toLocaleString('id-ID')}`;
                            }
                        }
                    }
                }
            }
        };

        weeklyChartInstance = new Chart(weeklySalesChartCanvas, config);
    }

    /**
     * Menangani penghapusan reseller.
     */
    async function handleDeleteReseller(event) {
        if (!event.target.classList.contains('delete-reseller-btn')) return;
        const resellerToDelete = event.target.dataset.resellerName;
        if (confirm(`Apakah Anda yakin ingin menghapus reseller "${resellerToDelete}"? Semua data penjualannya juga akan terhapus.`)) {
            try {
                await updateDoc(salesDocRef, {
                    [`weekly.${resellerToDelete}`]: deleteField(),
                    [`monthly.${resellerToDelete}`]: deleteField()
                });
            } catch (error) {
                console.error("Error deleting reseller: ", error);
                alert("Gagal menghapus reseller.");
            }
        }
    }

    /**
     * Mengunduh data sebagai file CSV.
     */
    function downloadCSV(dataType) {
        const dataToExport = salesData[dataType];
        if (!dataToExport || Object.keys(dataToExport).length === 0) {
            alert(`Tidak ada data ${dataType} untuk diunduh.`);
            return;
        }
        
        const calculateTotalSales = (vouchersSold) => Object.keys(vouchersSold).reduce((sum, key) => sum + (vouchersSold[key] || 0) * (VOUCHER_LIST[key] || 0), 0);

        const headers = ["Reseller", "Mulai Tanggal", "Sampai Tanggal", "Total Penjualan (Rp)", "Fee (%)", "Fee Admin (Rp)", "Fee Reseller (Rp)"];
        const rows = Object.keys(dataToExport).sort((a, b) => a.localeCompare(b)).map(resellerName => {
            const data = dataToExport[resellerName];
            const totalSales = calculateTotalSales(data.vouchersSold);
            const adminFee = totalSales * (data.feePercentage / 100);
            const resellerFee = totalSales - adminFee;
            return [`"${resellerName}"`, data.startDate, data.endDate, totalSales, data.feePercentage.toFixed(1), adminFee.toFixed(2), resellerFee.toFixed(2)].join(',');
        });
        const csvString = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `laporan_${dataType}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // --- Fungsi UI Lainnya (Login, Logout, Modal, dll) ---
    function showDashboard() {
        if (currentRole === 'admin') {
            welcomeHeading.textContent = `Dasbor Admin`;
            welcomeSubheading.textContent = `Selamat datang kembali, ${adminCredentials.email}`;
        } else if (currentRole === 'reseller') {
            welcomeHeading.textContent = `Laporan Penjualan ${currentUser}`;
            welcomeSubheading.textContent = 'Berikut adalah data penjualan terbaru Anda.';
        } else if (currentRole === 'visitor') {
            welcomeHeading.textContent = `Dasbor Pengunjung`;
            welcomeSubheading.textContent = 'Anda melihat data dalam mode hanya-baca.';
        }

        if (currentRole === 'admin') {
            resellerManagementSection.classList.remove('hidden');
            renderResellerList();
        } else {
            resellerManagementSection.classList.add('hidden');
        }

        renderTables();
        renderWeeklySalesChart();
        initialLoading.classList.add('hidden');
        loginPage.classList.add('hidden');
        dashboardPage.classList.remove('hidden');
    }

    function showLoginPage() {
        currentUser = null;
        currentRole = null;
        usernameInput.value = '';
        passwordInput.value = '';
        loginError.classList.add('hidden');
        resellerManagementSection.classList.add('hidden');
        dashboardPage.classList.add('hidden');
        initialLoading.classList.add('hidden');
        loginPage.classList.remove('hidden');
    }

    function handleLogin(event) {
        event.preventDefault();
        const username = usernameInput.value.trim();
        const password = passwordInput.value;
        loginError.classList.add('hidden');

        if (username.toLowerCase() === adminCredentials.email && password === adminCredentials.password) {
            currentUser = adminCredentials.email;
            currentRole = 'admin';
            sessionStorage.setItem('currentUser', currentUser);
            sessionStorage.setItem('currentRole', currentRole);
            showDashboard();
            return;
        }

        const allResellers = salesData.weekly ? Object.keys(salesData.weekly) : [];
        const resellerMatch = allResellers.find(name => name.toLowerCase() === username.toLowerCase());
        if (resellerMatch) {
            currentUser = resellerMatch;
            currentRole = 'reseller';
            sessionStorage.setItem('currentUser', currentUser);
            sessionStorage.setItem('currentRole', currentRole);
            showDashboard();
            return;
        }

        loginError.textContent = 'Username atau password salah.';
        loginError.classList.remove('hidden');
    }

    function handleLogout() {
        sessionStorage.removeItem('currentUser');
        sessionStorage.removeItem('currentRole');
        showLoginPage();
    }

    function openEditModal(reseller, type) {
        editingContext = { reseller, type };
        const data = salesData[type][reseller];
        modalTitle.textContent = `Update Penjualan ${type === 'weekly' ? 'Mingguan' : 'Bulanan'}`;
        modalSubtitle.textContent = `Mengubah data untuk reseller: ${reseller}`;
        editStartDateInput.value = data.startDate;
        editEndDateInput.value = data.endDate;
        editFeePercentageInput.value = data.feePercentage;

        voucherInputsContainer.innerHTML = '';
        for (const voucherName in VOUCHER_LIST) {
            const price = VOUCHER_LIST[voucherName];
            const quantity = data.vouchersSold[voucherName] || 0;
            const inputId = `voucher-input-${voucherName.replace(/\s+/g, '-')}`;
            const div = document.createElement('div');
            div.className = 'flex items-center justify-between';
            div.innerHTML = `
                <label for="${inputId}" class="text-sm text-gray-600">${voucherName} (Rp ${price.toLocaleString('id-ID')})</label>
                <input type="number" id="${inputId}" value="${quantity}" min="0" class="w-24 px-2 py-1 bg-gray-100 border-2 border-gray-200 rounded-md text-right focus:outline-none focus:ring-2 focus:ring-blue-500">
            `;
            voucherInputsContainer.appendChild(div);
        }

        editModal.classList.remove('hidden');
        setTimeout(() => { editModal.querySelector('.modal-content').classList.remove('scale-95'); }, 10);
    }

    function closeEditModal() {
        editModal.querySelector('.modal-content').classList.add('scale-95');
        setTimeout(() => { editModal.classList.add('hidden'); }, 300);
    }
    function togglePasswordVisibility() {
        const isPassword = passwordInput.type === 'password';
        passwordInput.type = isPassword ? 'text' : 'password';
        eyeIcon.classList.toggle('hidden', isPassword);
        eyeSlashIcon.classList.toggle('hidden', !isPassword);
    }

    // --- EVENT LISTENERS ---
    loginForm.addEventListener('submit', handleLogin);
    logoutButton.addEventListener('click', handleLogout);
    togglePasswordVisibilityButton.addEventListener('click', togglePasswordVisibility);
    addResellerForm.addEventListener('submit', handleAddReseller);
    resellerList.addEventListener('click', handleDeleteReseller);
    downloadWeeklyCsvButton.addEventListener('click', () => downloadCSV('weekly'));
    downloadMonthlyCsvButton.addEventListener('click', () => downloadCSV('monthly'));

    visitorLoginBtn.addEventListener('click', () => {
        currentUser = 'Pengunjung';
        currentRole = 'visitor';
        sessionStorage.setItem('currentUser', currentUser);
        sessionStorage.setItem('currentRole', currentRole);
        showDashboard();
    });

    dashboardPage.addEventListener('click', (event) => {
        if (event.target.classList.contains('edit-btn')) {
            openEditModal(event.target.dataset.reseller, event.target.dataset.type);
        }
    });
    editForm.addEventListener('submit', handleSaveChanges);
    cancelEditButton.addEventListener('click', closeEditModal);
    editModal.addEventListener('click', (event) => { if (event.target === editModal) closeEditModal(); });

    // --- INISIALISASI APLIKASI ---

    checkSession();

    onSnapshot(salesDocRef, async (doc) => {
        console.log("Data received from Firestore.");
        if (doc.exists()) {
            salesData = doc.data();
            if (currentUser) {
                showDashboard();
            }
        } else {
            console.log("No such document! Creating initial data...");
            await initializeDataInFirestore();
        }
        if (!currentUser) { showLoginPage(); }
    }, (error) => {
        console.error("Error listening to document: ", error);
        alert("Koneksi ke server gagal. Periksa koneksi internet dan konfigurasi Firebase Anda. Pastikan juga Aturan Keamanan (Security Rules) di Firestore sudah benar.");
        initialLoading.innerHTML = '<p class="text-red-500 font-semibold">Koneksi Gagal</p><p class="text-xs text-gray-500 mt-2">Lihat konsol browser (F12) untuk detail error.</p>';
    });
});

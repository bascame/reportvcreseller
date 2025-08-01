// Import fungsi-fungsi yang diperlukan dari Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, doc, onSnapshot, setDoc, updateDoc, deleteField } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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
const initialResellerNames = ['Iyoh', 'Eko', 'Endih', 'Anggi', 'Iyul', 'Nina', 'Cibatok', 'Baim', 'Lia', 'Oces'];
const voucherOptions = {
    "6 Jam": 2000,
    "12 Jam": 3000,
    "1 Hari": 5000,
    "3 Hari": 10000,
    "30 Hari": 50000
};
let salesData = { weekly: {}, monthly: {} };
let currentUser = null;
let currentRole = null; // 'admin', 'reseller', atau 'visitor'
let editingContext = { reseller: null, type: null };
let weeklyChartInstance = null;

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
const editVoucherTypeSelect = document.getElementById('edit-voucher-type');
const editVcInput = document.getElementById('edit-vc');
const editFeePercentageInput = document.getElementById('edit-fee-percentage');
const cancelEditButton = document.getElementById('cancel-edit');
const resellerManagementSection = document.getElementById('reseller-management-section');
const addResellerForm = document.getElementById('add-reseller-form');
const newResellerNameInput = document.getElementById('new-reseller-name');
const resellerList = document.getElementById('reseller-list');
const weeklySalesChartCanvas = document.getElementById('weekly-sales-chart');
const downloadWeeklyCsvButton = document.getElementById('download-weekly-csv');
const downloadMonthlyCsvButton = document.getElementById('download-monthly-csv');
const voucherListContainer = document.getElementById('voucher-list-container');

// --- FUNGSI-FUNGSI UTAMA ---

/**
 * **SOLUSI:** Membersihkan dan menormalkan data dari Firestore.
 * Fungsi ini memastikan setiap entri penjualan memiliki semua field yang diperlukan.
 * @param {object} data - Data mentah dari Firestore.
 * @returns {object} Data yang sudah bersih dan konsisten.
 */
function normalizeData(data) {
    const defaultVoucher = Object.keys(voucherOptions)[0];
    const defaultPrice = voucherOptions[defaultVoucher];
    const defaultFee = 5.0;

    const today = new Date();
    const formatDate = (date) => date.toISOString().split('T')[0];
    const firstDayOfWeek = formatDate(new Date(today.setDate(today.getDate() - today.getDay() + 1)));
    const lastDayOfWeek = formatDate(new Date(today.setDate(today.getDate() - today.getDay() + 7)));

    // Pastikan data memiliki properti 'weekly' dan 'monthly'
    if (!data.weekly) data.weekly = {};
    if (!data.monthly) data.monthly = {};
    
    // Periksa setiap reseller di data mingguan dan bulanan
    const allResellerNames = [...new Set([...Object.keys(data.weekly), ...Object.keys(data.monthly)])];

    for (const resellerName of allResellerNames) {
        // Normalisasi data mingguan
        const weeklyEntry = data.weekly[resellerName] || {};
        data.weekly[resellerName] = {
            voucherType: weeklyEntry.voucherType || defaultVoucher,
            totalVC: typeof weeklyEntry.totalVC === 'number' ? weeklyEntry.totalVC : (voucherOptions[weeklyEntry.voucherType] || defaultPrice),
            feePercentage: typeof weeklyEntry.feePercentage === 'number' ? weeklyEntry.feePercentage : defaultFee,
            startDate: weeklyEntry.startDate || firstDayOfWeek,
            endDate: weeklyEntry.endDate || lastDayOfWeek,
        };
        
        // Normalisasi data bulanan
        const monthlyEntry = data.monthly[resellerName] || {};
        data.monthly[resellerName] = {
            voucherType: monthlyEntry.voucherType || defaultVoucher,
            totalVC: typeof monthlyEntry.totalVC === 'number' ? monthlyEntry.totalVC : (voucherOptions[monthlyEntry.voucherType] || defaultPrice),
            feePercentage: typeof monthlyEntry.feePercentage === 'number' ? monthlyEntry.feePercentage : defaultFee,
            startDate: monthlyEntry.startDate || formatDate(new Date(today.getFullYear(), today.getMonth(), 1)),
            endDate: monthlyEntry.endDate || formatDate(new Date(today.getFullYear(), today.getMonth() + 1, 0)),
        };
    }
    
    return data;
}


/**
 * Merender daftar voucher yang tersedia di dasbor.
 */
function renderVoucherList() {
    voucherListContainer.innerHTML = '';
    for (const [name, price] of Object.entries(voucherOptions)) {
        const voucherCard = `
            <div class="bg-gray-100 p-4 rounded-lg shadow-md">
                <p class="font-semibold text-gray-700">${name}</p>
                <p class="text-blue-600 font-bold text-lg">Rp ${price.toLocaleString('id-ID')}</p>
            </div>
        `;
        voucherListContainer.innerHTML += voucherCard;
    }
}

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

    const renderRow = (resellerName, data, type) => {
        const { startDate, endDate, voucherType, totalVC, feePercentage } = data;
        const adminFee = totalVC * (feePercentage / 100);
        const resellerFee = totalVC - adminFee;
        return `
            <tr class="border-b border-gray-100 hover:bg-gray-50">
                <td class="py-4 px-4 font-medium">${resellerName}</td>
                <td class="py-4 px-4 text-sm text-gray-600">${voucherType}</td>
                <td class="py-4 px-4 text-sm text-gray-600">${startDate}</td>
                <td class="py-4 px-4 text-sm text-gray-600">${endDate}</td>
                <td class="py-4 px-4 text-right font-medium">${totalVC.toLocaleString('id-ID')}</td>
                <td class="py-4 px-4 text-right text-sm text-gray-600">${feePercentage.toFixed(1)}%</td>
                <td class="py-4 px-4 text-right text-sm text-red-600 font-semibold">${adminFee.toLocaleString('id-ID', { minimumFractionDigits: 2 })}</td>
                <td class="py-4 px-4 text-right text-sm text-green-600 font-semibold">${resellerFee.toLocaleString('id-ID', { minimumFractionDigits: 2 })}</td>
                ${showActions ? `<td class="py-4 px-4 text-center"><button class="edit-btn bg-blue-100 text-blue-700 text-xs font-bold py-1 px-3 rounded-full hover:bg-blue-200" data-reseller="${resellerName}" data-type="${type}">Edit</button></td>` : '<td></td>'}
            </tr>`;
    };

    const allResellers = salesData.weekly ? Object.keys(salesData.weekly).sort((a, b) => a.localeCompare(b)) : [];
    const displayNames = (currentRole === 'admin' || currentRole === 'visitor' || currentRole === 'reseller') ? allResellers : [currentUser];

    let weeklyTotalVC = 0, weeklyTotalAdminFee = 0, weeklyTotalResellerFee = 0;
    let monthlyTotalVC = 0, monthlyTotalAdminFee = 0, monthlyTotalResellerFee = 0;

    displayNames.forEach(name => {
        if (salesData.weekly[name]) {
            weeklySalesBody.innerHTML += renderRow(name, salesData.weekly[name], 'weekly');
            const { totalVC, feePercentage } = salesData.weekly[name];
            const adminFee = totalVC * (feePercentage / 100);
            weeklyTotalVC += totalVC;
            weeklyTotalAdminFee += adminFee;
            weeklyTotalResellerFee += (totalVC - adminFee);
        }
        if (salesData.monthly[name]) {
            monthlySalesBody.innerHTML += renderRow(name, salesData.monthly[name], 'monthly');
            const { totalVC, feePercentage } = salesData.monthly[name];
            const adminFee = totalVC * (feePercentage / 100);
            monthlyTotalVC += totalVC;
            monthlyTotalAdminFee += adminFee;
            monthlyTotalResellerFee += (totalVC - adminFee);
        }
    });

    const renderFooterRow = (totalVC, totalAdminFee, totalResellerFee) => {
        const actionCols = showActions ? '<td></td>' : '';
        return `
            <tr class="border-t-2 border-gray-300 bg-gray-50 font-bold">
                <td class="py-3 px-4" colspan="4">TOTAL</td>
                <td class="py-3 px-4 text-right">${totalVC.toLocaleString('id-ID')}</td>
                <td class="py-3 px-4"></td>
                <td class="py-3 px-4 text-right text-red-700">${totalAdminFee.toLocaleString('id-ID', { minimumFractionDigits: 2 })}</td>
                <td class="py-3 px-4 text-right text-green-700">${totalResellerFee.toLocaleString('id-ID', { minimumFractionDigits: 2 })}</td>
                ${actionCols}
            </tr>`;
    };

    if (displayNames.length > 0) {
        weeklySalesFoot.innerHTML = renderFooterRow(weeklyTotalVC, weeklyTotalAdminFee, weeklyTotalResellerFee);
        monthlySalesFoot.innerHTML = renderFooterRow(monthlyTotalVC, monthlyTotalAdminFee, monthlyTotalResellerFee);
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
    initialResellerNames.forEach(name => {
        initialData.weekly[name] = { startDate: firstDayOfWeek, endDate: lastDayOfWeek, voucherType: '6 Jam', totalVC: 2000, feePercentage: 5.0 };
        initialData.monthly[name] = { startDate: firstDayOfMonth, endDate: lastDayOfMonth, voucherType: '6 Jam', totalVC: 2000, feePercentage: 5.0 };
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

    const newVoucherType = editVoucherTypeSelect.value;
    const newTotalVC = parseInt(editVcInput.value, 10);
    const newStartDate = editStartDateInput.value;
    const newEndDate = editEndDateInput.value;
    const newFeePercentage = parseFloat(editFeePercentageInput.value);

    if (newStartDate && newEndDate && newVoucherType && !isNaN(newTotalVC) && !isNaN(newFeePercentage)) {
        const updatedData = { ...salesData };
        updatedData[type][reseller] = {
            startDate: newStartDate,
            endDate: newEndDate,
            voucherType: newVoucherType,
            totalVC: newTotalVC,
            feePercentage: newFeePercentage
        };

        try {
            await setDoc(salesDocRef, updatedData);
            closeEditModal();
        } catch (error) {
            console.error("Error updating document: ", error);
            alert("Gagal menyimpan perubahan ke server.");
        }
    } else {
        alert('Harap masukkan data yang valid di semua kolom.');
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

    const defaultVoucher = Object.keys(voucherOptions)[0];
    const defaultPrice = voucherOptions[defaultVoucher];

    const newResellerData = {
        [`weekly.${newName}`]: { startDate: firstDayOfWeek, endDate: lastDayOfWeek, voucherType: defaultVoucher, totalVC: defaultPrice, feePercentage: 5.0 },
        [`monthly.${newName}`]: { startDate: firstDayOfMonth, endDate: lastDayOfMonth, voucherType: defaultVoucher, totalVC: defaultPrice, feePercentage: 5.0 }
    };

    try {
        await updateDoc(salesDocRef, newResellerData);
        newResellerNameInput.value = '';
    } catch (error) {
        console.error("Error adding new reseller: ", error);
        alert("Gagal menambahkan reseller baru.");
    }
}

/**
 * Merender grafik penjualan mingguan.
 */
function renderWeeklySalesChart() {
    if (!salesData.weekly || !weeklySalesChartCanvas || (currentRole !== 'admin' && currentRole !== 'visitor' && currentRole !== 'reseller')) {
        return;
    }

    if (weeklyChartInstance) {
        weeklyChartInstance.destroy();
    }

    const sortedResellers = Object.keys(salesData.weekly).sort((a, b) => a.localeCompare(b));
    const labels = sortedResellers;
    const dataPoints = sortedResellers.map(name => salesData.weekly[name].totalVC);

    const data = {
        labels: labels,
        datasets: [{
            label: 'Harga Voucher',
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
                y: { beginAtZero: true, title: { display: true, text: 'Harga (Rp)' } }
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
    if (confirm(`Apakah Anda yakin ingin menghapus reseller "${resellerToDelete}"?`)) {
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

    const headers = ["Reseller", "Jenis Voucher", "Mulai Tanggal", "Sampai Tanggal", "Harga", "Fee (%)", "Fee Admin", "Fee Reseller"];
    
    const rows = Object.keys(dataToExport).sort().map(resellerName => {
        const data = dataToExport[resellerName];
        const { voucherType, startDate, endDate, totalVC, feePercentage } = data;
        const adminFee = totalVC * (feePercentage / 100);
        const resellerFee = totalVC - adminFee;

        return [`"${resellerName}"`, voucherType, startDate, endDate, totalVC, feePercentage.toFixed(1), adminFee.toFixed(2), resellerFee.toFixed(2)].join(',');
    });

    const csvString = [headers.join(','), ...rows].join('
');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `laporan_penjualan_${dataType}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}


// --- Fungsi UI Lainnya ---

function restoreSession() {
    const storedUser = sessionStorage.getItem('currentUser');
    const storedRole = sessionStorage.getItem('currentRole');
    if (storedUser && storedRole) {
        currentUser = storedUser;
        currentRole = storedRole;
    }
}

function showDashboard() {
    if (currentRole === 'admin') {
        welcomeHeading.textContent = `Dasbor Admin`;
        welcomeSubheading.textContent = `Selamat datang kembali, ${adminCredentials.email}`;
    } else if (currentRole === 'reseller') {
        welcomeHeading.textContent = `Laporan Penjualan ${currentUser}`;
        welcomeSubheading.textContent = 'Berikut adalah data penjualan terbaru Anda.';
    } else {
        welcomeHeading.textContent = `Dasbor Pengunjung`;
        welcomeSubheading.textContent = 'Anda melihat data dalam mode hanya-baca.';
    }
    
    resellerManagementSection.classList.toggle('hidden', currentRole !== 'admin');

    renderVoucherList();
    renderTables();
    renderResellerList();
    renderWeeklySalesChart();
    loginPage.classList.add('hidden');
    dashboardPage.classList.remove('hidden');
    initialLoading.classList.add('hidden');
}

function showLoginPage() {
    currentUser = null;
    currentRole = null;
    usernameInput.value = '';
    passwordInput.value = '';
    loginError.classList.add('hidden');
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
    } else {
        const allResellers = salesData.weekly ? Object.keys(salesData.weekly) : [];
        const resellerMatch = allResellers.find(name => name.toLowerCase() === username.toLowerCase());
        if (resellerMatch) {
            currentUser = resellerMatch;
            currentRole = 'reseller';
        }
    }
    
    if (currentUser) {
        sessionStorage.setItem('currentUser', currentUser);
        sessionStorage.setItem('currentRole', currentRole);
        showDashboard();
    } else {
        loginError.textContent = 'Username atau password salah.';
        loginError.classList.remove('hidden');
    }
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
    
    // Populate voucher dropdown
    editVoucherTypeSelect.innerHTML = '';
    for (const voucherName in voucherOptions) {
        const option = document.createElement('option');
        option.value = voucherName;
        option.textContent = `${voucherName} (Rp ${voucherOptions[voucherName].toLocaleString('id-ID')})`;
        editVoucherTypeSelect.appendChild(option);
    }
    
    editVoucherTypeSelect.value = data.voucherType || Object.keys(voucherOptions)[0];
    editVcInput.value = data.totalVC;

    editModal.classList.remove('hidden');
    setTimeout(() => editModal.querySelector('.modal-content').classList.remove('scale-95'), 10);
}

function closeEditModal() {
    editModal.querySelector('.modal-content').classList.add('scale-95');
    setTimeout(() => editModal.classList.add('hidden'), 300);
}

function updateVoucherPrice() {
    const selectedVoucher = editVoucherTypeSelect.value;
    editVcInput.value = voucherOptions[selectedVoucher] || 0;
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
editVoucherTypeSelect.addEventListener('change', updateVoucherPrice);

visitorLoginBtn.addEventListener('click', () => {
    currentUser = 'Pengunjung';
    currentRole = 'visitor';
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
restoreSession();

onSnapshot(salesDocRef, async (doc) => {
    console.log("Data received from Firestore.");
    let rawData;
    if (doc.exists()) {
        rawData = doc.data();
    } else {
        console.log("No such document! Creating initial data...");
        await initializeDataInFirestore();
        rawData = salesData; // Use the newly created initial data
    }
    
    // **PERBAIKAN UTAMA:** Normalisasi data setiap kali data diterima dari server
    salesData = normalizeData(rawData);

    if (currentUser) {
        showDashboard();
    } else {
        showLoginPage();
    }
}, (error) => {
    console.error("Error listening to document: ", error);
    initialLoading.innerHTML = '<p class="text-red-500 font-semibold">Koneksi Gagal</p><p class="text-xs text-gray-500 mt-2">Periksa konsol (F12) untuk detail.</p>';
});

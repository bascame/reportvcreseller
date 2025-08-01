# Blueprint: Dasbor Penjualan Voucher

## Ikhtisar

Aplikasi ini adalah dasbor berbasis web real-time yang dirancang untuk melacak dan mengelola penjualan voucher oleh berbagai reseller. Aplikasi ini menyediakan antarmuka yang berbeda untuk admin, reseller, dan pengunjung, dengan fungsionalitas yang disesuaikan untuk setiap peran.

## Fitur Inti

### Versi Awal
- **Sistem Login Berbasis Peran**:
  - **Admin**: Memiliki akses penuh ke semua fitur, termasuk manajemen reseller dan pengeditan semua data penjualan. Login menggunakan email dan kata sandi.
  - **Reseller**: Dapat melihat data penjualan mereka sendiri. Login hanya dengan menggunakan nama reseller mereka.
  - **Pengunjung**: Dapat melihat semua data penjualan dalam mode hanya-baca (read-only) tanpa bisa mengubah apa pun.
- **Manajemen Reseller (Khusus Admin)**:
  - Menambah reseller baru.
  - Menghapus reseller yang sudah ada.
  - Melihat daftar semua reseller.
- **Tampilan Data Penjualan**:
  - Data penjualan ditampilkan dalam dua tabel terpisah: **Mingguan** dan **Bulanan**.
  - Setiap tabel menampilkan: Nama Reseller, Tanggal Mulai & Selesai, Total VC, Fee (%), Fee Admin, dan Fee Reseller.
  - Total keseluruhan untuk setiap metrik dihitung dan ditampilkan di bagian bawah tabel.
- **Visualisasi Data**:
  - Grafik batang interaktif menampilkan perbandingan penjualan voucher mingguan antar reseller.
- **Pengeditan Data (Khusus Admin)**:
  - Admin dapat mengklik tombol "Edit" untuk membuka modal dan mengubah detail entri penjualan.
- **Ekspor Data**:
  - Admin dapat mengunduh laporan penjualan mingguan dan bulanan dalam format file CSV.

### Perubahan Saat Ini: Manajemen Voucher

- **Tujuan**: Mengintegrasikan sistem manajemen jenis voucher untuk melacak penjualan secara lebih rinci.

- **Rencana Implementasi**:
  1. **Buat Bagian Daftar Voucher**:
     - Tambahkan elemen UI baru di dasbor untuk menampilkan daftar voucher yang tersedia beserta harganya.
     - Daftar voucher: `6 Jam (2.000)`, `12 Jam (3.000)`, `1 Hari (5.000)`, `3 Hari (10.000)`, `30 Hari (50.000)`.
  2. **Perbarui Struktur Data**:
     - Tambahkan field baru `voucherType` ke setiap entri data penjualan (mingguan dan bulanan) di Firestore.
     - Nilai default akan diatur ke '6 Jam' untuk data yang sudah ada atau yang baru dibuat.
  3. **Perbarui Antarmuka Tabel**:
     - Tambahkan kolom baru "Jenis Voucher" di tabel penjualan mingguan dan bulanan.
  4. **Perbarui Modal Edit**:
     - Ganti input "Total VC Terjual" dengan *dropdown* (pilihan) "Jenis Voucher".
     - Saat jenis voucher dipilih, harga yang sesuai akan secara otomatis mengisi input "Total VC" yang sekarang hanya bisa dibaca (read-only).
  5. **Perbarui Logika Aplikasi (`main.js`)**:
     - Definisikan objek `voucherOptions` untuk memetakan nama voucher ke harganya.
     - Modifikasi fungsi `renderTables` untuk menampilkan jenis voucher di kolom baru.
     - Modifikasi fungsi `openEditModal` untuk mengisi *dropdown* voucher dan mengatur listener untuk memperbarui harga secara otomatis.
     - Modifikasi fungsi `handleSaveChanges` untuk menyimpan `voucherType` dan `totalVC` yang sesuai ke Firestore.
     - Modifikasi fungsi `downloadCSV` untuk menyertakan kolom "Jenis Voucher" dalam ekspor.
  6. **Perbarui `blueprint.md`**:
     - Dokumentasikan fitur baru ini secara rinci di dalam file `blueprint.md`.

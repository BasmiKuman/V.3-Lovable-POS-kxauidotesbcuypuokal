# 🚀 BK-POS (Basmi Kuman - Point of Sale)

## 📋 Deskripsi Project

**BK-POS** adalah sistem Point of Sale (POS) modern berbasis web dan mobile yang dirancang khusus untuk bisnis distribusi produk dengan model rider/delivery. Sistem ini memungkinkan manajemen produk, distribusi ke rider, penjualan real-time, tracking GPS, dan pelaporan yang komprehensif.

### 🎯 Target User
- Bisnis distribusi produk (minuman, makanan, retail)
- Warung/kedai dengan sistem delivery
- UMKM yang menggunakan rider untuk penjualan keliling
- Bisnis dengan kebutuhan tracking penjualan real-time

---

## ✨ Fitur Utama

### 1️⃣ **Multi-Role System**

#### **Admin Dashboard**
- ✅ Manajemen produk (CRUD, stock, harga, kategori)
- ✅ Distribusi produk ke rider
- ✅ Monitoring stock warehouse real-time
- ✅ Approval return produk dari rider
- ✅ Laporan penjualan lengkap (daily, weekly, monthly)
- ✅ Manajemen user (tambah/edit/hapus rider & admin)
- ✅ Analytics & dashboard overview

#### **Rider Dashboard**
- ✅ POS (Point of Sale) untuk transaksi penjualan
- ✅ Stock management (view stock pribadi)
- ✅ Return produk (full & partial return)
- ✅ GPS tracking otomatis
- ✅ History transaksi pribadi
- ✅ Bulk return produk

---

### 2️⃣ **Product Management**

#### **Fitur Produk:**
- ✅ Upload foto produk
- ✅ Kategori produk (Add On, Cup, dll)
- ✅ SKU management
- ✅ Harga per produk
- ✅ Stock warehouse & stock per rider
- ✅ Minimum stock alert
- ✅ Bulk operations

#### **Stock System:**
```
┌─────────────────────────────────────────┐
│  Warehouse (Pusat)                      │
│  └── Distribusi → Rider A (Stock: 50)  │
│                → Rider B (Stock: 30)  │
│                → Rider C (Stock: 20)  │
└─────────────────────────────────────────┘
```

**Stock Tracking:**
- Real-time stock warehouse
- Stock per rider (isolated)
- Auto-update setelah penjualan
- Stock history & audit trail

---

### 3️⃣ **Distribution System**

#### **Distribusi Produk:**
- ✅ Pilih rider tujuan
- ✅ Pilih multiple produk
- ✅ Set quantity per produk
- ✅ Catatan distribusi
- ✅ History distribusi lengkap

#### **Flow Distribusi:**
```
1. Admin pilih rider
2. Admin pilih produk & quantity
3. Submit distribusi
4. Stock warehouse berkurang
5. Stock rider bertambah
6. Notifikasi ke rider (optional)
```

---

### 4️⃣ **Point of Sale (POS)**

#### **Fitur POS:**
- ✅ Keranjang belanja
- ✅ Tambah/kurangi quantity
- ✅ Auto-calculate subtotal & total
- ✅ Checkout langsung
- ✅ Stock auto-update
- ✅ Print receipt (optional)

#### **UI/UX POS:**
- 🎨 Grid layout untuk produk
- 📱 Mobile-friendly
- 🔍 Search produk
- 🎯 Quick add to cart
- 💰 Real-time total calculation

#### **Transaction Flow:**
```
1. Rider pilih produk
2. Tambah ke keranjang
3. Review total
4. Checkout
5. Stock rider berkurang
6. Transaction saved
7. Receipt generated (optional)
```

---

### 5️⃣ **Return Product System**

#### **Jenis Return:**

**1. Full Return** (Return Semua Stock)
```
Rider punya: 20 cup
Return: 20 cup (semua)
Result: Stock rider = 0
        Stock warehouse +20
```

**2. Partial Return** (Return Sebagian)
```
Rider punya: 20 cup
Return: 5 cup (produk cacat)
Result: Stock rider = 15
        Stock warehouse +5
```

#### **Fitur Return:**
- ✅ Bulk return (multiple produk sekaligus)
- ✅ Individual return per produk
- ✅ Catatan alasan return
- ✅ Approval workflow (Admin approve/reject)
- ✅ Return history tracking
- ✅ Tombol "Return Semua Produk" (quick action)
- ✅ Tombol "Semua" per produk
- ✅ Validasi return (tidak boleh > stock)

#### **UI/UX Return:**
- 📱 Checkbox circle di mobile (hemat space)
- ✏️ Auto-select input saat focus
- 🔢 Input quantity dengan placeholder
- ⚡ Quick action buttons
- ✅ Real-time validation

---

### 6️⃣ **GPS Tracking System**

#### **Fitur GPS:**
- ✅ Auto-capture lokasi saat transaksi
- ✅ GPS coordinates (latitude, longitude)
- ✅ Timestamp tracking
- ✅ History tracking per rider
- ✅ View di peta (optional - need Google Maps API)

#### **Data GPS:**
```json
{
  "rider_id": "xxx",
  "latitude": -6.200000,
  "longitude": 106.816666,
  "timestamp": "2025-11-03T10:30:00Z",
  "transaction_id": "yyy"
}
```

---

### 7️⃣ **Reporting System**

#### **Jenis Laporan:**

**1. Sales Report (Laporan Penjualan)**
- 📊 Total penjualan (harian, mingguan, bulanan)
- 💰 Total revenue
- 📦 Total produk terjual
- 🏆 Top selling products
- 👥 Performance per rider

**2. Report Formats:**

**📄 PDF Report:**
- ✅ Header dengan logo & info bisnis
- ✅ Summary cards (total sales, revenue, cups, add-ons)
- ✅ Tabel transaksi lengkap dengan:
  - Tanggal & waktu
  - Rider name
  - Produk (breakdown per item)
  - Quantity per produk
  - Subtotal per item
  - Total transaksi
- ✅ Pemisahan cup count vs Add On count
- ✅ Summary per rider (accordion)
- ✅ Footer dengan timestamp

**📊 Excel Report:**
- ✅ Multiple sheets (Overview, Transactions, Products)
- ✅ Raw data untuk analisis lebih lanjut
- ✅ Formula & calculations
- ✅ Export ready

#### **Grafik & Visualisasi:**

**1. Line Chart (Tren Penjualan)**
- ✅ Gradient fill modern
- ✅ Y-axis formatted (50k, 100k)
- ✅ Active dots dengan border
- ✅ Shadow tooltips
- ✅ Responsive design

**2. Bar Chart (Performance Rider)**
- ✅ Gradient bars
- ✅ Rounded tops (8px)
- ✅ Max bar width (60px)
- ✅ Hover effects
- ✅ Color coding

#### **Date Range Filter:**
- ✅ Custom date range picker
- ✅ Quick filters (Today, This Week, This Month)
- ✅ Real-time update charts

---

### 8️⃣ **User Management**

#### **Fitur User:**
- ✅ Add new user (Admin/Rider)
- ✅ Edit user profile
- ✅ Upload avatar
- ✅ Change role
- ✅ Deactivate user
- ✅ User list dengan filter

#### **User Data:**
- Full name
- Email
- Phone number
- Role (Admin/Rider)
- Avatar (profile picture)
- Status (Active/Inactive)

#### **Authentication:**
- ✅ Email & password login
- ✅ Supabase Auth
- ✅ Row Level Security (RLS)
- ✅ Role-based access control
- ✅ Password reset via email

---

### 9️⃣ **Warehouse Management**

#### **Fitur Warehouse:**
- ✅ View stock semua produk
- ✅ Stock cards dengan visual
- ✅ Low stock warning
- ✅ Distribusi langsung dari warehouse
- ✅ Return history
- ✅ Stock movement tracking

#### **Stock Overview:**
```
┌──────────────────────────────────┐
│  Kopi Susu                       │
│  Stock: 150 cup                  │
│  Minimum: 50                     │
│  Status: ✅ Normal               │
├──────────────────────────────────┤
│  Es Teh                          │
│  Stock: 20 cup                   │
│  Minimum: 50                     │
│  Status: ⚠️ Low Stock            │
└──────────────────────────────────┘
```

---

## 🎨 Design & UI/UX

### **Design System:**
- ✅ Modern UI dengan Shadcn/ui components
- ✅ Tailwind CSS untuk styling
- ✅ Responsive design (mobile-first)
- ✅ Dark/Light mode (optional)
- ✅ Consistent color scheme
- ✅ Icon system (Lucide icons)

### **Mobile Optimization:**
- ✅ Touch-friendly buttons
- ✅ Optimized grid layout
- ✅ Compact cards
- ✅ Swipeable actions (optional)
- ✅ Bottom navigation (optional)
- ✅ Circle checkbox (hemat space)

### **Desktop Optimization:**
- ✅ Sidebar navigation
- ✅ Multi-column layout
- ✅ Data tables dengan pagination
- ✅ Advanced filters
- ✅ Keyboard shortcuts ready

---

## 🔐 Security & Data Protection

### **Security Features:**
- ✅ Row Level Security (RLS) di Supabase
- ✅ Role-based access control
- ✅ Data isolation per user
- ✅ Secure API endpoints
- ✅ Input validation
- ✅ SQL injection protection
- ✅ XSS protection

### **Data Privacy:**
- ✅ User data encrypted
- ✅ Secure password hashing
- ✅ HTTPS only
- ✅ No data leakage between users

---

## 📱 Platform Support

### **Web Application:**
- ✅ Chrome, Firefox, Safari, Edge
- ✅ Desktop & Laptop
- ✅ Tablet support
- ✅ Progressive Web App (PWA) ready

### **Mobile Application (Android):**
- ✅ Android APK via Capacitor
- ✅ Native features (GPS, Camera)
- ✅ Offline capability (planned)
- ✅ Push notifications (planned)

---

## 🛠️ Technology Stack

### **Frontend:**
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool & dev server
- **Tailwind CSS** - Styling
- **Shadcn/ui** - Component library
- **Recharts** - Data visualization
- **jsPDF** - PDF generation
- **React Router** - Navigation
- **Tanstack Query** - Data fetching

### **Backend:**
- **Supabase** - Backend as a Service
  - PostgreSQL database
  - Authentication
  - Row Level Security
  - Real-time subscriptions
  - Storage for images

### **Mobile:**
- **Capacitor 7.4.4** - Native wrapper
- **Android SDK** - APK generation

### **DevOps:**
- **Git & GitHub** - Version control
- **GitHub Actions** - CI/CD pipeline
- **Netlify** - Web hosting (optional)
- **Supabase Cloud** - Database hosting

---

## 📊 Database Schema

### **Core Tables:**

```sql
-- Users & Profiles
profiles (id, email, full_name, phone, role, avatar_url)

-- Products
products (id, name, sku, price, stock_in_warehouse, category_id, image_url)
categories (id, name)

-- Stock Management
rider_stock (id, rider_id, product_id, quantity)
distributions (id, rider_id, notes, created_at)
distribution_items (id, distribution_id, product_id, quantity)

-- Transactions
transactions (id, rider_id, total_amount, created_at)
transaction_items (id, transaction_id, product_id, quantity, price, subtotal)

-- Returns
returns (id, rider_id, product_id, quantity, notes, returned_at, status)
return_history (id, rider_id, product_id, quantity, approved_by, status)

-- GPS Tracking
gps_tracking (id, rider_id, latitude, longitude, timestamp)
```

### **Relationships:**
```
profiles 1 → N rider_stock
profiles 1 → N distributions
profiles 1 → N transactions
products 1 → N transaction_items
products 1 → N distribution_items
categories 1 → N products
```

---

## 🚀 Key Features & Advantages

### **1. Real-Time Operations**
- ✅ Instant stock updates
- ✅ Real-time transaction recording
- ✅ Live GPS tracking
- ✅ Immediate data sync across devices

### **2. Multi-User Collaboration**
- ✅ Multiple riders working simultaneously
- ✅ Admin can monitor all riders
- ✅ No data conflicts
- ✅ Role-based permissions

### **3. Comprehensive Reporting**
- ✅ Detailed sales analytics
- ✅ Performance metrics per rider
- ✅ Product movement tracking
- ✅ Export to PDF/Excel
- ✅ Visual charts & graphs

### **4. Flexible Return System**
- ✅ Full & partial returns
- ✅ Approval workflow
- ✅ Return tracking
- ✅ Stock auto-adjustment

### **5. Mobile-First Design**
- ✅ Optimized for touch screens
- ✅ Fast & responsive
- ✅ Works on any device
- ✅ Native Android app available

### **6. Easy Distribution**
- ✅ Quick product distribution
- ✅ Bulk operations
- ✅ Distribution history
- ✅ Stock validation

### **7. GPS Integration**
- ✅ Auto-capture location
- ✅ Tracking history
- ✅ Compliance & monitoring
- ✅ Route optimization (planned)

### **8. User-Friendly Interface**
- ✅ Intuitive design
- ✅ Minimal training needed
- ✅ Fast operations
- ✅ Modern look & feel

---

## 🆚 Competitive Advantages

### **vs Traditional POS:**
| Feature | BK-POS | Traditional POS |
|---------|--------|-----------------|
| Multi-device | ✅ Ya | ❌ Tidak |
| GPS Tracking | ✅ Ya | ❌ Tidak |
| Cloud-based | ✅ Ya | ❌ Tidak |
| Real-time sync | ✅ Ya | ❌ Tidak |
| Mobile app | ✅ Ya | ❌ Tidak |
| Auto-updates | ✅ Ya | ❌ Tidak |
| Distribution system | ✅ Ya | ❌ Tidak |

### **vs Other Cloud POS:**
- ✅ **Specialized** untuk bisnis dengan rider/delivery
- ✅ **GPS tracking** built-in
- ✅ **Return workflow** yang sophisticated
- ✅ **Distribution management** yang powerful
- ✅ **Harga terjangkau** (no hidden costs)
- ✅ **Customizable** sesuai kebutuhan

---

## 💡 Use Cases

### **1. Warung Kopi Keliling**
```
Setup:
- 1 Admin (owner)
- 5 Rider (penjual keliling)
- 15 Produk (kopi, teh, snack)

Daily Operations:
- Pagi: Admin distribusi stock ke 5 rider
- Siang: Rider jual pakai POS mobile
- Sore: Rider return sisa stock
- Malam: Admin cek laporan penjualan
```

### **2. Distributor Minuman**
```
Setup:
- 1 Admin
- 10 Rider (sales force)
- 50 Produk (berbagai minuman)

Daily Operations:
- Distribusi produk ke rider
- Rider visit customer & POS
- GPS tracking untuk monitoring
- Return produk expired/rusak
- Report harian sales performance
```

### **3. UMKM Retail**
```
Setup:
- 2 Admin (owner + manager)
- 8 Rider (delivery staff)
- 100+ Produk

Daily Operations:
- Multi-admin collaboration
- Bulk distribution
- Real-time stock monitoring
- Advanced analytics
- Weekly/monthly reports
```

---

## 📈 Scalability

### **Current Capacity:**
- ✅ Unlimited products
- ✅ Unlimited riders
- ✅ Unlimited transactions
- ✅ Unlimited users (with Supabase limits)

### **Performance:**
- ✅ Fast query dengan indexing
- ✅ Optimized React rendering
- ✅ Lazy loading untuk images
- ✅ Pagination untuk large data

### **Future Scaling:**
- ✅ Ready for multi-tenant (SaaS)
- ✅ API-ready untuk integrations
- ✅ Microservices architecture ready
- ✅ CDN untuk static assets

---

## 🔄 Recent Updates (Latest Features)

### **v1.0.9 (November 2025)**

**✨ New Features:**
1. ✅ **Improved Return UX**
   - Auto-select input saat focus
   - Input bisa dikosongkan temporary
   - Circle checkbox di mobile
   - Tombol "Return Semua Produk"

2. ✅ **Enhanced PDF Reports**
   - Product breakdown per transaksi
   - Separated cup count vs Add On count
   - Better visual layout
   - Detailed product info

3. ✅ **Better Charts**
   - Gradient styling
   - Modern tooltips
   - Responsive design
   - Better color coding

4. ✅ **Return Product Fixes**
   - Support partial return
   - Validation improvements
   - Stock auto-adjustment
   - Approval workflow

5. ✅ **SQL Cleanup Scripts**
   - Data cleanup untuk October 2025
   - Safe backup before delete
   - Step-by-step guide
   - Restore capability

---

## 📚 Documentation & Support

### **Available Docs:**
- ✅ README.md (Quick start)
- ✅ SETUP-COMPLETE.md (Setup guide)
- ✅ DEPLOYMENT-GUIDE.md (Deploy guide)
- ✅ CLEANUP-DATA-GUIDE.md (Data cleanup)
- ✅ FIX-RETURN-STOCK-RESET.md (Return fixes)
- ✅ QUICK-BUILD-APK.md (APK build)

### **Code Documentation:**
- ✅ TypeScript types
- ✅ Component documentation
- ✅ SQL scripts dengan comments
- ✅ Inline code comments

### **Support Channels:**
- 📧 Email support (coming soon)
- 💬 GitHub Issues
- 📖 Documentation wiki (planned)

---

## 🎯 Roadmap & Future Features

### **Short Term (1-3 Months):**
- [ ] Email notifications
- [ ] Push notifications (mobile)
- [ ] Offline mode
- [ ] Advanced filters
- [ ] Export to CSV

### **Medium Term (3-6 Months):**
- [ ] Multi-tenant / SaaS mode
- [ ] Subscription system
- [ ] Payment gateway integration
- [ ] WhatsApp integration
- [ ] Advanced analytics dashboard

### **Long Term (6-12 Months):**
- [ ] Mobile app (iOS)
- [ ] API untuk third-party
- [ ] Multi-branch support
- [ ] Inventory forecasting
- [ ] AI-powered insights

---

## 💼 Business Model (Potential)

### **Current: Single Tenant**
- One instance per business
- Self-hosted or cloud
- One-time setup fee

### **Future: SaaS (Multi-Tenant)**
```
Pricing Plans:

Free Trial
- 14 days free
- 2 riders max
- Basic features

Basic - Rp 199K/month
- 5 riders
- Unlimited products
- Basic reports
- Email support

Pro - Rp 399K/month
- Unlimited riders
- GPS tracking
- Advanced reports
- Priority support
- PDF/Excel export

Enterprise - Custom
- Multi-branch
- API access
- Custom features
- Dedicated support
```

---

## 📄 License

**Proprietary Software**
- © 2025 BK-POS
- All rights reserved
- Contact for licensing

---

## 👥 Credits

**Development Team:**
- Developer: BasmiKuman
- UI/UX Design: Custom design with Shadcn/ui
- Database: Supabase
- Icons: Lucide Icons

**Technologies:**
- React Team
- Supabase Team
- Capacitor Team
- Shadcn/ui Contributors

---

## 📞 Contact

**Project Repository:**
- GitHub: BasmiKuman/V.3-Lovable-POS-kxauidotesbcuypuokal

**Support:**
- Issues: GitHub Issues
- Email: (coming soon)

---

## 🎉 Conclusion

**BK-POS** adalah solusi POS modern yang **powerful, scalable, dan user-friendly** untuk bisnis distribusi dengan model rider/delivery. 

### **Mengapa Pilih BK-POS?**

✅ **Complete Solution** - Semua yang Anda butuhkan dalam 1 sistem
✅ **Modern Technology** - Tech stack terbaru dan terbaik
✅ **Mobile-First** - Optimized untuk penggunaan di lapangan
✅ **Scalable** - Tumbuh bersama bisnis Anda
✅ **Secure** - Data aman dengan RLS dan encryption
✅ **Affordable** - Biaya terjangkau untuk UMKM

### **Perfect For:**
- 🏪 Warung/kedai dengan delivery
- 🚚 Bisnis distribusi produk
- 📦 UMKM dengan sales force
- ☕ Coffee shop dengan rider
- 🥤 Distributor minuman

---

**Version:** 1.0.9  
**Last Updated:** November 3, 2025  
**Status:** Production Ready ✅

import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale/id';

// Sample data
const riders = [
  { user_id: "rider-1", full_name: "Budi Santoso" },
  { user_id: "rider-2", full_name: "Ani Wijaya" },
  { user_id: "rider-3", full_name: "Candra Pratama" }
];

const products = [
  { id: "prod-1", name: "Es Teh Manis", sku: "ETM-001", price: 5000 },
  { id: "prod-2", name: "Kopi Susu", sku: "KS-002", price: 8000 },
  { id: "prod-3", name: "Air Mineral", sku: "AM-003", price: 3000 },
  { id: "prod-4", name: "Jeruk Peras", sku: "JP-004", price: 7000 },
  { id: "prod-5", name: "Teh Tarik", sku: "TT-005", price: 6000 }
];

// Generate sample transactions
const transactions = [];
const startDate = new Date(2025, 9, 1); // Oct 1, 2025
const endDate = new Date(2025, 9, 28); // Oct 28, 2025

let transactionId = 1;
for (let day = 1; day <= 28; day++) {
  const date = new Date(2025, 9, day);
  const numTransactions = Math.floor(Math.random() * 8) + 3; // 3-10 transactions per day
  
  for (let i = 0; i < numTransactions; i++) {
    const rider = riders[Math.floor(Math.random() * riders.length)];
    const numItems = Math.floor(Math.random() * 4) + 1; // 1-4 items per transaction
    const items = [];
    let subtotal = 0;
    
    for (let j = 0; j < numItems; j++) {
      const product = products[Math.floor(Math.random() * products.length)];
      const quantity = Math.floor(Math.random() * 3) + 1; // 1-3 quantity
      const itemSubtotal = product.price * quantity;
      
      items.push({
        product_id: product.id,
        products: product,
        quantity: quantity,
        price: product.price,
        subtotal: itemSubtotal
      });
      
      subtotal += itemSubtotal;
    }
    
    const taxAmount = Math.round(subtotal * 0.1);
    const totalAmount = subtotal + taxAmount;
    
    const hour = 8 + Math.floor(Math.random() * 12); // 8 AM - 8 PM
    const minute = Math.floor(Math.random() * 60);
    date.setHours(hour, minute, 0);
    
    transactions.push({
      id: `trans-${transactionId++}`,
      created_at: date.toISOString(),
      rider_id: rider.user_id,
      rider: rider,
      payment_method: ["cash", "qris", "transfer"][Math.floor(Math.random() * 3)],
      subtotal: subtotal,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      notes: Math.random() > 0.7 ? "Pesanan khusus" : "",
      transaction_items: items
    });
  }
}

// Calculate stats
const stats = {
  totalSales: transactions.reduce((sum, t) => sum + t.total_amount, 0),
  totalTransactions: transactions.length,
  avgTransaction: transactions.reduce((sum, t) => sum + t.total_amount, 0) / transactions.length,
  totalTax: transactions.reduce((sum, t) => sum + t.tax_amount, 0)
};

console.log('Sample Data Generated:');
console.log('- Total Transactions:', transactions.length);
console.log('- Total Sales: Rp', stats.totalSales.toLocaleString('id-ID'));
console.log('- Date Range:', format(startDate, 'dd MMM yyyy') + ' - ' + format(endDate, 'dd MMM yyyy'));
console.log('\nGenerating Excel files...\n');

// ========================================
// GENERATE LAPORAN KESELURUHAN RIDER
// ========================================

const workbookAll = XLSX.utils.book_new();

// 1. RINGKASAN KESELURUHAN
const totalCupsSold = transactions.reduce((sum, t) => {
  return sum + t.transaction_items.reduce((itemSum, item) => itemSum + item.quantity, 0);
}, 0);

const overallSummary = [
  { "": "RINGKASAN KESELURUHAN PENJUALAN" },
  { "": "" },
  { "Deskripsi": "Periode Laporan", "Nilai": `${format(startDate, "dd MMM yyyy")} - ${format(endDate, "dd MMM yyyy")}` },
  { "Deskripsi": "Total Cup/Produk Terjual", "Nilai": totalCupsSold },
  { "Deskripsi": "Total Transaksi", "Nilai": stats.totalTransactions },
  { "Deskripsi": "Total Penjualan (Rp)", "Nilai": stats.totalSales },
  { "Deskripsi": "Total Pajak (Rp)", "Nilai": stats.totalTax },
  { "Deskripsi": "Rata-rata per Transaksi (Rp)", "Nilai": Math.round(stats.avgTransaction) },
  { "": "" },
  { "": "Detail per Rider:" }
];

riders.forEach(rider => {
  const riderTransactions = transactions.filter(t => t.rider_id === rider.user_id);
  const riderCups = riderTransactions.reduce((sum, t) => {
    return sum + t.transaction_items.reduce((itemSum, item) => itemSum + item.quantity, 0);
  }, 0);
  const totalSales = riderTransactions.reduce((sum, t) => sum + t.total_amount, 0);
  
  overallSummary.push({
    "Deskripsi": `  • ${rider.full_name}`,
    "Nilai": `${riderCups} cup | Rp ${totalSales.toLocaleString('id-ID')}`
  });
});

const summarySheet = XLSX.utils.json_to_sheet(overallSummary);
summarySheet['!cols'] = [{ wch: 35 }, { wch: 40 }];
XLSX.utils.book_append_sheet(workbookAll, summarySheet, "Ringkasan Keseluruhan");

// 2. AKUMULASI PRODUK
const productSummary = transactions.reduce((acc, transaction) => {
  transaction.transaction_items.forEach((item) => {
    const productName = item.products.name;
    const existing = acc.find(p => p.product === productName);
    
    if (existing) {
      existing.quantity += item.quantity;
      existing.total += item.subtotal;
    } else {
      acc.push({
        product: productName,
        sku: item.products.sku,
        quantity: item.quantity,
        price: item.price,
        total: item.subtotal
      });
    }
  });
  return acc;
}, []);

const productData = productSummary
  .sort((a, b) => b.quantity - a.quantity)
  .map(p => ({
    "Nama Produk": p.product,
    "SKU": p.sku,
    "Total Cup Terjual": p.quantity,
    "Harga Satuan (Rp)": p.price,
    "Total Penjualan (Rp)": p.total
  }));

const productSheet = XLSX.utils.json_to_sheet(productData);
productSheet['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 18 }, { wch: 18 }, { wch: 20 }];
XLSX.utils.book_append_sheet(workbookAll, productSheet, "Akumulasi Produk");

// 3. DETAIL PER RIDER
riders.forEach(rider => {
  const riderTransactions = transactions.filter(t => t.rider_id === rider.user_id);
  
  if (riderTransactions.length === 0) return;

  const riderData = [];
  
  riderData.push({ "": `LAPORAN RIDER: ${rider.full_name.toUpperCase()}` });
  riderData.push({ "": "" });

  const riderTotalSales = riderTransactions.reduce((sum, t) => sum + t.total_amount, 0);
  const riderTotalTax = riderTransactions.reduce((sum, t) => sum + t.tax_amount, 0);
  const riderTotalCups = riderTransactions.reduce((sum, t) => {
    return sum + t.transaction_items.reduce((itemSum, item) => itemSum + item.quantity, 0);
  }, 0);

  riderData.push({ "Statistik": "Total Transaksi", "Nilai": riderTransactions.length });
  riderData.push({ "Statistik": "Total Cup Terjual", "Nilai": riderTotalCups });
  riderData.push({ "Statistik": "Total Penjualan (Rp)", "Nilai": riderTotalSales });
  riderData.push({ "Statistik": "Total Pajak (Rp)", "Nilai": riderTotalTax });
  riderData.push({ "": "" });
  riderData.push({ "": "PRODUK YANG TERJUAL:" });
  riderData.push({ "": "" });

  const riderProducts = riderTransactions.reduce((acc, transaction) => {
    transaction.transaction_items.forEach((item) => {
      const productName = item.products.name;
      const existing = acc.find(p => p.name === productName);
      
      if (existing) {
        existing.quantity += item.quantity;
        existing.total += item.subtotal;
      } else {
        acc.push({
          name: productName,
          sku: item.products.sku,
          quantity: item.quantity,
          price: item.price,
          total: item.subtotal
        });
      }
    });
    return acc;
  }, []);

  riderProducts
    .sort((a, b) => b.quantity - a.quantity)
    .forEach(product => {
      riderData.push({
        "Produk": product.name,
        "SKU": product.sku,
        "Jumlah": product.quantity,
        "Harga": product.price,
        "Total (Rp)": product.total
      });
    });

  riderData.push({ "": "" });
  riderData.push({ "": "RINCIAN TRANSAKSI:" });
  riderData.push({ "": "" });

  riderTransactions.forEach(t => {
    riderData.push({
      "Tanggal": format(new Date(t.created_at), "dd/MM/yyyy HH:mm"),
      "Metode": t.payment_method,
      "Subtotal": t.subtotal,
      "Pajak": t.tax_amount,
      "Total": t.total_amount,
      "Catatan": t.notes || "-"
    });
  });

  const riderSheet = XLSX.utils.json_to_sheet(riderData);
  riderSheet['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 18 }, { wch: 20 }];
  
  const sheetName = rider.full_name.substring(0, 28);
  XLSX.utils.book_append_sheet(workbookAll, riderSheet, sheetName);
});

// 4. SEMUA TRANSAKSI
const allTransactionsData = transactions.map(t => ({
  "Tanggal": format(new Date(t.created_at), "dd/MM/yyyy HH:mm"),
  "Rider": t.rider.full_name,
  "Metode Pembayaran": t.payment_method,
  "Subtotal": t.subtotal,
  "Pajak": t.tax_amount,
  "Total": t.total_amount,
  "Catatan": t.notes || "-"
}));

const allTransactionsSheet = XLSX.utils.json_to_sheet(allTransactionsData);
allTransactionsSheet['!cols'] = [{ wch: 18 }, { wch: 20 }, { wch: 18 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 25 }];
XLSX.utils.book_append_sheet(workbookAll, allTransactionsSheet, "Semua Transaksi");

// 5. DETAIL ITEM
const allItemsData = [];
transactions.forEach(t => {
  t.transaction_items.forEach((item) => {
    allItemsData.push({
      "Tanggal": format(new Date(t.created_at), "dd/MM/yyyy HH:mm"),
      "Rider": t.rider.full_name,
      "Produk": item.products.name,
      "SKU": item.products.sku,
      "Jumlah": item.quantity,
      "Harga Satuan": item.price,
      "Subtotal": item.subtotal
    });
  });
});

const itemsSheet = XLSX.utils.json_to_sheet(allItemsData);
itemsSheet['!cols'] = [{ wch: 18 }, { wch: 20 }, { wch: 25 }, { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 15 }];
XLSX.utils.book_append_sheet(workbookAll, itemsSheet, "Detail Item");

// Save file
const fileName1 = `Sample-Laporan-Keseluruhan-${format(startDate, "yyyyMMdd")}-${format(endDate, "yyyyMMdd")}.xlsx`;
XLSX.writeFile(workbookAll, fileName1);
console.log('✅ Generated:', fileName1);

// ========================================
// GENERATE LAPORAN PER RIDER (Budi Santoso)
// ========================================

const selectedRider = riders[0]; // Budi Santoso
const riderTransactions = transactions.filter(t => t.rider_id === selectedRider.user_id);

const workbookRider = XLSX.utils.book_new();

// Calculate rider stats
const riderStats = {
  totalSales: riderTransactions.reduce((sum, t) => sum + t.total_amount, 0),
  totalTransactions: riderTransactions.length,
  avgTransaction: riderTransactions.reduce((sum, t) => sum + t.total_amount, 0) / riderTransactions.length,
  totalTax: riderTransactions.reduce((sum, t) => sum + t.tax_amount, 0)
};

const riderTotalCups = riderTransactions.reduce((sum, t) => {
  return sum + t.transaction_items.reduce((itemSum, item) => itemSum + item.quantity, 0);
}, 0);

// 1. RINGKASAN RIDER
const riderSummary = [
  { "": "LAPORAN PENJUALAN RIDER" },
  { "": "" },
  { "Deskripsi": "Nama Rider", "Nilai": selectedRider.full_name },
  { "Deskripsi": "Periode", "Nilai": `${format(startDate, "dd MMM yyyy")} - ${format(endDate, "dd MMM yyyy")}` },
  { "": "" },
  { "": "STATISTIK PENJUALAN:" },
  { "Deskripsi": "Total Cup/Produk Terjual", "Nilai": riderTotalCups },
  { "Deskripsi": "Total Transaksi", "Nilai": riderStats.totalTransactions },
  { "Deskripsi": "Total Penjualan (Rp)", "Nilai": riderStats.totalSales },
  { "Deskripsi": "Total Pajak (Rp)", "Nilai": riderStats.totalTax },
  { "Deskripsi": "Rata-rata per Transaksi (Rp)", "Nilai": Math.round(riderStats.avgTransaction) }
];

const riderSummarySheet = XLSX.utils.json_to_sheet(riderSummary);
riderSummarySheet['!cols'] = [{ wch: 30 }, { wch: 35 }];
XLSX.utils.book_append_sheet(workbookRider, riderSummarySheet, "Ringkasan");

// 2. PRODUK YANG TERJUAL
const productsData = riderTransactions.reduce((acc, transaction) => {
  transaction.transaction_items.forEach((item) => {
    const productName = item.products.name;
    const existing = acc.find(p => p.name === productName);
    
    if (existing) {
      existing.quantity += item.quantity;
      existing.total += item.subtotal;
      existing.transactions += 1;
    } else {
      acc.push({
        name: productName,
        sku: item.products.sku,
        quantity: item.quantity,
        price: item.price,
        total: item.subtotal,
        transactions: 1
      });
    }
  });
  return acc;
}, []);

const productsSheetData = XLSX.utils.json_to_sheet(
  productsData
    .sort((a, b) => b.quantity - a.quantity)
    .map(p => ({
      "Nama Produk": p.name,
      "SKU": p.sku,
      "Total Cup Terjual": p.quantity,
      "Harga Satuan (Rp)": p.price,
      "Total Penjualan (Rp)": p.total,
      "Jumlah Transaksi": p.transactions
    }))
);
productsSheetData['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 18 }, { wch: 18 }, { wch: 20 }, { wch: 18 }];
XLSX.utils.book_append_sheet(workbookRider, productsSheetData, "Produk Terjual");

// 3. RINCIAN TRANSAKSI
const transactionData = riderTransactions.map(t => ({
  "Tanggal": format(new Date(t.created_at), "dd/MM/yyyy HH:mm"),
  "Metode Pembayaran": t.payment_method,
  "Jumlah Item": t.transaction_items.reduce((sum, item) => sum + item.quantity, 0),
  "Subtotal (Rp)": t.subtotal,
  "Pajak (Rp)": t.tax_amount,
  "Total (Rp)": t.total_amount,
  "Catatan": t.notes || "-"
}));

const transactionSheet = XLSX.utils.json_to_sheet(transactionData);
transactionSheet['!cols'] = [{ wch: 18 }, { wch: 18 }, { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 25 }];
XLSX.utils.book_append_sheet(workbookRider, transactionSheet, "Rincian Transaksi");

// 4. DETAIL ITEM
const itemsData = [];
riderTransactions.forEach(t => {
  t.transaction_items.forEach((item) => {
    itemsData.push({
      "Tanggal": format(new Date(t.created_at), "dd/MM/yyyy HH:mm"),
      "Produk": item.products.name,
      "SKU": item.products.sku,
      "Jumlah": item.quantity,
      "Harga Satuan (Rp)": item.price,
      "Subtotal (Rp)": item.subtotal
    });
  });
});

const itemsSheetRider = XLSX.utils.json_to_sheet(itemsData);
itemsSheetRider['!cols'] = [{ wch: 18 }, { wch: 25 }, { wch: 15 }, { wch: 10 }, { wch: 18 }, { wch: 15 }];
XLSX.utils.book_append_sheet(workbookRider, itemsSheetRider, "Detail Item");

// 5. TOTAL PERIODE
const periodSummary = [
  { "": "TOTAL KESELURUHAN PER PERIODE" },
  { "": "" },
  { "Metrik": "Total Cup/Produk Terjual", "Jumlah": riderTotalCups, "Satuan": "cup" },
  { "Metrik": "Total Transaksi", "Jumlah": riderStats.totalTransactions, "Satuan": "transaksi" },
  { "Metrik": "Total Penjualan", "Jumlah": riderStats.totalSales, "Satuan": "Rp" },
  { "Metrik": "Total Pajak", "Jumlah": riderStats.totalTax, "Satuan": "Rp" },
  { "Metrik": "Rata-rata per Transaksi", "Jumlah": Math.round(riderStats.avgTransaction), "Satuan": "Rp" },
  { "": "" },
  { "": "Periode Waktu:" },
  { "Metrik": "Tanggal Mulai", "Jumlah": format(startDate, "dd MMMM yyyy"), "Satuan": "" },
  { "Metrik": "Tanggal Selesai", "Jumlah": format(endDate, "dd MMMM yyyy"), "Satuan": "" },
  { "Metrik": "Durasi", "Jumlah": Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)), "Satuan": "hari" }
];

const periodSheet = XLSX.utils.json_to_sheet(periodSummary);
periodSheet['!cols'] = [{ wch: 30 }, { wch: 25 }, { wch: 10 }];
XLSX.utils.book_append_sheet(workbookRider, periodSheet, "Total Periode");

// Save file
const fileName2 = `Sample-Laporan-${selectedRider.full_name.replace(/\s+/g, '-')}-${format(startDate, "yyyyMMdd")}-${format(endDate, "yyyyMMdd")}.xlsx`;
XLSX.writeFile(workbookRider, fileName2);
console.log('✅ Generated:', fileName2);

console.log('\n✨ Sample reports generated successfully!');
console.log('\nFiles created:');
console.log('1.', fileName1);
console.log('2.', fileName2);
console.log('\nYou can now download and open these files in Excel to see the format.');

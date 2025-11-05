import { BottomNav } from "@/components/BottomNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";
import { StatsCard } from "@/components/StatsCard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { BarChart3, DollarSign, ShoppingCart, TrendingUp, Calendar, Download, Filter, ChevronDown, Users, FileText, Package } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { checkStoragePermission, requestStoragePermission } from "@/lib/permissions";
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';

export default function Reports() {
  const isMobile = useIsMobile();
  const [dateRange, setDateRange] = useState({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date())
  });
  const [selectedRider, setSelectedRider] = useState<string>("all");
  const [riders, setRiders] = useState<Array<{ user_id: string; full_name: string }>>([]);
  
  // Applied filters (actual filters used in query)
  const [appliedDateRange, setAppliedDateRange] = useState({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date())
  });
  const [appliedRider, setAppliedRider] = useState<string>("all");

  // Fetch riders list
  useEffect(() => {
    const fetchRiders = async () => {
      const { data: riderRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "rider");

      if (riderRoles && riderRoles.length > 0) {
        const riderIds = riderRoles.map(r => r.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", riderIds);

        if (profiles) {
          setRiders(profiles);
        }
      }
    };

    fetchRiders();
  }, []);

  // Fetch transactions with related data
  const { data: transactions, isLoading } = useQuery({
    queryKey: ["transactions", appliedDateRange, appliedRider],
    queryFn: async () => {
      let query = supabase
        .from("transactions")
        .select("*")
        .gte("created_at", appliedDateRange.start.toISOString())
        .lte("created_at", appliedDateRange.end.toISOString());

      // Apply rider filter if not "all"
      if (appliedRider !== "all") {
        query = query.eq("rider_id", appliedRider);
      }

      const { data: transactionsData, error: transactionsError } = await query
        .order("created_at", { ascending: false });

      if (transactionsError) throw transactionsError;
      if (!transactionsData) return [];

      // Fetch related data
      const riderIds = [...new Set(transactionsData.map(t => t.rider_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", riderIds);

      const { data: items } = await supabase
        .from("transaction_items")
        .select("*, products(name, sku, category_id, categories(name))")
        .in("transaction_id", transactionsData.map(t => t.id));

      // Combine data
      return transactionsData.map(transaction => ({
        ...transaction,
        rider: profiles?.find(p => p.user_id === transaction.rider_id),
        transaction_items: items?.filter(i => i.transaction_id === transaction.id) || []
      }));
    }
  });

  // Calculate statistics
  const stats = {
    totalSales: transactions?.reduce((sum, t) => sum + Number(t.total_amount), 0) || 0,
    totalTransactions: transactions?.length || 0,
    avgTransaction: transactions?.length 
      ? (transactions.reduce((sum, t) => sum + Number(t.total_amount), 0) / transactions.length)
      : 0,
    totalTax: transactions?.reduce((sum, t) => sum + Number(t.tax_amount), 0) || 0
  };

  // Prepare chart data - group by date
  const chartData = transactions?.reduce((acc: any[], transaction) => {
    const date = format(new Date(transaction.created_at), "dd MMM", { locale: idLocale });
    const existing = acc.find(item => item.date === date);
    
    if (existing) {
      existing.total += Number(transaction.total_amount);
      existing.count += 1;
    } else {
      acc.push({
        date,
        total: Number(transaction.total_amount),
        count: 1
      });
    }
    return acc;
  }, []) || [];

  // Top products
  const topProducts = transactions?.reduce((acc: any[], transaction) => {
    transaction.transaction_items?.forEach((item: any) => {
      const existing = acc.find(p => p.id === item.product_id);
      if (existing) {
        existing.quantity += item.quantity;
        existing.total += Number(item.subtotal);
      } else {
        acc.push({
          id: item.product_id,
          name: item.product?.name || "Unknown",
          quantity: item.quantity,
          total: Number(item.subtotal)
        });
      }
    });
    return acc;
  }, [])?.sort((a, b) => b.total - a.total).slice(0, 5) || [];

  // Rider Performance - Group transactions by rider
  const riderPerformance = transactions?.reduce((acc: any[], transaction) => {
    const riderId = transaction.rider_id;
    const existing = acc.find(r => r.riderId === riderId);
    
    if (existing) {
      existing.totalSales += Number(transaction.total_amount);
      existing.totalTransactions += 1;
    } else {
      acc.push({
        riderId: riderId,
        riderName: transaction.rider?.full_name || "Unknown",
        totalSales: Number(transaction.total_amount),
        totalTransactions: 1
      });
    }
    return acc;
  }, [])?.sort((a, b) => b.totalSales - a.totalSales) || [];

  // Group transactions by rider for accordion
  const transactionsByRider = transactions?.reduce((acc: any, transaction) => {
    const riderId = transaction.rider_id;
    const riderName = transaction.rider?.full_name || "Unknown";
    
    if (!acc[riderId]) {
      acc[riderId] = {
        riderName,
        transactions: [],
        totalSales: 0,
        totalTransactions: 0,
        totalCups: 0
      };
    }
    
    acc[riderId].transactions.push(transaction);
    acc[riderId].totalSales += Number(transaction.total_amount);
    acc[riderId].totalTransactions += 1;
    
    // Calculate cups for this transaction (exclude Add On)
    const transactionCups = transaction.transaction_items?.reduce((sum: number, item: any) => {
      const categoryName = item.products?.categories?.name?.toLowerCase() || '';
      const isAddOn = categoryName === 'add on' || categoryName === 'addon' || categoryName === 'add-on';
      return isAddOn ? sum : sum + item.quantity;
    }, 0) || 0;
    
    acc[riderId].totalCups += transactionCups;
    
    return acc;
  }, {} as Record<string, any>);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0
    }).format(value);
  };

  // Helper function to calculate cups (exclude Add On category)
  const calculateCups = (items: any[]) => {
    if (!items) return 0;
    return items.reduce((sum, item) => {
      // Check if product category is "Add On" (case insensitive)
      const categoryName = item.products?.categories?.name?.toLowerCase() || '';
      const isAddOn = categoryName === 'add on' || categoryName === 'addon' || categoryName === 'add-on';
      
      // Only count if NOT Add On
      if (!isAddOn) {
        return sum + item.quantity;
      }
      return sum;
    }, 0);
  };

  // Apply filters
  const applyFilters = () => {
    setAppliedDateRange(dateRange);
    setAppliedRider(selectedRider);
    toast.success("Filter diterapkan");
  };

  // Helper function to save Excel file on mobile
  const saveExcelFile = async (workbook: XLSX.WorkBook, fileName: string) => {
    const isNative = Capacitor.isNativePlatform();
    
    if (isNative) {
      // Android/iOS: Use Capacitor Filesystem
      try {
        // Generate binary data from workbook
        const wbout = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
        
        // Save to Downloads directory
        const result = await Filesystem.writeFile({
          path: fileName,
          data: wbout,
          directory: Directory.Documents, // Documents folder accessible in file manager
          recursive: true
        });
        
        console.log('File saved to:', result.uri);
        
        // Show toast with action button to share/open file
        toast.success(`Laporan berhasil diunduh!`, {
          description: `File: ${fileName}\nKlik "Buka File" untuk melihat`,
          duration: 8000, // 8 detik
          action: {
            label: "Buka File",
            onClick: async () => {
              try {
                // Use Share API to open file with other apps
                await Share.share({
                  title: 'Laporan Penjualan',
                  text: 'Buka file laporan dengan aplikasi Excel/Spreadsheet',
                  url: result.uri,
                  dialogTitle: 'Buka dengan aplikasi...'
                });
              } catch (error: any) {
                console.error('Error sharing file:', error);
                
                // If share fails, show helpful message
                if (error.message && error.message.includes('cancelled')) {
                  // User cancelled, do nothing
                  return;
                }
                
                toast.info("File tersimpan di Documents", {
                  description: `Buka File Manager → Documents\nCari file: ${fileName}`,
                  duration: 10000
                });
              }
            }
          }
        });
        
        return true;
      } catch (error: any) {
        console.error('Filesystem write error:', error);
        toast.error("Gagal menyimpan file", {
          description: error.message
        });
        return false;
      }
    } else {
      // Web: Use standard download
      XLSX.writeFile(workbook, fileName);
      toast.success("Laporan berhasil diunduh dalam format Excel");
      return true;
    }
  };

  const downloadReport = async () => {
    try {
      // Check storage permission first
      const hasPermission = await checkStoragePermission();
      if (!hasPermission) {
        const granted = await requestStoragePermission();
        if (!granted) {
          toast.error("Izin penyimpanan diperlukan untuk mengunduh laporan", {
            description: "Silakan aktifkan izin penyimpanan di pengaturan aplikasi"
          });
          return;
        }
      }

      if (!transactions || transactions.length === 0) {
        toast.error("Tidak ada data untuk diunduh");
        return;
      }

      const workbook = XLSX.utils.book_new();

    if (selectedRider === "all") {
      // ========================================
      // LAPORAN KESELURUHAN RIDER
      // ========================================

      // 1. RINGKASAN KESELURUHAN
      const totalCupsSold = transactions.reduce((sum, t) => {
        return sum + (t.transaction_items?.reduce((itemSum: number, item: any) => 
          itemSum + item.quantity, 0) || 0);
      }, 0);

      const overallSummary = [
        { "": "RINGKASAN KESELURUHAN PENJUALAN" },
        { "": "" },
        { "Deskripsi": "Periode Laporan", "Nilai": `${format(dateRange.start, "dd MMM yyyy")} - ${format(dateRange.end, "dd MMM yyyy")}` },
        { "Deskripsi": "Total Cup/Produk Terjual", "Nilai": totalCupsSold },
        { "Deskripsi": "Total Transaksi", "Nilai": stats.totalTransactions },
        { "Deskripsi": "Total Penjualan (Rp)", "Nilai": stats.totalSales },
        { "Deskripsi": "Total Pajak (Rp)", "Nilai": stats.totalTax },
        { "Deskripsi": "Rata-rata per Transaksi (Rp)", "Nilai": Math.round(stats.avgTransaction) },
        { "": "" },
        { "": "Detail per Rider:" }
      ];

      // Add rider summary to overall
      riders.forEach(rider => {
        const riderTransactions = transactions.filter(t => t.rider_id === rider.user_id);
        const riderCups = riderTransactions.reduce((sum, t) => {
          return sum + (t.transaction_items?.reduce((itemSum: number, item: any) => 
            itemSum + item.quantity, 0) || 0);
        }, 0);
        const totalSales = riderTransactions.reduce((sum, t) => sum + Number(t.total_amount), 0);
        
        overallSummary.push({
          "Deskripsi": `  • ${rider.full_name}`,
          "Nilai": `${riderCups} cup | Rp ${totalSales.toLocaleString('id-ID')}`
        });
      });

      const summarySheet = XLSX.utils.json_to_sheet(overallSummary);
      summarySheet['!cols'] = [{ wch: 35 }, { wch: 40 }];
      XLSX.utils.book_append_sheet(workbook, summarySheet, "Ringkasan Keseluruhan");

      // 2. DETAIL PRODUK KESELURUHAN (Akumulasi Cup Terjual)
      const productSummary = transactions.reduce((acc: any, transaction) => {
        transaction.transaction_items?.forEach((item: any) => {
          const productName = item.products?.name || "Unknown";
          const existing = acc.find((p: any) => p.product === productName);
          
          if (existing) {
            existing.quantity += item.quantity;
            existing.total += Number(item.subtotal);
          } else {
            acc.push({
              product: productName,
              sku: item.products?.sku || "-",
              quantity: item.quantity,
              price: Number(item.price),
              total: Number(item.subtotal)
            });
          }
        });
        return acc;
      }, []);

      const productData = productSummary
        .sort((a: any, b: any) => b.quantity - a.quantity)
        .map((p: any) => ({
          "Nama Produk": p.product,
          "SKU": p.sku,
          "Total Cup Terjual": p.quantity,
          "Harga Satuan (Rp)": p.price,
          "Total Penjualan (Rp)": p.total
        }));

      if (productData.length > 0) {
        const productSheet = XLSX.utils.json_to_sheet(productData);
        productSheet['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 18 }, { wch: 18 }, { wch: 20 }];
        XLSX.utils.book_append_sheet(workbook, productSheet, "Akumulasi Produk");
      }

      // 3. DETAIL PER RIDER
      riders.forEach(rider => {
        const riderTransactions = transactions.filter(t => t.rider_id === rider.user_id);
        
        if (riderTransactions.length === 0) return;

        const riderData: any[] = [];
        
        // Header info
        riderData.push({ "": `LAPORAN RIDER: ${rider.full_name.toUpperCase()}` });
        riderData.push({ "": "" });

        // Rider stats
        const riderTotalSales = riderTransactions.reduce((sum, t) => sum + Number(t.total_amount), 0);
        const riderTotalTax = riderTransactions.reduce((sum, t) => sum + Number(t.tax_amount), 0);
        const riderTotalCups = riderTransactions.reduce((sum, t) => {
          return sum + (t.transaction_items?.reduce((itemSum: number, item: any) => 
            itemSum + item.quantity, 0) || 0);
        }, 0);

        riderData.push({ "Statistik": "Total Transaksi", "Nilai": riderTransactions.length });
        riderData.push({ "Statistik": "Total Cup Terjual", "Nilai": riderTotalCups });
        riderData.push({ "Statistik": "Total Penjualan (Rp)", "Nilai": riderTotalSales });
        riderData.push({ "Statistik": "Total Pajak (Rp)", "Nilai": riderTotalTax });
        riderData.push({ "": "" });
        riderData.push({ "": "PRODUK YANG TERJUAL:" });
        riderData.push({ "": "" });

        // Product breakdown for this rider
        const riderProducts = riderTransactions.reduce((acc: any[], transaction) => {
          transaction.transaction_items?.forEach((item: any) => {
            const productName = item.products?.name || "Unknown";
            const existing = acc.find(p => p.name === productName);
            
            if (existing) {
              existing.quantity += item.quantity;
              existing.total += Number(item.subtotal);
            } else {
              acc.push({
                name: productName,
                sku: item.products?.sku || "-",
                quantity: item.quantity,
                price: Number(item.price),
                total: Number(item.subtotal)
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

        // Transaction details
        riderTransactions.forEach(t => {
          riderData.push({
            "Tanggal": format(new Date(t.created_at), "dd/MM/yyyy HH:mm"),
            "Metode": t.payment_method || "-",
            "Subtotal": Number(t.subtotal),
            "Pajak": Number(t.tax_amount),
            "Total": Number(t.total_amount),
            "Catatan": t.notes || "-"
          });
        });

        const riderSheet = XLSX.utils.json_to_sheet(riderData);
        riderSheet['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 18 }, { wch: 20 }];
        
        // Sanitize sheet name (max 31 chars, no special chars)
        const sheetName = rider.full_name.substring(0, 28);
        XLSX.utils.book_append_sheet(workbook, riderSheet, sheetName);
      });

      // 4. SEMUA TRANSAKSI (Raw Data)
      const allTransactionsData = transactions.map(t => ({
        "Tanggal": format(new Date(t.created_at), "dd/MM/yyyy HH:mm"),
        "Rider": t.rider?.full_name || "-",
        "Metode Pembayaran": t.payment_method || "-",
        "Subtotal": Number(t.subtotal),
        "Pajak": Number(t.tax_amount),
        "Total": Number(t.total_amount),
        "Catatan": t.notes || "-"
      }));
      
      const allTransactionsSheet = XLSX.utils.json_to_sheet(allTransactionsData);
      allTransactionsSheet['!cols'] = [{ wch: 18 }, { wch: 20 }, { wch: 18 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 25 }];
      XLSX.utils.book_append_sheet(workbook, allTransactionsSheet, "Semua Transaksi");

      // 5. DETAIL ITEM SEMUA TRANSAKSI
      const allItemsData: any[] = [];
      transactions.forEach(t => {
        t.transaction_items?.forEach((item: any) => {
          allItemsData.push({
            "Tanggal": format(new Date(t.created_at), "dd/MM/yyyy HH:mm"),
            "Rider": t.rider?.full_name || "-",
            "Produk": item.products?.name || "-",
            "SKU": item.products?.sku || "-",
            "Jumlah": item.quantity,
            "Harga Satuan": Number(item.price),
            "Subtotal": Number(item.subtotal)
          });
        });
      });
      
      if (allItemsData.length > 0) {
        const itemsSheet = XLSX.utils.json_to_sheet(allItemsData);
        itemsSheet['!cols'] = [{ wch: 18 }, { wch: 20 }, { wch: 25 }, { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 15 }];
        XLSX.utils.book_append_sheet(workbook, itemsSheet, "Detail Item");
      }

      const fileName = `Laporan-Keseluruhan-${format(dateRange.start, "yyyyMMdd")}-${format(dateRange.end, "yyyyMMdd")}.xlsx`;
      await saveExcelFile(workbook, fileName);

    } else {
      // ========================================
      // LAPORAN PER RIDER
      // ========================================
      
      const riderName = riders.find(r => r.user_id === selectedRider)?.full_name || "Rider";
      
      // Calculate rider stats
      const riderTotalCups = transactions.reduce((sum, t) => {
        return sum + (t.transaction_items?.reduce((itemSum: number, item: any) => 
          itemSum + item.quantity, 0) || 0);
      }, 0);

      // 1. RINGKASAN RIDER
      const riderSummary = [
        { "": "LAPORAN PENJUALAN RIDER" },
        { "": "" },
        { "Deskripsi": "Nama Rider", "Nilai": riderName },
        { "Deskripsi": "Periode", "Nilai": `${format(dateRange.start, "dd MMM yyyy")} - ${format(dateRange.end, "dd MMM yyyy")}` },
        { "": "" },
        { "": "STATISTIK PENJUALAN:" },
        { "Deskripsi": "Total Cup/Produk Terjual", "Nilai": riderTotalCups },
        { "Deskripsi": "Total Transaksi", "Nilai": stats.totalTransactions },
        { "Deskripsi": "Total Penjualan (Rp)", "Nilai": stats.totalSales },
        { "Deskripsi": "Total Pajak (Rp)", "Nilai": stats.totalTax },
        { "Deskripsi": "Rata-rata per Transaksi (Rp)", "Nilai": Math.round(stats.avgTransaction) }
      ];
      
      const summarySheet = XLSX.utils.json_to_sheet(riderSummary);
      summarySheet['!cols'] = [{ wch: 30 }, { wch: 35 }];
      XLSX.utils.book_append_sheet(workbook, summarySheet, "Ringkasan");

      // 2. PRODUK YANG TERJUAL
      const productsData = transactions.reduce((acc: any[], transaction) => {
        transaction.transaction_items?.forEach((item: any) => {
          const productName = item.products?.name || "Unknown";
          const existing = acc.find(p => p.name === productName);
          
          if (existing) {
            existing.quantity += item.quantity;
            existing.total += Number(item.subtotal);
            existing.transactions += 1;
          } else {
            acc.push({
              name: productName,
              sku: item.products?.sku || "-",
              quantity: item.quantity,
              price: Number(item.price),
              total: Number(item.subtotal),
              transactions: 1
            });
          }
        });
        return acc;
      }, []);

      const productsSheet = XLSX.utils.json_to_sheet(
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
      productsSheet['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 18 }, { wch: 18 }, { wch: 20 }, { wch: 18 }];
      XLSX.utils.book_append_sheet(workbook, productsSheet, "Produk Terjual");

      // 3. RINCIAN TRANSAKSI
      const transactionData = transactions.map(t => ({
        "Tanggal": format(new Date(t.created_at), "dd/MM/yyyy HH:mm"),
        "Metode Pembayaran": t.payment_method || "-",
        "Jumlah Item": t.transaction_items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0,
        "Subtotal (Rp)": Number(t.subtotal),
        "Pajak (Rp)": Number(t.tax_amount),
        "Total (Rp)": Number(t.total_amount),
        "Catatan": t.notes || "-"
      }));
      
      const transactionSheet = XLSX.utils.json_to_sheet(transactionData);
      transactionSheet['!cols'] = [{ wch: 18 }, { wch: 18 }, { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 25 }];
      XLSX.utils.book_append_sheet(workbook, transactionSheet, "Rincian Transaksi");

      // 4. DETAIL ITEM PER TRANSAKSI
      const itemsData: any[] = [];
      transactions.forEach(t => {
        t.transaction_items?.forEach((item: any) => {
          itemsData.push({
            "Tanggal": format(new Date(t.created_at), "dd/MM/yyyy HH:mm"),
            "Produk": item.products?.name || "-",
            "SKU": item.products?.sku || "-",
            "Jumlah": item.quantity,
            "Harga Satuan (Rp)": Number(item.price),
            "Subtotal (Rp)": Number(item.subtotal)
          });
        });
      });
      
      if (itemsData.length > 0) {
        const itemsSheet = XLSX.utils.json_to_sheet(itemsData);
        itemsSheet['!cols'] = [{ wch: 18 }, { wch: 25 }, { wch: 15 }, { wch: 10 }, { wch: 18 }, { wch: 15 }];
        XLSX.utils.book_append_sheet(workbook, itemsSheet, "Detail Item");
      }

      // 5. TOTAL KESELURUHAN PER PERIODE
      const periodSummary = [
        { "": "TOTAL KESELURUHAN PER PERIODE" },
        { "": "" },
        { "Metrik": "Total Cup/Produk Terjual", "Jumlah": riderTotalCups, "Satuan": "cup" },
        { "Metrik": "Total Transaksi", "Jumlah": stats.totalTransactions, "Satuan": "transaksi" },
        { "Metrik": "Total Penjualan", "Jumlah": stats.totalSales, "Satuan": "Rp" },
        { "Metrik": "Total Pajak", "Jumlah": stats.totalTax, "Satuan": "Rp" },
        { "Metrik": "Rata-rata per Transaksi", "Jumlah": Math.round(stats.avgTransaction), "Satuan": "Rp" },
        { "": "" },
        { "": "Periode Waktu:" },
        { "Metrik": "Tanggal Mulai", "Jumlah": format(dateRange.start, "dd MMMM yyyy", { locale: idLocale }), "Satuan": "" },
        { "Metrik": "Tanggal Selesai", "Jumlah": format(dateRange.end, "dd MMMM yyyy", { locale: idLocale }), "Satuan": "" },
        { "Metrik": "Durasi", "Jumlah": Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24)), "Satuan": "hari" }
      ];
      
      const periodSheet = XLSX.utils.json_to_sheet(periodSummary);
      periodSheet['!cols'] = [{ wch: 30 }, { wch: 25 }, { wch: 10 }];
      XLSX.utils.book_append_sheet(workbook, periodSheet, "Total Periode");

      const fileName = `Laporan-${riderName.replace(/\s+/g, '-')}-${format(dateRange.start, "yyyyMMdd")}-${format(dateRange.end, "yyyyMMdd")}.xlsx`;
      await saveExcelFile(workbook, fileName);
    }

    } catch (error) {
      console.error('Error downloading report:', error);
      toast.error("Gagal mengunduh laporan. Silakan coba lagi.");
    }
  };

  const downloadPDFReport = async () => {
    try {
      // Check storage permission first
      const hasPermission = await checkStoragePermission();
      if (!hasPermission) {
        const granted = await requestStoragePermission();
        if (!granted) {
          toast.error("Izin penyimpanan diperlukan untuk mengunduh laporan", {
            description: "Silakan aktifkan izin penyimpanan di pengaturan aplikasi"
          });
          return;
        }
      }

      if (!transactions || transactions.length === 0) {
        toast.error("Tidak ada data untuk diunduh");
        return;
      }

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let yPos = 20;

      // Title
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('LAPORAN PENJUALAN', pageWidth / 2, yPos, { align: 'center' });
      
      yPos += 10;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Periode: ${format(dateRange.start, "dd MMM yyyy")} - ${format(dateRange.end, "dd MMM yyyy")}`, pageWidth / 2, yPos, { align: 'center' });

      // ========================================
      // 1. RINGKASAN KESELURUHAN
      // ========================================
      yPos += 15;
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('RINGKASAN KESELURUHAN', 14, yPos);

      yPos += 8;
      
      // Calculate cups (exclude Add On) and add-ons separately
      let totalCupsSold = 0;
      let totalAddOnsSold = 0;
      
      transactions.forEach(t => {
        t.transaction_items?.forEach((item: any) => {
          const categoryName = item.products?.categories?.name?.toLowerCase() || '';
          const isAddOn = categoryName === 'add on' || categoryName === 'addon' || categoryName === 'add-on';
          
          if (isAddOn) {
            totalAddOnsSold += item.quantity;
          } else {
            totalCupsSold += item.quantity;
          }
        });
      });

      const summaryData = [
        ['Total Cup Terjual', `${totalCupsSold} cup`],
        ['Total Add On Terjual', `${totalAddOnsSold} pcs`],
        ['Total Transaksi', stats.totalTransactions.toString()],
        ['Total Penjualan', `Rp ${stats.totalSales.toLocaleString('id-ID')}`],
        ['Total Pajak', `Rp ${stats.totalTax.toLocaleString('id-ID')}`],
        ['Rata-rata per Transaksi', `Rp ${Math.round(stats.avgTransaction).toLocaleString('id-ID')}`],
      ];

      autoTable(doc, {
        startY: yPos,
        head: [['Deskripsi', 'Nilai']],
        body: summaryData,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185], fontSize: 10, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: {
          0: { cellWidth: 100 },
          1: { cellWidth: 70, halign: 'right' }
        }
      });

      // ========================================
      // 2. DETAIL PER RIDER (if all riders selected)
      // ========================================
      if (selectedRider === "all" && riders.length > 0) {
        yPos = (doc as any).lastAutoTable.finalY + 10;
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Detail per Rider:', 14, yPos);
        
        yPos += 6;
        const riderSummaryData = riders.map(rider => {
          const riderTransactions = transactions.filter(t => t.rider_id === rider.user_id);
          
          // Calculate cups (exclude Add On)
          let riderCups = 0;
          riderTransactions.forEach(t => {
            t.transaction_items?.forEach((item: any) => {
              const categoryName = item.products?.categories?.name?.toLowerCase() || '';
              const isAddOn = categoryName === 'add on' || categoryName === 'addon' || categoryName === 'add-on';
              
              if (!isAddOn) {
                riderCups += item.quantity;
              }
            });
          });
          
          const totalSales = riderTransactions.reduce((sum, t) => sum + Number(t.total_amount), 0);
          
          return [
            rider.full_name,
            `${riderCups} cup`,
            `Rp ${totalSales.toLocaleString('id-ID')}`
          ];
        });

        autoTable(doc, {
          startY: yPos,
          head: [['Nama Rider', 'Total Cup', 'Total Penjualan']],
          body: riderSummaryData,
          theme: 'striped',
          headStyles: { fillColor: [52, 152, 219], fontSize: 9, fontStyle: 'bold' },
          styles: { fontSize: 8, cellPadding: 2 },
          columnStyles: {
            0: { cellWidth: 80 },
            1: { cellWidth: 40, halign: 'center' },
            2: { cellWidth: 60, halign: 'right' }
          }
        });
      }

      // ========================================
      // 3. DETAIL TRANSAKSI & PRODUK
      // ========================================
      yPos = (doc as any).lastAutoTable.finalY + 12;
      
      // Check if need new page
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('DETAIL TRANSAKSI & PRODUK', 14, yPos);

      yPos += 6;
      
      // Create detailed transactions with product breakdown
      const detailedTransactionsData: any[] = [];
      
      transactions.forEach((t, index) => {
        // Transaction header row
        const transactionDate = format(new Date(t.created_at), "dd/MM/yy HH:mm");
        const riderName = t.rider?.full_name || "-";
        const paymentMethod = t.payment_method || "-";
        
        // Add transaction header
        detailedTransactionsData.push([
          {
            content: `${transactionDate} | ${riderName} | ${paymentMethod}`,
            colSpan: 4,
            styles: { 
              fillColor: [236, 240, 241], 
              fontStyle: 'bold', 
              fontSize: 7,
              textColor: [44, 62, 80]
            }
          }
        ]);
        
        // Add product items
        if (t.transaction_items && t.transaction_items.length > 0) {
          t.transaction_items.forEach((item: any) => {
            detailedTransactionsData.push([
              `  • ${item.products?.name || 'Unknown'}`,
              `${item.quantity} x`,
              `Rp ${Number(item.price).toLocaleString('id-ID')}`,
              `Rp ${Number(item.subtotal).toLocaleString('id-ID')}`
            ]);
          });
        }
        
        // Add transaction total
        detailedTransactionsData.push([
          {
            content: 'TOTAL',
            colSpan: 3,
            styles: { 
              halign: 'right', 
              fontStyle: 'bold',
              fontSize: 7
            }
          },
          {
            content: `Rp ${Number(t.total_amount).toLocaleString('id-ID')}`,
            styles: { 
              fontStyle: 'bold',
              fillColor: [241, 196, 15],
              textColor: [0, 0, 0],
              fontSize: 7
            }
          }
        ]);
        
        // Add separator between transactions
        if (index < transactions.length - 1) {
          detailedTransactionsData.push([
            { content: '', colSpan: 4, styles: { minCellHeight: 2, fillColor: [255, 255, 255] } }
          ]);
        }
      });

      autoTable(doc, {
        startY: yPos,
        head: [['Produk', 'Qty', 'Harga', 'Subtotal']],
        body: detailedTransactionsData,
        theme: 'striped',
        headStyles: { 
          fillColor: [41, 128, 185], 
          fontSize: 8, 
          fontStyle: 'bold',
          halign: 'left'
        },
        styles: { 
          fontSize: 6.5, 
          cellPadding: 1.5,
          lineColor: [200, 200, 200],
          lineWidth: 0.1
        },
        columnStyles: {
          0: { cellWidth: 80 },
          1: { cellWidth: 25, halign: 'center' },
          2: { cellWidth: 40, halign: 'right' },
          3: { cellWidth: 40, halign: 'right' }
        },
        alternateRowStyles: {
          fillColor: [249, 249, 249]
        }
      });

      // Save PDF
      const fileName = selectedRider === "all" 
        ? `Laporan-Semua-Rider-${format(dateRange.start, "yyyyMMdd")}-${format(dateRange.end, "yyyyMMdd")}.pdf`
        : `Laporan-${riders.find(r => r.user_id === selectedRider)?.full_name.replace(/\s+/g, '-')}-${format(dateRange.start, "yyyyMMdd")}-${format(dateRange.end, "yyyyMMdd")}.pdf`;

      const isNative = Capacitor.isNativePlatform();
      
      if (isNative) {
        // Android/iOS: Save using Filesystem
        const pdfOutput = doc.output('datauristring');
        const base64Data = pdfOutput.split(',')[1]; // Remove data:application/pdf;base64, prefix
        
        const result = await Filesystem.writeFile({
          path: fileName,
          data: base64Data,
          directory: Directory.Documents,
          recursive: true
        });
        
        console.log('PDF saved to:', result.uri);
        
        toast.success(`Laporan PDF berhasil diunduh!`, {
          description: `File: ${fileName}\nKlik "Buka File" untuk melihat`,
          duration: 8000,
          action: {
            label: "Buka File",
            onClick: async () => {
              try {
                await Share.share({
                  title: 'Laporan Penjualan PDF',
                  text: 'Buka file laporan dengan aplikasi PDF Reader',
                  url: result.uri,
                  dialogTitle: 'Buka dengan aplikasi...'
                });
              } catch (error: any) {
                if (error.message && error.message.includes('cancelled')) {
                  return;
                }
                toast.info("File tersimpan di Documents", {
                  description: `Buka File Manager → Documents\nCari file: ${fileName}`,
                  duration: 10000
                });
              }
            }
          }
        });
      } else {
        // Web: Direct download
        doc.save(fileName);
        toast.success("Laporan PDF berhasil diunduh");
      }

    } catch (error) {
      console.error('Error downloading PDF report:', error);
      toast.error("Gagal mengunduh laporan PDF. Silakan coba lagi.");
    }
  };

  return (
    <div 
      className="min-h-screen bg-background w-full overflow-x-hidden"
      style={{
        paddingTop: 'max(1rem, env(safe-area-inset-top, 0px))',
        paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
      }}
    >
      <div className="max-w-screen-xl mx-auto px-3 sm:px-4 space-y-3 sm:space-y-4">
        <div className="space-y-2 sm:space-y-3">
          <div className="flex items-start sm:items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gradient">Laporan</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">Analisis penjualan</p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="flex-shrink-0 w-full sm:w-auto mt-2 sm:mt-0">
                  <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                  <span>Unduh Laporan</span>
                  <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={downloadReport} className="cursor-pointer">
                  <Download className="w-4 h-4 mr-2" />
                  <div className="flex flex-col">
                    <span className="font-medium">Excel (.xlsx)</span>
                    <span className="text-xs text-muted-foreground">Detail lengkap & dokumentasi</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={downloadPDFReport} className="cursor-pointer">
                  <FileText className="w-4 h-4 mr-2" />
                  <div className="flex flex-col">
                    <span className="font-medium">PDF (.pdf)</span>
                    <span className="text-xs text-muted-foreground">Ringkasan Penjualan</span>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="pt-4 sm:pt-6">
              <div className="space-y-3">
                {/* Quick Date Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs sm:text-sm"
                    onClick={() => setDateRange({
                      start: startOfDay(new Date()),
                      end: endOfDay(new Date())
                    })}
                  >
                    <Calendar className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    Hari Ini
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs sm:text-sm"
                    onClick={() => setDateRange({
                      start: startOfMonth(new Date()),
                      end: endOfMonth(new Date())
                    })}
                  >
                    <Calendar className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    Bulan Ini
                  </Button>
                </div>

                {/* Custom Date Range */}
                <div className="flex items-center gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="flex-1 text-xs sm:text-sm">
                        {format(dateRange.start, "dd/MM/yy", { locale: idLocale })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={dateRange.start}
                        onSelect={(date) => date && setDateRange(prev => ({ ...prev, start: startOfDay(date) }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <span className="text-muted-foreground text-xs">s/d</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="flex-1 text-xs sm:text-sm">
                        {format(dateRange.end, "dd/MM/yy", { locale: idLocale })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={dateRange.end}
                        onSelect={(date) => date && setDateRange(prev => ({ ...prev, end: endOfDay(date) }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Rider Filter */}
                <Select value={selectedRider} onValueChange={setSelectedRider}>
                  <SelectTrigger className="w-full text-xs sm:text-sm h-9">
                    <div className="flex items-center gap-2">
                      <Filter className="w-3 h-3 sm:w-4 sm:h-4" />
                      <SelectValue placeholder="Pilih Rider" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Rider</SelectItem>
                    {riders.map((rider) => (
                      <SelectItem key={rider.user_id} value={rider.user_id}>
                        {rider.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Apply Filter Button */}
                <Button 
                  onClick={applyFilters}
                  className="w-full"
                  size="sm"
                >
                  <Filter className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                  Terapkan Filter
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          <StatsCard
            title="Penjualan"
            value={formatCurrency(stats.totalSales)}
            icon={DollarSign}
          />
          <StatsCard
            title="Transaksi"
            value={stats.totalTransactions}
            icon={ShoppingCart}
          />
          <StatsCard
            title="Rata-rata"
            value={formatCurrency(stats.avgTransaction)}
            icon={TrendingUp}
          />
          <StatsCard
            title="Pajak"
            value={formatCurrency(stats.totalTax)}
            icon={BarChart3}
          />
        </div>

        {/* Sales Chart */}
        <Card className="shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Grafik Penjualan
            </CardTitle>
            <CardDescription>
              {format(dateRange.start, "dd MMM yyyy", { locale: idLocale })} - {format(dateRange.end, "dd MMM yyyy", { locale: idLocale })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 rounded-lg pointer-events-none" />
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid 
                      strokeDasharray="3 3" 
                      className="stroke-muted/30" 
                      vertical={false}
                    />
                    <XAxis 
                      dataKey="date" 
                      className="text-xs"
                      tickLine={false}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis 
                      className="text-xs"
                      tickLine={false}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      tickFormatter={(value) => `${(value / 1000)}k`}
                    />
                    <Tooltip
                      formatter={(value: any) => formatCurrency(value)}
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "var(--radius)",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)"
                      }}
                      labelStyle={{ 
                        color: "hsl(var(--foreground))",
                        fontWeight: 600 
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="total" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={3}
                      name="Total Penjualan"
                      dot={{ 
                        fill: "hsl(var(--primary))", 
                        strokeWidth: 2, 
                        r: 4,
                        stroke: "hsl(var(--card))"
                      }}
                      activeDot={{ 
                        r: 6, 
                        stroke: "hsl(var(--card))", 
                        strokeWidth: 3,
                        fill: "hsl(var(--primary))"
                      }}
                      fill="url(#colorTotal)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Tidak ada data untuk ditampilkan</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Rider Performance Chart */}
        <Card className="shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Performance per Rider
            </CardTitle>
            <CardDescription>Tingkat penjualan dari masing-masing rider</CardDescription>
          </CardHeader>
          <CardContent>
            {riderPerformance && riderPerformance.length > 0 ? (
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-primary/5 rounded-lg pointer-events-none" />
                <ResponsiveContainer width="100%" height={isMobile ? 300 : 350}>
                  <BarChart 
                    data={riderPerformance} 
                    margin={{ bottom: isMobile ? 60 : 20, top: 10, right: 10, left: 0 }}
                  >
                    <defs>
                      <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={1}/>
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.6}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid 
                      strokeDasharray="3 3" 
                      className="stroke-muted/30"
                      vertical={false}
                    />
                    <XAxis 
                      dataKey="riderName" 
                      className="text-xs"
                      angle={isMobile ? -45 : 0}
                      textAnchor={isMobile ? "end" : "middle"}
                      height={isMobile ? 80 : 30}
                      tickLine={false}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis 
                      className="text-xs"
                      tickLine={false}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      tickFormatter={(value) => `${(value / 1000)}k`}
                    />
                    <Tooltip
                      formatter={(value: any, name: string) => {
                        if (name === "Total Penjualan") return formatCurrency(value);
                        return value;
                      }}
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "var(--radius)",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)"
                      }}
                      labelStyle={{ 
                        color: "hsl(var(--foreground))",
                        fontWeight: 600
                      }}
                      cursor={{ fill: 'hsl(var(--muted))', opacity: 0.1 }}
                    />
                    <Bar 
                      dataKey="totalSales" 
                      fill="url(#barGradient)" 
                      name="Total Penjualan"
                      radius={[8, 8, 0, 0]}
                      maxBarSize={60}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Tidak ada data rider</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transaction History - Grouped by Rider */}
        <Card>
          <CardHeader>
            <CardTitle>Riwayat Transaksi per Rider</CardTitle>
            <CardDescription>Daftar transaksi dikelompokkan berdasarkan rider</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Memuat data...</div>
            ) : transactionsByRider && Object.keys(transactionsByRider).length > 0 ? (
              <Accordion type="single" collapsible className="w-full">
                {Object.entries(transactionsByRider)
                  .sort(([, a]: any, [, b]: any) => b.totalSales - a.totalSales)
                  .map(([riderId, riderData]: any) => (
                  <AccordionItem key={riderId} value={riderId}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          <span className="font-semibold">{riderData.riderName}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap justify-end">
                          <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10">
                            <Package className="w-3 h-3 text-primary" />
                            <span className="font-semibold text-primary">{riderData.totalCups} cup</span>
                          </div>
                          <span>{riderData.totalTransactions} transaksi</span>
                          <span className="font-semibold text-foreground">
                            {formatCurrency(riderData.totalSales)}
                          </span>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 pt-2">
                        {riderData.transactions.map((transaction: any) => (
                          <div 
                            key={transaction.id} 
                            className="border rounded-lg p-3 hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex justify-between items-start">
                              <div className="space-y-1">
                                <div className="text-sm font-medium">
                                  {format(new Date(transaction.created_at), "dd MMM yyyy HH:mm", { locale: idLocale })}
                                </div>
                                <div className="text-xs text-muted-foreground capitalize">
                                  {transaction.payment_method || "-"}
                                </div>
                                {transaction.transaction_items && transaction.transaction_items.length > 0 && (
                                  <div className="text-xs text-muted-foreground mt-2">
                                    {transaction.transaction_items.map((item: any, idx: number) => (
                                      <div key={idx}>
                                        • {item.products?.name || "Product"} x{item.quantity}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="font-semibold">
                                  {formatCurrency(Number(transaction.total_amount))}
                                </div>
                                {!isMobile && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    Subtotal: {formatCurrency(Number(transaction.subtotal))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Tidak ada transaksi dalam periode ini</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <BottomNav isAdmin={true} />
    </div>
  );
}

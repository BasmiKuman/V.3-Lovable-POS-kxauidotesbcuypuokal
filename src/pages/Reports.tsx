import { BottomNav } from "@/components/BottomNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";
import { StatsCard } from "@/components/StatsCard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { BarChart3, DollarSign, ShoppingCart, TrendingUp, Calendar, Download, Filter } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import * as XLSX from "xlsx";

export default function Reports() {
  const isMobile = useIsMobile();
  const [dateRange, setDateRange] = useState({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date())
  });
  const [selectedRider, setSelectedRider] = useState<string>("all");
  const [riders, setRiders] = useState<Array<{ user_id: string; full_name: string }>>([]);

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
    queryKey: ["transactions", dateRange, selectedRider],
    queryFn: async () => {
      let query = supabase
        .from("transactions")
        .select("*")
        .gte("created_at", dateRange.start.toISOString())
        .lte("created_at", dateRange.end.toISOString());

      // Apply rider filter if not "all"
      if (selectedRider !== "all") {
        query = query.eq("rider_id", selectedRider);
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
        .select("*, products(name, sku)")
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0
    }).format(value);
  };

  const downloadReport = () => {
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
      XLSX.writeFile(workbook, fileName);

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
      XLSX.writeFile(workbook, fileName);
    }

    toast.success("Laporan berhasil diunduh dalam format Excel");
  };

  return (
    <div className="min-h-screen bg-background pb-nav-safe">
      <div className="max-w-screen-xl mx-auto p-2 sm:p-4 space-y-3 sm:space-y-4">
        <div className="space-y-2 sm:space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-3xl font-bold text-gradient truncate">Laporan</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">Analisis penjualan</p>
            </div>
            <Button onClick={downloadReport} size="sm" className="flex-shrink-0">
              <Download className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
              <span className="hidden sm:inline">Unduh</span>
            </Button>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className={`${isMobile ? "flex flex-col" : "flex flex-wrap"} gap-4`}>
                {/* Quick Date Buttons */}
                <div className={`${isMobile ? "grid grid-cols-2" : "flex"} gap-2`}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setDateRange({
                      start: startOfDay(new Date()),
                      end: endOfDay(new Date())
                    })}
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Hari Ini
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setDateRange({
                      start: startOfMonth(new Date()),
                      end: endOfMonth(new Date())
                    })}
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Bulan Ini
                  </Button>
                </div>

                {/* Custom Date Range */}
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm">
                        {format(dateRange.start, "dd MMM yyyy", { locale: idLocale })}
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
                  <span className="flex items-center text-muted-foreground">-</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm">
                        {format(dateRange.end, "dd MMM yyyy", { locale: idLocale })}
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
                  <SelectTrigger className="w-[200px]">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Pilih Rider" />
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
        <Card>
          <CardHeader>
            <CardTitle>Grafik Penjualan</CardTitle>
            <CardDescription>
              {format(dateRange.start, "dd MMM yyyy", { locale: idLocale })} - {format(dateRange.end, "dd MMM yyyy", { locale: idLocale })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    formatter={(value: any) => formatCurrency(value)}
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)"
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="total" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    name="Total Penjualan"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Tidak ada data untuk ditampilkan</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle>Produk Terlaris</CardTitle>
            <CardDescription>5 produk dengan penjualan tertinggi</CardDescription>
          </CardHeader>
          <CardContent>
            {topProducts.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topProducts}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    formatter={(value: any) => formatCurrency(value)}
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)"
                    }}
                  />
                  <Bar dataKey="total" fill="hsl(var(--primary))" name="Total Penjualan" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Tidak ada data produk</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transaction History */}
        <Card>
          <CardHeader>
            <CardTitle>Riwayat Transaksi</CardTitle>
            <CardDescription>Daftar transaksi dalam periode terpilih</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Memuat data...</div>
            ) : transactions && transactions.length > 0 ? (
              <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className={isMobile ? "w-[60%]" : "w-[45%]"}>Info Transaksi</TableHead>
                        {!isMobile && (
                          <>
                            <TableHead>Metode</TableHead>
                            <TableHead className="text-right">Subtotal</TableHead>
                            <TableHead className="text-right">Pajak</TableHead>
                          </>
                        )}
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell>
                            <div className="space-y-1">
                              <div>{format(new Date(transaction.created_at), "dd MMM yyyy HH:mm", { locale: idLocale })}</div>
                              {isMobile && (
                                <>
                                  <div className="text-sm text-muted-foreground">{transaction.rider?.full_name || "-"}</div>
                                  <div className="text-sm text-muted-foreground capitalize">{transaction.payment_method || "-"}</div>
                                </>
                              )}
                            </div>
                          </TableCell>
                          {!isMobile && (
                            <>
                              <TableCell>{transaction.rider?.full_name || "-"}</TableCell>
                              <TableCell className="capitalize">{transaction.payment_method || "-"}</TableCell>
                              <TableCell className="text-right">{formatCurrency(Number(transaction.subtotal))}</TableCell>
                              <TableCell className="text-right">{formatCurrency(Number(transaction.tax_amount))}</TableCell>
                            </>
                          )}
                          <TableCell className="text-right font-semibold">
                            {formatCurrency(Number(transaction.total_amount))}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
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

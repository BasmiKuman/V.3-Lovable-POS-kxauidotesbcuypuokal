// @ts-nocheck - Temporarily disable type checking for new end_of_day tables
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calendar, Save, Send, RotateCcw, AlertTriangle, CheckCircle, Loader2, FileText, Download, Plus, Minus } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import * as XLSX from "xlsx";

type Rider = {
  id: string;
  name: string;
};

type ProductItem = {
  id: string;
  name: string;
  category?: string;
  distributed: number;
  pos: number;
  remaining: number;
};

type HistoryRecord = {
  id: string;
  date: string;
  rider: string;
  distributed: number;
  totalSold: number;
  pos: number;
  adjustment: number;
  status: string;
};

export default function EndOfDayTab() {
  const [riders, setRiders] = useState<Rider[]>([]);
  const [selectedRider, setSelectedRider] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState("");
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [reportId, setReportId] = useState<string | null>(null);
  const [status, setStatus] = useState<"draft" | "submitted">("draft");
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadRiders();
    loadHistory();
  }, []);

  useEffect(() => {
    if (selectedRider && selectedDate) {
      loadReportData();
    }
  }, [selectedRider, selectedDate]);

  const loadRiders = async () => {
    try {
      // Get rider user_ids from user_roles
      const { data: riderRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "rider");

      console.log("Rider roles:", riderRoles);

      if (rolesError) throw rolesError;

      if (!riderRoles || riderRoles.length === 0) {
        console.log("No riders found in user_roles");
        setRiders([]);
        return;
      }

      // Get profiles for those user_ids
      const riderIds = riderRoles.map((r) => r.user_id);
      console.log("Rider IDs:", riderIds);

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", riderIds);

      console.log("Profiles:", profiles);

      if (profilesError) {
        console.error("Error loading profiles:", profilesError);
        toast.error("Gagal memuat data rider: " + profilesError.message);
        return;
      }

      // If no profiles found, show error
      if (!profiles || profiles.length === 0) {
        console.log("No profiles found for riders");
        toast.error("Tidak ada profil rider yang ditemukan. Silakan tambahkan profil untuk rider terlebih dahulu.");
        setRiders([]);
        return;
      }

      const riderList = profiles.map((profile: any) => ({
        id: profile.user_id,
        name: profile.full_name || `Rider ${profile.user_id.substring(0, 8)}...`,
      }));

      console.log("Final rider list:", riderList);
      setRiders(riderList);
    } catch (error: any) {
      console.error("Error loading riders:", error);
      toast.error("Gagal memuat data rider");
    }
  };

  const loadHistory = async () => {
    try {
      // @ts-ignore - New tables not in types yet
      const { data, error } = await supabase
        .from("end_of_day_reports")
        .select(`
          id,
          report_date,
          status,
          rider_id,
          end_of_day_items(
            distributed_quantity,
            sold_quantity,
            pos_quantity,
            adjustment_quantity
          )
        `)
        .order("report_date", { ascending: false })
        .limit(10);

      if (error) throw error;

      // Get rider names separately
      const riderIds = [...new Set(data.map((r: any) => r.rider_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", riderIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

      const historyData: HistoryRecord[] = data.map((record: any) => {
        const totalDistributed = record.end_of_day_items.reduce((sum: number, item: any) => sum + item.distributed_quantity, 0);
        const totalSold = record.end_of_day_items.reduce((sum: number, item: any) => sum + item.sold_quantity, 0);
        const totalPOS = record.end_of_day_items.reduce((sum: number, item: any) => sum + item.pos_quantity, 0);
        const totalAdjustment = record.end_of_day_items.reduce((sum: number, item: any) => sum + item.adjustment_quantity, 0);

        return {
          id: record.id,
          date: record.report_date,
          rider: profileMap.get(record.rider_id) || "Unknown",
          distributed: totalDistributed,
          totalSold,
          pos: totalPOS,
          adjustment: totalAdjustment,
          status: record.status,
        };
      });

      setHistory(historyData);
    } catch (error: any) {
      console.error("Error loading history:", error);
    }
  };

  const loadReportData = async () => {
    try {
      setLoadingData(true);

      // Check if report exists
      // @ts-ignore - New tables not in types yet
      const { data: existingReport, error: reportError } = await supabase
        .from("end_of_day_reports")
        .select(`
          id,
          status,
          notes,
          end_of_day_items(*)
        `)
        .eq("rider_id", selectedRider)
        .eq("report_date", selectedDate)
        .maybeSingle();

      if (reportError && reportError.code !== 'PGRST116') throw reportError;

      if (existingReport) {
        // Load existing report
        setReportId(existingReport.id);
        setStatus(existingReport.status as "draft" | "submitted");
        setNotes(existingReport.notes || "");
        
        // Notify user that draft was loaded
        if (existingReport.status === 'draft') {
          toast.info(`Draft ditemukan untuk rider ini pada tanggal ${selectedDate}. Anda bisa melanjutkan atau mengubah data.`);
        } else {
          toast.info(`Laporan untuk rider ini pada tanggal ${selectedDate} sudah di-submit dan tidak bisa diubah.`);
        }

        const productsData = await Promise.all(
          existingReport.end_of_day_items.map(async (item: any) => {
            const { data: product } = await supabase
              .from("products")
              .select("name")
              .eq("id", item.product_id)
              .single();

            return {
              id: item.product_id,
              name: product?.name || "Unknown",
              distributed: item.distributed_quantity,
              pos: item.pos_quantity,
              remaining: item.remaining_quantity,
            };
          })
        );

        setProducts(productsData);
      } else {
        // Load new report data
        await loadDistributedProducts();
      }
    } catch (error: any) {
      console.error("Error loading report data:", error);
      toast.error("Gagal memuat data laporan");
    } finally {
      setLoadingData(false);
    }
  };

  const loadDistributedProducts = async () => {
    try {
      // Get all products that rider has (including 0 quantity for complete tracking)
      // Exclude Add-On category as they're not counted in cups
      const { data: riderStock, error: stockError } = await supabase
        .from("rider_stock")
        .select(`
          product_id,
          quantity,
          products(
            id, 
            name,
            categories(name)
          )
        `)
        .eq("rider_id", selectedRider)
        .gte("quantity", 0); // Include 0 to show all products

      if (stockError) throw stockError;

      // Don't filter here - show ALL products in the table
      // Category-based cup counting is handled in total calculations
      if (!riderStock || riderStock.length === 0) {
        toast.info("Tidak ada stock untuk rider ini");
        setProducts([]);
        setReportId(null);
        setStatus("draft");
        setNotes("");
        return;
      }

      // Get distributions for today (to show as reference)
      const { data: distributions } = await supabase
        .from("distributions")
        .select("product_id, quantity")
        .eq("rider_id", selectedRider)
        .gte("distributed_at", `${selectedDate}T00:00:00`)
        .lte("distributed_at", `${selectedDate}T23:59:59`);

      // Map distributions by product
      const distributionMap = new Map<string, number>();
      distributions?.forEach((dist: any) => {
        const existing = distributionMap.get(dist.product_id) || 0;
        distributionMap.set(dist.product_id, existing + dist.quantity);
      });

      // Get POS quantities for today
      const productsData = await Promise.all(
        riderStock.map(async (stock: any) => {
          // @ts-ignore - New RPC function not in types yet
          const { data: posQuantity } = await supabase.rpc("get_pos_quantity", {
            p_rider_id: selectedRider,
            p_product_id: stock.product_id,
            p_date: selectedDate,
          });

          // Calculate starting stock: Current Stock + POS (transactions reduce stock, so add them back)
          // This gives us the stock the rider had at START of day
          const currentStock = stock.quantity || 0;
          const pos = posQuantity || 0;
          const startingStock = currentStock + pos;

          return {
            id: stock.product_id,
            name: stock.products.name,
            category: stock.products?.categories?.name || "Unknown",
            distributed: startingStock, // STOK AWAL HARI = Stok Sekarang + Terjual Hari Ini
            pos: pos,
            remaining: 0, // Will be input by admin
          };
        })
      );

      setProducts(productsData);
      setReportId(null);
      setStatus("draft");
      setNotes("");
    } catch (error: any) {
      console.error("Error loading distributed products:", error);
      toast.error("Gagal memuat data distribusi");
    }
  };

  const updateRemaining = (productId: string, value: string) => {
    const numValue = parseInt(value) || 0;
    setProducts(products.map(p => 
      p.id === productId 
        ? { ...p, remaining: numValue }
        : p
    ));
  };

  const calculateSold = (distributed: number, remaining: number) => {
    return distributed - remaining;
  };

  const calculateAdjustment = (distributed: number, remaining: number, pos: number) => {
    const sold = distributed - remaining;
    return sold - pos;
  };

  const handleSaveDraft = async () => {
    try {
      setLoading(true);

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("User not authenticated");

      if (reportId) {
        // Update existing draft
        // @ts-ignore - New tables not in types yet
        const { error: updateError } = await supabase
          .from("end_of_day_reports")
          .update({ 
            notes, 
            updated_at: new Date().toISOString() 
          })
          .eq("id", reportId);

        if (updateError) throw updateError;

        // Update items
        for (const product of products) {
          const sold = calculateSold(product.distributed, product.remaining);
          const adjustment = calculateAdjustment(product.distributed, product.remaining, product.pos);

          await supabase
            .from("end_of_day_items")
            .upsert({
              report_id: reportId,
              product_id: product.id,
              distributed_quantity: product.distributed,
              remaining_quantity: product.remaining,
              sold_quantity: sold,
              pos_quantity: product.pos,
              adjustment_quantity: adjustment,
            }, {
              onConflict: "report_id,product_id"
            });
        }
      } else {
        // Create new draft
        // @ts-ignore - New tables not in types yet
        const { data: newReport, error: insertError } = await supabase
          .from("end_of_day_reports")
          .insert({
            rider_id: selectedRider,
            report_date: selectedDate,
            submitted_by: userData.user.id,
            notes,
            status: "draft",
          })
          .select()
          .single();

        if (insertError) throw insertError;
        setReportId(newReport.id);

        // Insert items
        for (const product of products) {
          const sold = calculateSold(product.distributed, product.remaining);
          const adjustment = calculateAdjustment(product.distributed, product.remaining, product.pos);

          // @ts-ignore - New tables not in types yet
          await supabase
            .from("end_of_day_items")
            .insert({
              report_id: newReport.id,
              product_id: product.id,
              distributed_quantity: product.distributed,
              remaining_quantity: product.remaining,
              sold_quantity: sold,
              pos_quantity: product.pos,
              adjustment_quantity: adjustment,
            });
        }
      }

      toast.success("Draft berhasil disimpan!");
    } catch (error: any) {
      console.error("Error saving draft:", error);
      toast.error("Gagal menyimpan draft: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      if (!reportId) {
        toast.error("Simpan draft terlebih dahulu sebelum submit");
        return;
      }

      if (products.some(p => p.remaining > p.distributed)) {
        toast.error("Sisa stok tidak boleh lebih besar dari distribusi");
        return;
      }

      setLoading(true);

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("User not authenticated");

      // Update status to submitted
      // @ts-ignore - New tables not in types yet
      const { error: updateError } = await supabase
        .from("end_of_day_reports")
        .update({ 
          status: "submitted",
          submitted_at: new Date().toISOString()
        })
        .eq("id", reportId);

      if (updateError) throw updateError;

      // Check if adjustments needed
      const totalAdjustment = products.reduce((sum, p) => 
        sum + calculateAdjustment(p.distributed, p.remaining, p.pos), 0
      );

      if (totalAdjustment > 0) {
        // Generate adjustment transaction
        // @ts-ignore - New RPC function not in types yet
        const { data: transactionId, error: txError } = await supabase.rpc(
          "generate_adjustment_transaction",
          {
            p_report_id: reportId,
            p_rider_id: selectedRider,
            p_submitted_by: userData.user.id,
          }
        );

        if (txError) throw txError;

        toast.success(`Laporan submitted! Adjustment transaction created (${totalAdjustment} items)`);
      } else {
        toast.success("Laporan submitted! Tidak ada adjustment yang diperlukan.");
      }

      loadHistory(); // Refresh history
      
      // Auto-reset form untuk lanjut ke rider berikutnya
      setSelectedRider("");
      setSelectedDate(new Date().toISOString().split('T')[0]);
      setProducts([]);
      setReportId(null);
      setStatus("draft");
      setNotes("");
      
      toast.info("Form direset. Silakan pilih rider berikutnya.", { duration: 3000 });
    } catch (error: any) {
      console.error("Error submitting report:", error);
      toast.error("Gagal submit laporan: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    if (status === "submitted") {
      toast.error("Tidak bisa reset laporan yang sudah submitted");
      return;
    }
    setProducts(products.map(p => ({ ...p, remaining: 0 })));
    setNotes("");
    toast.info("Form direset");
  };

  const downloadBlankTemplate = () => {
    try {
      toast.info("Generating blank template...");

      if (!selectedRider || products.length === 0) {
        toast.error("Pilih rider dan tanggal terlebih dahulu untuk generate template");
        return;
      }

      // Get rider name
      const riderName = riders.find(r => r.id === selectedRider)?.name || "Unknown";

      // Create workbook
      const wb = XLSX.utils.book_new();
      const wsData: any[][] = [];

      // Header section
      wsData.push(["KERTAS STOCK OPNAME (SO) RIDER"]);
      wsData.push([]);
      wsData.push(["Tanggal:", selectedDate]);
      wsData.push(["Rider:", riderName]);
      wsData.push([]);
      wsData.push(["INSTRUKSI: Isi kolom 'Sisa Akhir Hari' dengan jumlah stok yang dibawa pulang rider"]);
      wsData.push([]);

      // Table header
      wsData.push([
        "Produk",
        "Kategori",
        "Stok Awal Hari",
        "POS Hari Ini",
        "Sisa Akhir Hari (ISI MANUAL)",
        "Terjual (Otomatis)",
        "Selisih (Otomatis)"
      ]);

      // Products data
      products.forEach(product => {
        const categoryLower = product.category?.toLowerCase() || '';
        const isAddOn = categoryLower.includes('add') || 
                        categoryLower.includes('addon') || 
                        categoryLower.includes('add-on');
        
        wsData.push([
          product.name + (isAddOn ? ' (tidak dihitung cup)' : ''),
          product.category || 'N/A',
          product.distributed,
          product.pos,
          "", // Blank untuk manual input
          `=C${wsData.length + 1}-E${wsData.length + 1}`, // Formula Terjual = Stok Awal - Sisa
          `=F${wsData.length + 1}-D${wsData.length + 1}` // Formula Selisih = Terjual - POS
        ]);
      });

      // Add summary rows
      const dataStartRow = 9;
      const dataEndRow = dataStartRow + products.length - 1;
      wsData.push([]);
      wsData.push([
        "TOTAL (non Add-On)",
        "",
        `=SUMIF(B${dataStartRow}:B${dataEndRow},"<>*Add*",C${dataStartRow}:C${dataEndRow})`,
        `=SUMIF(B${dataStartRow}:B${dataEndRow},"<>*Add*",D${dataStartRow}:D${dataEndRow})`,
        "",
        `=SUMIF(B${dataStartRow}:B${dataEndRow},"<>*Add*",F${dataStartRow}:F${dataEndRow})`,
        `=SUMIF(B${dataStartRow}:B${dataEndRow},"<>*Add*",G${dataStartRow}:G${dataEndRow})`
      ]);

      wsData.push([]);
      wsData.push(["Catatan:"]);
      wsData.push([""]);

      // Create worksheet
      const ws = XLSX.utils.aoa_to_sheet(wsData);

      // Styling
      ws['!cols'] = [
        { wch: 30 }, // Produk
        { wch: 15 }, // Kategori
        { wch: 15 }, // Stok Awal
        { wch: 15 }, // POS
        { wch: 25 }, // Sisa (untuk input)
        { wch: 15 }, // Terjual
        { wch: 15 }  // Selisih
      ];

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, "Kertas SO");

      // Generate filename
      const filename = `Kertas-SO-${riderName.replace(/\s+/g, '-')}-${selectedDate}.xlsx`;

      // Download
      XLSX.writeFile(wb, filename);

      toast.success(`Kertas SO berhasil didownload: ${filename}`);
    } catch (error: any) {
      console.error("Error downloading template:", error);
      toast.error("Gagal generate kertas SO: " + error.message);
    }
  };

  const downloadExcelReport = async () => {
    try {
      setLoading(true);
      toast.info("Generating Excel report...");

      // Fetch all reports for selected date
      const { data: reports, error: reportsError } = await supabase
        .from("end_of_day_reports")
        .select(`
          id,
          report_date,
          status,
          rider_id,
          notes,
          submitted_at,
          end_of_day_items(
            product_id,
            distributed_quantity,
            sold_quantity,
            pos_quantity,
            remaining_quantity,
            adjustment_quantity,
            products(name)
          )
        `)
        .eq("report_date", reportDate)
        .order("submitted_at", { ascending: false });

      if (reportsError) throw reportsError;

      if (!reports || reports.length === 0) {
        toast.error(`Tidak ada laporan SO untuk tanggal ${format(new Date(reportDate), 'dd MMM yyyy')}`);
        return;
      }

      // Get rider names
      const riderIds = [...new Set(reports.map((r: any) => r.rider_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", riderIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

      // Prepare Excel data
      const excelData: any[] = [];

      // Header row
      excelData.push([
        "LAPORAN STOCK OPNAME RIDER",
        "",
        "",
        "",
        "",
        "",
        "",
        ""
      ]);
      excelData.push([
        `Tanggal: ${format(new Date(reportDate), 'dd MMMM yyyy')}`,
        "",
        "",
        "",
        "",
        "",
        "",
        ""
      ]);
      excelData.push([]); // Empty row

      // Process each rider
      for (const report of reports) {
        const riderName = profileMap.get(report.rider_id) || "Unknown";
        const isApproved = report.status === "submitted";

        // Rider header
        excelData.push([`Rider: ${riderName}`, "", "", "", "", "", "", `Status: ${isApproved ? 'APPROVED' : 'BELUM APPROVED'}`]);
        excelData.push([]); // Empty row

        if (!isApproved) {
          // If not approved, show message
          excelData.push(["Status", "Belum ter Approved", "", "", "", "", "", ""]);
          excelData.push([]); // Empty row
          continue;
        }

        // Column headers
        excelData.push([
          "Produk",
          "Stok Rider",
          "POS Hari Ini",
          "Sisa Stok",
          "Terjual",
          "Selisih",
          "Catatan",
          ""
        ]);

        // Product rows
        let totalDistributed = 0;
        let totalPOS = 0;
        let totalSold = 0;
        let totalAdjustment = 0;

        for (const item of report.end_of_day_items) {
          totalDistributed += item.distributed_quantity;
          totalPOS += item.pos_quantity;
          totalSold += item.sold_quantity;
          totalAdjustment += item.adjustment_quantity;

          excelData.push([
            item.products.name,
            item.distributed_quantity,
            item.pos_quantity,
            item.remaining_quantity,
            item.sold_quantity,
            item.adjustment_quantity > 0 ? `+${item.adjustment_quantity}` : item.adjustment_quantity,
            "",
            ""
          ]);
        }

        // Totals
        excelData.push([
          "TOTAL",
          totalDistributed,
          totalPOS,
          "",
          totalSold,
          totalAdjustment > 0 ? `+${totalAdjustment}` : totalAdjustment,
          "",
          ""
        ]);

        // Notes
        if (report.notes) {
          excelData.push([]);
          excelData.push(["Catatan Rider:", report.notes, "", "", "", "", "", ""]);
        }

        excelData.push([]); // Empty row between riders
        excelData.push([]); // Extra spacing
      }

      // Create workbook
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(excelData);

      // Set column widths
      ws['!cols'] = [
        { wch: 25 }, // Produk
        { wch: 12 }, // Stok Rider
        { wch: 15 }, // POS Hari Ini
        { wch: 12 }, // Sisa Stok
        { wch: 10 }, // Terjual
        { wch: 10 }, // Selisih
        { wch: 30 }, // Catatan
        { wch: 20 }  // Status
      ];

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, "Stock Opname");

      // Generate filename
      const filename = `Stock-Opname-${format(new Date(reportDate), 'yyyy-MM-dd')}.xlsx`;

      // Download
      XLSX.writeFile(wb, filename);

      toast.success(`Excel report berhasil didownload: ${filename}`);
    } catch (error: any) {
      console.error("Error downloading Excel:", error);
      toast.error("Gagal generate Excel report: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const totalDistributed = products
    .filter(p => {
      const cat = p.category?.toLowerCase() || '';
      return !cat.includes('add') && !cat.includes('addon') && !cat.includes('add-on');
    })
    .reduce((sum, p) => sum + p.distributed, 0);
  
  const totalPOS = products
    .filter(p => {
      const cat = p.category?.toLowerCase() || '';
      return !cat.includes('add') && !cat.includes('addon') && !cat.includes('add-on');
    })
    .reduce((sum, p) => sum + p.pos, 0);
  
  const totalSold = products
    .filter(p => {
      const cat = p.category?.toLowerCase() || '';
      return !cat.includes('add') && !cat.includes('addon') && !cat.includes('add-on');
    })
    .reduce((sum, p) => sum + calculateSold(p.distributed, p.remaining), 0);
  
  const totalAdjustment = products
    .filter(p => {
      const cat = p.category?.toLowerCase() || '';
      return !cat.includes('add') && !cat.includes('addon') && !cat.includes('add-on');
    })
    .reduce((sum, p) => sum + calculateAdjustment(p.distributed, p.remaining, p.pos), 0);

  const hasDiscrepancy = totalAdjustment !== 0;

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            SO (Stock Opname Rider)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tanggal</Label>
              <Input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                disabled={status === "submitted"}
              />
            </div>
            <div className="space-y-2">
              <Label>Rider</Label>
              <Select value={selectedRider} onValueChange={setSelectedRider} disabled={status === "submitted"}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Rider" />
                </SelectTrigger>
                <SelectContent>
                  {riders.map(rider => (
                    <SelectItem key={rider.id} value={rider.id}>
                      {rider.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {loadingData && (
        <Card>
          <CardContent className="py-8">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Memuat data...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Card */}
      {selectedRider && products.length > 0 && !loadingData && (
        <Card className="border-primary/20 bg-primary/5 dark:bg-primary/10">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Ringkasan Distribusi & POS Hari Ini</CardTitle>
              {status === "submitted" && (
                <Badge variant="default" className="text-sm">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Submitted
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground italic">
                * Semua produk yang dibawa rider ditampilkan. <strong>Perhitungan "cups"</strong> hanya untuk produk kategori <strong>selain Add-On</strong>. Produk Add-On tetap muncul untuk tracking tapi tidak dihitung dalam total cups.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Distribusi</p>
                  <p className="text-2xl font-bold">{totalDistributed} cups</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">POS Tercatat</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalPOS} cups</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Terjual (Calc)</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{totalSold} cups</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Adjustment</p>
                  <p className={`text-2xl font-bold ${totalAdjustment > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-gray-600 dark:text-gray-400'}`}>
                    {totalAdjustment > 0 ? '+' : ''}{totalAdjustment} cups
                  </p>
                </div>
              </div>
              {totalAdjustment > 0 && (
                <div className="mt-3 p-3 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg">
                  <p className="text-sm text-orange-800 dark:text-orange-200">
                    ⚠️ <strong>Adjustment akan membuat transaksi otomatis</strong> setelah submit. Transaksi ini akan muncul di <strong>Tab Laporan</strong> dengan tipe "Stock Adjustment".
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Input Stock Table */}
      {selectedRider && products.length > 0 && !loadingData && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <CardTitle>Input Sisa Stok</CardTitle>
              <Button
                onClick={downloadBlankTemplate}
                variant="outline"
                size="sm"
                className="border-blue-500 text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-950"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Kertas SO
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {hasDiscrepancy && (
              <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-orange-900 dark:text-orange-100">Selisih Terdeteksi: {totalAdjustment} cups</p>
                  <p className="text-sm text-orange-700 dark:text-orange-300">
                    Sistem akan generate adjustment transaction untuk {totalAdjustment} cups yang tidak tercatat di POS.
                  </p>
                </div>
              </div>
            )}
            
            {status === "submitted" && (
              <div className="mb-4 flex items-center gap-2 text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950 p-3 rounded-lg">
                <CheckCircle className="w-4 h-4" />
                <span>✅ Laporan ini sudah di-submit dan adjustment transaction telah dibuat. Data tidak bisa diubah lagi.</span>
              </div>
            )}
            
            {status === "draft" && reportId && (
              <div className="mb-4 flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
                <Save className="w-4 h-4" />
                <span>📝 Draft ditemukan! Anda bisa melanjutkan mengisi atau mengubah data sebelum submit.</span>
              </div>
            )}

            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Produk</TableHead>
                    <TableHead className="text-center whitespace-nowrap">Kategori</TableHead>
                    <TableHead className="text-center whitespace-nowrap" title="Stok awal hari: Sisa kemarin + Distribusi hari ini">Stok Awal Hari</TableHead>
                    <TableHead className="text-center whitespace-nowrap" title="Transaksi yang tercatat di POS hari ini">POS Hari Ini</TableHead>
                    <TableHead className="text-center whitespace-nowrap" title="Sisa stok yang dibawa pulang rider">Sisa Akhir Hari</TableHead>
                    <TableHead className="text-center whitespace-nowrap" title="Stok Awal - Sisa Akhir">Terjual</TableHead>
                    <TableHead className="text-center whitespace-nowrap" title="Terjual - POS (jika + berarti hilang, jika - berarti lebih)">Selisih</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => {
                    const sold = calculateSold(product.distributed, product.remaining);
                    const adjustment = calculateAdjustment(product.distributed, product.remaining, product.pos);
                    const hasError = product.remaining > product.distributed;
                    const categoryLower = product.category?.toLowerCase() || '';
                    const isAddOn = categoryLower.includes('add') || 
                                    categoryLower.includes('addon') || 
                                    categoryLower.includes('add-on');
                    const isCup = categoryLower.includes('cup') || 
                                  categoryLower.includes('minuman') ||
                                  categoryLower.includes('drink');
                    
                    return (
                      <TableRow key={product.id} className={`${hasError ? 'bg-red-50 dark:bg-red-950' : ''} ${isAddOn ? 'opacity-60' : ''}`}>
                        <TableCell className="font-medium">
                          {product.name}
                          {isAddOn && <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">(tidak dihitung cup)</span>}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge 
                            variant="outline" 
                            className={
                              isAddOn ? 'bg-yellow-50 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700' : 
                              isCup ? 'bg-blue-50 dark:bg-blue-950' : 
                              'bg-gray-50 dark:bg-gray-800'
                            }
                          >
                            {product.category || 'N/A'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">{product.distributed}</TableCell>
                        <TableCell className="text-center text-blue-600 dark:text-blue-400">{product.pos}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => updateRemaining(product.id, Math.max(0, product.remaining - 1).toString())}
                              disabled={status === "submitted" || product.remaining <= 0}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <Input
                              type="number"
                              min="0"
                              max={product.distributed}
                              value={product.remaining === 0 ? '' : product.remaining}
                              onChange={(e) => updateRemaining(product.id, e.target.value)}
                              placeholder="0"
                              className={`w-16 text-center text-lg font-semibold ${hasError ? 'border-red-500' : ''}`}
                              disabled={status === "submitted"}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => updateRemaining(product.id, Math.min(product.distributed, product.remaining + 1).toString())}
                              disabled={status === "submitted" || product.remaining >= product.distributed}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-semibold text-green-600 dark:text-green-400">{sold}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          {adjustment === 0 ? (
                            <Badge variant="outline" className="bg-green-50 dark:bg-green-950">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              0
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              +{adjustment}
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="notes">Catatan (Opsional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Tambahkan catatan jika ada..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex gap-3">
                <Button onClick={handleSaveDraft} variant="outline" className="flex-1" disabled={loading || status === "submitted"}>
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Simpan Draft
                </Button>
                <Button onClick={handleSubmit} className="flex-1" disabled={loading || !reportId || status === "submitted"}>
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                  Submit Laporan
                </Button>
                <Button onClick={handleReset} variant="ghost" disabled={loading || status === "submitted"}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* History Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Riwayat Stock Opname
              </CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                Menampilkan 10 stock opname terakhir (Draft & Validated). Draft bisa dilanjutkan dengan memilih rider dan tanggal yang sama.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
              <div className="flex items-center gap-2">
                <Label className="text-sm whitespace-nowrap">Filter Tanggal:</Label>
                <Input 
                  type="date" 
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                  className="w-auto"
                />
              </div>
              <Button 
                onClick={downloadExcelReport}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                Download Excel
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Tanggal</TableHead>
                  <TableHead className="whitespace-nowrap">Rider</TableHead>
                  <TableHead className="text-center whitespace-nowrap">Stok Rider</TableHead>
                  <TableHead className="text-center whitespace-nowrap">Total Terjual</TableHead>
                  <TableHead className="text-center whitespace-nowrap">POS</TableHead>
                  <TableHead className="text-center whitespace-nowrap">Adjustment</TableHead>
                  <TableHead className="whitespace-nowrap">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <div className="flex flex-col items-center gap-2">
                        <FileText className="w-8 h-8 text-gray-400 dark:text-gray-600" />
                        <p>Belum ada stock opname</p>
                        <p className="text-sm">Mulai dengan memilih rider dan tanggal di atas</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  history.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="whitespace-nowrap">{format(new Date(record.date), 'dd MMM yyyy')}</TableCell>
                      <TableCell className="font-medium whitespace-nowrap">{record.rider}</TableCell>
                      <TableCell className="text-center">{record.distributed}</TableCell>
                      <TableCell className="text-center font-semibold">{record.totalSold}</TableCell>
                      <TableCell className="text-center text-blue-600 dark:text-blue-400">{record.pos}</TableCell>
                      <TableCell className="text-center">
                        {record.adjustment > 0 ? (
                          <span className="text-orange-600 dark:text-orange-400">+{record.adjustment}</span>
                        ) : (
                          <span className="text-gray-600 dark:text-gray-400">0</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={record.status === 'submitted' ? 'default' : 'secondary'}
                        >
                          {record.status === 'submitted' ? 'Submitted' : 'Draft'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

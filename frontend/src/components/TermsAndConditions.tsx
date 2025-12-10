/**
 * TERMS & CONDITIONS MODAL
 * ========================
 * Shown on first signup for riders
 * Explains GPS tracking clearly
 * Requires consent checkbox
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MapPin, Shield, Eye, Clock, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface TermsAndConditionsProps {
  open: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export default function TermsAndConditions({
  open,
  onAccept,
  onDecline,
}: TermsAndConditionsProps) {
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [agreeToGPS, setAgreeToGPS] = useState(false);

  const canAccept = agreeToTerms && agreeToGPS;

  const handleAccept = () => {
    if (canAccept) {
      onAccept();
    }
  };

  const toggleTerms = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setAgreeToTerms(!agreeToTerms);
  };

  const toggleGPS = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setAgreeToGPS(!agreeToGPS);
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onDecline()}>
      <DialogContent className="max-w-2xl max-h-[90vh] sm:max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl font-bold">
            Syarat & Ketentuan Penggunaan
          </DialogTitle>
          <DialogDescription className="text-sm">
            Silakan baca dan setujui syarat & ketentuan berikut sebelum melanjutkan
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[50vh] sm:h-[400px] pr-4">
          <div className="space-y-6">
            {/* General Terms */}
            <section>
              <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-600" />
                Ketentuan Umum
              </h3>
              <ul className="space-y-2 text-sm text-gray-700 list-disc list-inside">
                <li>
                  Aplikasi ini adalah sistem Point of Sale (POS) untuk pengelolaan
                  produk dan transaksi
                </li>
                <li>
                  Anda bertanggung jawab atas keamanan akun dan kata sandi Anda
                </li>
                <li>
                  Dilarang membagikan akses akun kepada pihak yang tidak
                  berwenang
                </li>
                <li>
                  Data transaksi akan tersimpan dan dapat diakses oleh admin
                  perusahaan
                </li>
                <li>
                  Perusahaan berhak menonaktifkan akun yang melanggar ketentuan
                </li>
              </ul>
            </section>

            {/* GPS Tracking Section */}
            <section className="border-t pt-4">
              <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-red-600" />
                Pelacakan Lokasi GPS (Wajib)
              </h3>
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-3">
                <p className="text-sm font-medium text-yellow-800">
                  ⚠️ Fitur GPS Tracking adalah bagian integral dari sistem ini
                </p>
              </div>
              <ul className="space-y-2 text-sm text-gray-700 list-disc list-inside">
                <li>
                  <strong>Tujuan:</strong> Sistem akan melacak lokasi GPS Anda
                  secara real-time untuk:
                  <ul className="ml-6 mt-1 space-y-1">
                    <li>• Optimasi rute distribusi produk</li>
                    <li>• Keamanan dan keselamatan rider</li>
                    <li>• Analisis performa dan produktivitas</li>
                    <li>• Koordinasi tim secara efektif</li>
                  </ul>
                </li>
                <li>
                  <strong className="flex items-center gap-1 mt-2">
                    <Clock className="w-4 h-4" />
                    Kapan Tracking Aktif:
                  </strong>
                  <ul className="ml-6 mt-1 space-y-1">
                    <li>• Otomatis AKTIF saat Anda login</li>
                    <li>• Otomatis MATI saat Anda logout</li>
                    <li>• Berjalan di background (tidak mengganggu kerja)</li>
                    <li>• Interval update: setiap 1 menit (hemat baterai)</li>
                  </ul>
                </li>
                <li>
                  <strong className="flex items-center gap-1 mt-2">
                    <Eye className="w-4 h-4" />
                    Transparansi:
                  </strong>
                  <ul className="ml-6 mt-1 space-y-1">
                    <li>
                      • Anda TAHU bahwa lokasi Anda dipantau (tidak rahasia)
                    </li>
                    <li>• Admin dapat melihat lokasi real-time di peta</li>
                    <li>• Riwayat lokasi tersimpan selama 30 hari</li>
                    <li>• Data hanya digunakan untuk keperluan operasional</li>
                  </ul>
                </li>
                <li>
                  <strong className="flex items-center gap-1 mt-2">
                    <Settings2 className="w-4 h-4" />
                    Kontrol Manual:
                  </strong>
                  <ul className="ml-6 mt-1 space-y-1">
                    <li>
                      • Anda dapat menonaktifkan tracking manual di menu
                      Pengaturan
                    </li>
                    <li>
                      • Namun, menonaktifkan tracking dapat mempengaruhi akses
                      fitur
                    </li>
                    <li>• Perusahaan dapat menghubungi jika tracking dimatikan</li>
                  </ul>
                </li>
              </ul>
            </section>

            {/* Privacy Policy */}
            <section className="border-t pt-4">
              <h3 className="font-semibold text-lg mb-2">Kebijakan Privasi</h3>
              <ul className="space-y-2 text-sm text-gray-700 list-disc list-inside">
                <li>Data lokasi Anda dilindungi dengan enkripsi</li>
                <li>
                  Data tidak akan dibagikan kepada pihak ketiga tanpa izin Anda
                </li>
                <li>
                  Anda berhak meminta penghapusan data setelah resign/berhenti
                </li>
                <li>
                  Perusahaan berkomitmen melindungi privasi data karyawan
                </li>
              </ul>
            </section>

            {/* Contact */}
            <section className="border-t pt-4">
              <h3 className="font-semibold text-lg mb-2">Kontak & Pertanyaan</h3>
              <p className="text-sm text-gray-700">
                Jika Anda memiliki pertanyaan tentang syarat & ketentuan ini,
                silakan hubungi admin perusahaan atau bagian HRD.
              </p>
            </section>

            {/* Last Updated */}
            <section className="border-t pt-4">
              <p className="text-xs text-gray-500">
                Terakhir diperbarui: {new Date().toLocaleDateString("id-ID")}
              </p>
            </section>
          </div>
        </ScrollArea>

        <DialogFooter className="flex-col gap-4 sm:flex-col pt-2">
          {/* Checkboxes with larger touch targets for mobile */}
          <div className="space-y-4 w-full">
            {/* Terms Checkbox */}
            <div 
              className={cn(
                "flex items-start space-x-3 p-4 rounded-lg border-2 transition-all cursor-pointer",
                "active:scale-[0.98] touch-manipulation",
                agreeToTerms 
                  ? "border-blue-500 bg-blue-50" 
                  : "border-gray-300 bg-white hover:border-blue-400"
              )}
              onClick={toggleTerms}
              role="checkbox"
              aria-checked={agreeToTerms}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setAgreeToTerms(!agreeToTerms);
                }
              }}
            >
              <Checkbox
                id="terms"
                checked={agreeToTerms}
                className="rounded mt-0.5 h-5 w-5 flex-shrink-0 pointer-events-none"
              />
              <label
                className="text-sm font-medium leading-tight cursor-pointer select-none pointer-events-none flex-1"
              >
                Saya telah membaca dan menyetujui{" "}
                <span className="text-blue-600 font-semibold">Syarat & Ketentuan Umum</span>
              </label>
            </div>

            {/* GPS Checkbox */}
            <div 
              className={cn(
                "flex items-start space-x-3 p-4 rounded-lg border-2 transition-all cursor-pointer",
                "active:scale-[0.98] touch-manipulation",
                agreeToGPS 
                  ? "border-red-500 bg-red-50" 
                  : "border-gray-300 bg-white hover:border-red-400"
              )}
              onClick={toggleGPS}
              role="checkbox"
              aria-checked={agreeToGPS}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setAgreeToGPS(!agreeToGPS);
                }
              }}
            >
              <Checkbox
                id="gps"
                checked={agreeToGPS}
                className="rounded mt-0.5 h-5 w-5 flex-shrink-0 pointer-events-none"
              />
              <label
                className="text-sm font-medium leading-tight cursor-pointer select-none pointer-events-none flex-1"
              >
                Saya menyetujui{" "}
                <span className="text-red-600 font-semibold">
                  pelacakan lokasi GPS
                </span>{" "}
                dan memahami bahwa lokasi saya akan dipantau secara real-time
                saat menggunakan aplikasi
              </label>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 w-full pt-2">
            <Button
              variant="outline"
              onClick={onDecline}
              className="flex-1 h-12 text-base touch-manipulation active:scale-95 transition-transform"
              type="button"
            >
              Tolak
            </Button>
            <Button
              onClick={handleAccept}
              disabled={!canAccept}
              className="flex-1 h-12 text-base touch-manipulation active:scale-95 transition-transform disabled:opacity-50"
              type="button"
            >
              Setuju & Lanjutkan
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

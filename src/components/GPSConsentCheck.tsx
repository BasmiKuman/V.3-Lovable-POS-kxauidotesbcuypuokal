/**
 * GPS CONSENT CHECK COMPONENT
 * ============================
 * Checks if rider has given GPS consent on first login
 * Shows Terms & Conditions modal if not consented yet
 * For existing riders who registered before GPS tracking was implemented
 */

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import TermsAndConditions from "./TermsAndConditions";
import { hasGPSConsent, saveGPSConsent } from "@/lib/gps-tracking";
import { toast } from "sonner";

export default function GPSConsentCheck() {
  const [showTerms, setShowTerms] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    checkGPSConsent();
  }, []);

  async function checkGPSConsent() {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if user is rider (not admin)
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "rider")
        .maybeSingle();

      if (!roles) {
        // Not a rider, skip GPS consent check
        setChecked(true);
        return;
      }

      // Check if rider has already given GPS consent
      const hasConsent = await hasGPSConsent(user.id);

      if (!hasConsent) {
        // Show Terms & Conditions modal
        setUserId(user.id);
        setShowTerms(true);
      } else {
        setChecked(true);
      }
    } catch (error) {
      console.error("Error checking GPS consent:", error);
      setChecked(true); // Continue anyway
    }
  }

  async function handleAcceptTerms() {
    if (!userId) return;

    try {
      const success = await saveGPSConsent(userId);
      
      if (success) {
        toast.success("GPS Tracking diaktifkan! Lokasi Anda akan dilacak saat login.");
        setShowTerms(false);
        setChecked(true);
      } else {
        toast.error("Gagal menyimpan consent GPS");
      }
    } catch (error) {
      console.error("Error saving GPS consent:", error);
      toast.error("Terjadi kesalahan saat menyimpan consent");
    }
  }

  function handleDeclineTerms() {
    setShowTerms(false);
    setChecked(true);
    toast.warning(
      "GPS Tracking tidak diaktifkan. Anda dapat mengaktifkannya nanti di menu Pengaturan.",
      { duration: 5000 }
    );
  }

  // Don't render anything if already checked or not showing terms
  if (checked && !showTerms) return null;

  return (
    <TermsAndConditions
      open={showTerms}
      onAccept={handleAcceptTerms}
      onDecline={handleDeclineTerms}
    />
  );
}

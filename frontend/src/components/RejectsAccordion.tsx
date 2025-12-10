import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { AlertTriangle, PackageX, CheckCircle, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface RejectRequest {
  id: string;
  rider_id: string;
  product_id: string;
  quantity: number;
  notes: string | null;
  returned_at: string;
  status?: "pending" | "approved" | "rejected";
  products: {
    name: string;
    price: number;
    image_url?: string | null;
    sku?: string | null;
  };
  profiles: {
    full_name: string;
    avatar_url?: string | null;
  } | null;
}

interface GroupedReject {
  riderId: string;
  riderName: string;
  riderAvatar: string | null;
  rejects: RejectRequest[];
  totalItems: number;
  totalQuantity: number;
}

interface RejectsAccordionProps {
  rejects: RejectRequest[];
  processingRejectId: string | null;
  removingRejectIds: Set<string>;
  onApprove: (rejectItem: RejectRequest) => void;
  onReject: (rejectItem: RejectRequest) => void;
}

export function RejectsAccordion({ 
  rejects, 
  processingRejectId,
  removingRejectIds,
  onApprove, 
  onReject 
}: RejectsAccordionProps) {
  // Group rejects by rider
  const groupedRejects: GroupedReject[] = rejects.reduce((acc, rejectItem) => {
    const existing = acc.find(g => g.riderId === rejectItem.rider_id);
    
    if (existing) {
      existing.rejects.push(rejectItem);
      existing.totalItems++;
      existing.totalQuantity += rejectItem.quantity;
    } else {
      acc.push({
        riderId: rejectItem.rider_id,
        riderName: (rejectItem.profiles as any)?.full_name || "N/A",
        riderAvatar: (rejectItem.profiles as any)?.avatar_url || null,
        rejects: [rejectItem],
        totalItems: 1,
        totalQuantity: rejectItem.quantity,
      });
    }
    
    return acc;
  }, [] as GroupedReject[]);

  // Sort by total items descending
  groupedRejects.sort((a, b) => b.totalItems - a.totalItems);

  return (
    <Accordion type="single" collapsible className="space-y-2">
      {groupedRejects.map((group) => (
        <AccordionItem 
          key={group.riderId} 
          value={group.riderId}
          className="border border-red-200 dark:border-red-900 rounded-lg px-4 bg-card"
        >
          <AccordionTrigger className="hover:no-underline py-4">
            <div className="flex items-center justify-between w-full pr-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={group.riderAvatar || undefined} alt={group.riderName} />
                  <AvatarFallback className="bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400">
                    {group.riderName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left">
                  <p className="font-semibold text-sm sm:text-base">{group.riderName}</p>
                  <p className="text-xs text-muted-foreground">
                    {group.totalItems} produk rusak · {group.totalQuantity} pcs
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="destructive" className="text-xs">
                  {group.totalItems}
                </Badge>
              </div>
            </div>
          </AccordionTrigger>
          
          <AccordionContent className="pb-4">
            <div className="space-y-3 pt-2">
              {group.rejects.map((rejectItem) => {
                const isRemoving = removingRejectIds.has(rejectItem.id);
                return (
                  <Card 
                    key={rejectItem.id} 
                    className={`border-2 border-red-200 dark:border-red-900 transition-all duration-300 ${
                      isRemoving ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
                    }`}
                  >
                    <CardContent className="p-3 sm:p-4">
                    <div className="flex items-start gap-3">
                      {/* Product Image with Warning Overlay */}
                      <div className="w-16 h-16 rounded-lg bg-red-50 dark:bg-red-950 flex items-center justify-center flex-shrink-0 relative">
                        {rejectItem.products.image_url ? (
                          <>
                            <img
                              src={rejectItem.products.image_url}
                              alt={rejectItem.products.name}
                              className="w-full h-full object-cover rounded-lg opacity-60"
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <AlertTriangle className="w-6 h-6 text-red-600" />
                            </div>
                          </>
                        ) : (
                          <PackageX className="w-6 h-6 text-red-600" />
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="flex-1 min-w-0 space-y-2">
                        <div>
                          <p className="font-semibold text-sm sm:text-base line-clamp-2">
                            {rejectItem.products.name}
                          </p>
                          {rejectItem.products.sku && (
                            <p className="text-xs text-muted-foreground">
                              SKU: {rejectItem.products.sku}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="destructive" className="text-xs">
                            {rejectItem.quantity} pcs RUSAK
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(rejectItem.returned_at).toLocaleDateString("id-ID", {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>

                        {/* Reject Reason - Always show prominently */}
                        {rejectItem.notes && (
                          <div className="p-2 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                              <div>
                                <p className="text-xs font-semibold text-red-700 dark:text-red-400">
                                  Alasan Reject:
                                </p>
                                <p className="text-xs text-red-600 dark:text-red-500 mt-0.5">
                                  {rejectItem.notes}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Warning about stock */}
                        <div className="p-2 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                          <p className="text-xs text-yellow-700 dark:text-yellow-400">
                            ⚠️ Produk tidak akan kembali ke stok gudang
                          </p>
                        </div>

                        {/* Actions */}
                        {rejectItem.status === "pending" ? (
                          <div className="flex gap-2 pt-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onReject(rejectItem)}
                              disabled={processingRejectId === rejectItem.id}
                              className="flex-1 sm:flex-none"
                            >
                              <X className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                              Tolak
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => onApprove(rejectItem)}
                              disabled={processingRejectId === rejectItem.id}
                              className="flex-1 sm:flex-none"
                            >
                              <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                              {processingRejectId === rejectItem.id ? "Proses..." : "Konfirmasi Reject"}
                            </Button>
                          </div>
                        ) : (
                          <Badge variant="destructive" className="text-xs">
                            ✓ Dikonfirmasi
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                );
              })}
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

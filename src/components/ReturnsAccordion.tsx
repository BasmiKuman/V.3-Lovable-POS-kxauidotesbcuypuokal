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
import { Users, Package, CheckCircle, X, ChevronDown } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ReturnRequest {
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

interface GroupedReturn {
  riderId: string;
  riderName: string;
  riderAvatar: string | null;
  returns: ReturnRequest[];
  totalItems: number;
  totalQuantity: number;
}

interface ReturnsAccordionProps {
  returns: ReturnRequest[];
  processingReturnId: string | null;
  onApprove: (returnItem: ReturnRequest) => void;
  onReject: (returnItem: ReturnRequest) => void;
}

export function ReturnsAccordion({ 
  returns, 
  processingReturnId, 
  onApprove, 
  onReject 
}: ReturnsAccordionProps) {
  // Group returns by rider
  const groupedReturns: GroupedReturn[] = returns.reduce((acc, returnItem) => {
    const existing = acc.find(g => g.riderId === returnItem.rider_id);
    
    if (existing) {
      existing.returns.push(returnItem);
      existing.totalItems++;
      existing.totalQuantity += returnItem.quantity;
    } else {
      acc.push({
        riderId: returnItem.rider_id,
        riderName: (returnItem.profiles as any)?.full_name || "N/A",
        riderAvatar: (returnItem.profiles as any)?.avatar_url || null,
        returns: [returnItem],
        totalItems: 1,
        totalQuantity: returnItem.quantity,
      });
    }
    
    return acc;
  }, [] as GroupedReturn[]);

  // Sort by total items descending
  groupedReturns.sort((a, b) => b.totalItems - a.totalItems);

  return (
    <Accordion type="single" collapsible className="space-y-2">
      {groupedReturns.map((group) => (
        <AccordionItem 
          key={group.riderId} 
          value={group.riderId}
          className="border rounded-lg px-4 bg-card"
        >
          <AccordionTrigger className="hover:no-underline py-4">
            <div className="flex items-center justify-between w-full pr-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={group.riderAvatar || undefined} alt={group.riderName} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {group.riderName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left">
                  <p className="font-semibold text-sm sm:text-base">{group.riderName}</p>
                  <p className="text-xs text-muted-foreground">
                    {group.totalItems} produk · {group.totalQuantity} pcs
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {group.totalItems}
                </Badge>
              </div>
            </div>
          </AccordionTrigger>
          
          <AccordionContent className="pb-4">
            <div className="space-y-3 pt-2">
              {group.returns.map((returnItem) => (
                <Card key={returnItem.id} className="border-2">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-start gap-3">
                      {/* Product Image */}
                      <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                        {returnItem.products.image_url ? (
                          <img
                            src={returnItem.products.image_url}
                            alt={returnItem.products.name}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <Package className="w-6 h-6 text-muted-foreground" />
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="flex-1 min-w-0 space-y-2">
                        <div>
                          <p className="font-semibold text-sm sm:text-base line-clamp-2">
                            {returnItem.products.name}
                          </p>
                          {returnItem.products.sku && (
                            <p className="text-xs text-muted-foreground">
                              SKU: {returnItem.products.sku}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs">
                            {returnItem.quantity} pcs
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(returnItem.returned_at).toLocaleDateString("id-ID", {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>

                        {returnItem.notes && (
                          <div className="p-2 bg-muted/50 rounded-lg">
                            <p className="text-xs text-muted-foreground">
                              💬 {returnItem.notes}
                            </p>
                          </div>
                        )}

                        {/* Actions */}
                        {returnItem.status === "pending" ? (
                          <div className="flex gap-2 pt-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onReject(returnItem)}
                              disabled={processingReturnId === returnItem.id}
                              className="flex-1 sm:flex-none"
                            >
                              <X className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                              Tolak
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => onApprove(returnItem)}
                              disabled={processingReturnId === returnItem.id}
                              className="flex-1 sm:flex-none"
                            >
                              <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                              {processingReturnId === returnItem.id ? "Proses..." : "Setujui"}
                            </Button>
                          </div>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            ✓ Disetujui
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ro } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface OrderItem {
  id: string;
  sku: string;
  product_name: string;
  sale_price: number;
  production_cost: number;
  real_revenue: number;
  net_profit: number;
  created_at: string;
  orders?: {
    easysales_order_id: string;
    order_date: string;
  };
}

interface OrdersTableProps {
  items: OrderItem[];
}

const ITEMS_PER_PAGE = 20;

export function OrdersTable({ items }: OrdersTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  
  const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedItems = items.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <Card className="animate-slide-up border-border bg-card" style={{ animationDelay: "400ms" }}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold">
          Ultimele Produse Procesate
        </CardTitle>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Pagina {currentPage} din {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Comandă</TableHead>
                <TableHead>Produs</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead className="text-right">Preț Vânzare</TableHead>
                <TableHead className="text-right">Cost Producție</TableHead>
                <TableHead className="text-right">Venit Real</TableHead>
                <TableHead className="text-right">Profit Net</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    Nu există date încă. Sincronizează comenzile din EasySales.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedItems.map((item) => (
                  <TableRow key={item.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="text-muted-foreground">
                      {item.orders?.order_date
                        ? format(new Date(item.orders.order_date), "dd MMM yyyy", { locale: ro })
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">
                        #{item.orders?.easysales_order_id || "-"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{item.product_name}</TableCell>
                    <TableCell className="font-mono text-muted-foreground">
                      {item.sku}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.sale_price.toFixed(2)} RON
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {item.production_cost.toFixed(2)} RON
                    </TableCell>
                    <TableCell className="text-right">
                      {item.real_revenue.toFixed(2)} RON
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={
                          item.net_profit >= 0
                            ? "text-success font-semibold"
                            : "text-destructive font-semibold"
                        }
                      >
                        {item.net_profit >= 0 ? "+" : ""}
                        {item.net_profit.toFixed(2)} RON
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

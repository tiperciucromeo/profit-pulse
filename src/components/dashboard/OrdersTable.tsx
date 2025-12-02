import { useState, useMemo } from "react";
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
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { ro } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";

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
  const [searchQuery, setSearchQuery] = useState("");
  
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const query = searchQuery.toLowerCase();
    return items.filter(item => 
      item.orders?.easysales_order_id?.toLowerCase().includes(query)
    );
  }, [items, searchQuery]);
  
  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedItems = filteredItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <Card className="animate-slide-up border-border bg-card" style={{ animationDelay: "400ms" }}>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-lg font-semibold">
          Ultimele Produse Procesate
        </CardTitle>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Caută după nr. comandă..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9 w-full sm:w-[200px]"
            />
          </div>
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
        </div>
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

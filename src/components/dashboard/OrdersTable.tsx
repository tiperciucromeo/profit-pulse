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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { ro } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Search, CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";

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
    customer_name: string | null;
  };
}

interface OrdersTableProps {
  items: OrderItem[];
}

const ITEMS_PER_PAGE = 20;

export function OrdersTable({ items }: OrdersTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  
  const filteredItems = useMemo(() => {
    let filtered = items;
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        item.orders?.easysales_order_id?.toLowerCase().includes(query)
      );
    }
    
    // Filter by date range
    if (dateFrom) {
      filtered = filtered.filter(item => {
        if (!item.orders?.order_date) return false;
        const orderDate = new Date(item.orders.order_date);
        return orderDate >= dateFrom;
      });
    }
    
    if (dateTo) {
      const endOfDay = new Date(dateTo);
      endOfDay.setHours(23, 59, 59, 999);
      filtered = filtered.filter(item => {
        if (!item.orders?.order_date) return false;
        const orderDate = new Date(item.orders.order_date);
        return orderDate <= endOfDay;
      });
    }
    
    return filtered;
  }, [items, searchQuery, dateFrom, dateTo]);
  
  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedItems = filteredItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const clearDateFilters = () => {
    setDateFrom(undefined);
    setDateTo(undefined);
    setCurrentPage(1);
  };

  return (
    <Card className="animate-slide-up border-border bg-card" style={{ animationDelay: "400ms" }}>
      <CardHeader className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Caută după nr. comandă..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9 w-[180px]"
            />
          </div>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[140px] justify-start text-left font-normal",
                  !dateFrom && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateFrom ? format(dateFrom, "dd MMM yyyy", { locale: ro }) : "De la"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-popover" align="start">
              <Calendar
                mode="single"
                selected={dateFrom}
                onSelect={(date) => {
                  setDateFrom(date);
                  setCurrentPage(1);
                }}
                initialFocus
                className="p-3 pointer-events-auto"
                locale={ro}
              />
            </PopoverContent>
          </Popover>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[140px] justify-start text-left font-normal",
                  !dateTo && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateTo ? format(dateTo, "dd MMM yyyy", { locale: ro }) : "Până la"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-popover" align="start">
              <Calendar
                mode="single"
                selected={dateTo}
                onSelect={(date) => {
                  setDateTo(date);
                  setCurrentPage(1);
                }}
                initialFocus
                className="p-3 pointer-events-auto"
                locale={ro}
              />
            </PopoverContent>
          </Popover>
          
          {(dateFrom || dateTo) && (
            <Button variant="ghost" size="sm" onClick={clearDateFilters}>
              <X className="h-4 w-4 mr-1" />
              Șterge filtre
            </Button>
          )}
          
          <span className="text-sm text-muted-foreground ml-auto">
            {filteredItems.length} rezultate
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Comandă</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Produs</TableHead>
                <TableHead>SKU</TableHead>
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
                    <TableCell className="font-medium">
                      {item.orders?.customer_name || "-"}
                    </TableCell>
                    <TableCell className="font-medium">{item.product_name}</TableCell>
                    <TableCell className="font-mono text-muted-foreground">
                      {item.sku}
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

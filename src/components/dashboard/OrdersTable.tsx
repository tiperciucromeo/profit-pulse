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
import { format } from "date-fns";
import { ro } from "date-fns/locale";

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

export function OrdersTable({ items }: OrdersTableProps) {
  return (
    <Card className="animate-slide-up border-border bg-card" style={{ animationDelay: "400ms" }}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          Ultimele Produse Procesate
        </CardTitle>
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
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    Nu există date încă. Sincronizează comenzile din EasySales.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
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

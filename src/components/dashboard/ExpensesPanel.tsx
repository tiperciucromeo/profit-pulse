import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useMonthlyExpenses } from "@/hooks/useMonthlyExpenses";
import { toast } from "sonner";
import { Save, Receipt } from "lucide-react";

interface ExpensesPanelProps {
  selectedMonth: string; // Format: "2025-10"
  totalRevenue: number;
}

const EXPENSE_FIELDS = [
  { key: "fan_curier", label: "FAN Curier" },
  { key: "sameday", label: "Sameday" },
  { key: "easysale", label: "EasySale" },
  { key: "the_marketer", label: "The Marketer" },
  { key: "netopia", label: "Netopia" },
  { key: "google_ads", label: "Google Ads" },
  { key: "facebook_ads", label: "Facebook Ads" },
  { key: "employee_costs", label: "Cheltuieli Angajat" },
] as const;

export function ExpensesPanel({ selectedMonth, totalRevenue }: ExpensesPanelProps) {
  const { expenses, isLoading, saveExpenses, isSaving } = useMonthlyExpenses(selectedMonth);
  
  const [values, setValues] = useState<Record<string, number>>({
    fan_curier: 0,
    sameday: 0,
    easysale: 0,
    the_marketer: 0,
    netopia: 0,
    google_ads: 0,
    facebook_ads: 0,
    employee_costs: 0,
  });

  // Calculate VAT (21% of total revenue)
  const calculatedVAT = totalRevenue * 0.21;

  // Load saved values when expenses change
  useEffect(() => {
    if (expenses) {
      setValues({
        fan_curier: expenses.fan_curier,
        sameday: expenses.sameday,
        easysale: expenses.easysale,
        the_marketer: expenses.the_marketer,
        netopia: expenses.netopia,
        google_ads: expenses.google_ads,
        facebook_ads: expenses.facebook_ads,
        employee_costs: expenses.employee_costs,
      });
    } else {
      // Reset to 0 if no data for this month
      setValues({
        fan_curier: 0,
        sameday: 0,
        easysale: 0,
        the_marketer: 0,
        netopia: 0,
        google_ads: 0,
        facebook_ads: 0,
        employee_costs: 0,
      });
    }
  }, [expenses]);

  const handleSave = () => {
    saveExpenses(
      {
        month: selectedMonth,
        fan_curier: values.fan_curier,
        sameday: values.sameday,
        easysale: values.easysale,
        the_marketer: values.the_marketer,
        netopia: values.netopia,
        google_ads: values.google_ads,
        facebook_ads: values.facebook_ads,
        employee_costs: values.employee_costs,
      },
      {
        onSuccess: () => toast.success("Cheltuieli salvate!"),
        onError: () => toast.error("Eroare la salvare"),
      }
    );
  };

  const totalExpenses = Object.values(values).reduce((sum, val) => sum + val, 0) + calculatedVAT;

  return (
    <Card className="border-border">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Receipt className="h-5 w-5 text-primary" />
          Cheltuieli Lunare - {selectedMonth}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {EXPENSE_FIELDS.map((field) => (
            <div key={field.key} className="space-y-1.5">
              <Label htmlFor={field.key} className="text-xs text-muted-foreground">
                {field.label}
              </Label>
              <Input
                id={field.key}
                type="number"
                step="0.01"
                value={values[field.key] || ""}
                onChange={(e) =>
                  setValues((prev) => ({
                    ...prev,
                    [field.key]: parseFloat(e.target.value) || 0,
                  }))
                }
                placeholder="0.00"
                className="h-9"
                disabled={isLoading}
              />
            </div>
          ))}
        </div>

        {/* Calculated VAT - Read only */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-border">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              TVA Calculat (21% din Vânzări)
            </Label>
            <Input
              value={calculatedVAT.toFixed(2)}
              readOnly
              className="h-9 bg-muted font-medium"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Total Cheltuieli
            </Label>
            <Input
              value={totalExpenses.toFixed(2)}
              readOnly
              className="h-9 bg-destructive/10 text-destructive font-bold"
            />
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={isSaving || isLoading}
          className="w-full md:w-auto"
        >
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? "Se salvează..." : "Salvează Cheltuieli"}
        </Button>
      </CardContent>
    </Card>
  );
}

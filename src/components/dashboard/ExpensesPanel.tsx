import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useMonthlyExpenses } from "@/hooks/useMonthlyExpenses";
import { toast } from "sonner";
import { Save, Receipt, Calculator } from "lucide-react";

interface ExpensesPanelProps {
  selectedMonth: string;
  totalRevenue: number;
}

interface ExpenseField {
  key: string;
  label: string;
  hasVatExempt: boolean;
}

const EXPENSE_FIELDS: ExpenseField[] = [
  { key: "fan_curier", label: "FAN Curier", hasVatExempt: true },
  { key: "sameday", label: "Sameday", hasVatExempt: true },
  { key: "easysale", label: "EasySale", hasVatExempt: true },
  { key: "the_marketer", label: "The Marketer", hasVatExempt: true },
  { key: "netopia", label: "Netopia", hasVatExempt: true },
  { key: "google_ads", label: "Google Ads", hasVatExempt: false },
  { key: "facebook_ads", label: "Facebook Ads", hasVatExempt: false },
  { key: "employee_costs", label: "Cheltuieli Angajat", hasVatExempt: true },
  { key: "alte_cheltuieli", label: "Alte Cheltuieli", hasVatExempt: true },
];

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
    alte_cheltuieli: 0,
  });

  // Calculate VAT extracted from price (revenue includes VAT)
  const calculatedVAT = (totalRevenue / 1.21) * 0.21;

  // Calculate value without VAT
  const withoutVAT = (value: number) => value / 1.21;

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
        alte_cheltuieli: expenses.alte_cheltuieli,
      });
    } else {
      setValues({
        fan_curier: 0,
        sameday: 0,
        easysale: 0,
        the_marketer: 0,
        netopia: 0,
        google_ads: 0,
        facebook_ads: 0,
        employee_costs: 0,
        alte_cheltuieli: 0,
      });
    }
  }, [expenses]);

  const handleSave = () => {
    saveExpenses(
      {
        month: selectedMonth,
        ...values,
      } as any,
      {
        onSuccess: () => toast.success("Cheltuieli salvate!"),
        onError: () => toast.error("Eroare la salvare"),
      }
    );
  };

  const totalExpenses = Object.values(values).reduce((sum, val) => sum + val, 0) + calculatedVAT;
  const totalExpensesWithoutVAT = EXPENSE_FIELDS.reduce((sum, field) => {
    const val = values[field.key] || 0;
    return sum + (field.hasVatExempt ? withoutVAT(val) : val);
  }, 0) + calculatedVAT;

  return (
    <Card className="border-border">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Receipt className="h-5 w-5 text-primary" />
          Cheltuieli Lunare - {selectedMonth}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Header row */}
        <div className="grid grid-cols-12 gap-3 pb-2 border-b border-border">
          <div className="col-span-4">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Categorie
            </Label>
          </div>
          <div className="col-span-4">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Cu TVA (RON)
            </Label>
          </div>
          <div className="col-span-4">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Fără TVA (RON)
            </Label>
          </div>
        </div>

        {/* Expense rows */}
        {EXPENSE_FIELDS.map((field) => (
          <div key={field.key} className="grid grid-cols-12 gap-3 items-center py-1">
            <div className="col-span-4">
              <Label htmlFor={field.key} className="text-sm font-medium">
                {field.label}
              </Label>
            </div>
            <div className="col-span-4">
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
            <div className="col-span-4">
              {field.hasVatExempt ? (
                <Input
                  value={withoutVAT(values[field.key] || 0).toFixed(2)}
                  readOnly
                  className="h-9 bg-muted/50 text-muted-foreground"
                />
              ) : (
                <span className="text-sm text-muted-foreground italic pl-3">N/A</span>
              )}
            </div>
          </div>
        ))}

        {/* Divider */}
        <div className="border-t border-border pt-3 mt-3 space-y-3">
          {/* Calculated VAT Row */}
          <div className="grid grid-cols-12 gap-3 items-center">
            <div className="col-span-4">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Calculator className="h-4 w-4 text-primary" />
                TVA Calculat
              </Label>
              <span className="text-xs text-muted-foreground">21% din Vânzări</span>
            </div>
            <div className="col-span-4">
              <Input
                value={calculatedVAT.toFixed(2)}
                readOnly
                className="h-9 bg-primary/10 font-medium border-primary/20"
              />
            </div>
            <div className="col-span-4">
              <span className="text-sm text-muted-foreground italic pl-3">N/A</span>
            </div>
          </div>

          {/* Total Row */}
          <div className="grid grid-cols-12 gap-3 items-center bg-destructive/5 rounded-lg p-3 -mx-3">
            <div className="col-span-4">
              <Label className="text-sm font-bold text-destructive">
                TOTAL CHELTUIELI
              </Label>
            </div>
            <div className="col-span-4">
              <Input
                value={totalExpenses.toFixed(2)}
                readOnly
                className="h-9 bg-destructive/10 text-destructive font-bold border-destructive/20"
              />
            </div>
            <div className="col-span-4">
              <Input
                value={totalExpensesWithoutVAT.toFixed(2)}
                readOnly
                className="h-9 bg-destructive/10 text-destructive font-bold border-destructive/20"
              />
            </div>
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={isSaving || isLoading}
          className="w-full mt-4"
        >
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? "Se salvează..." : "Salvează Cheltuieli"}
        </Button>
      </CardContent>
    </Card>
  );
}

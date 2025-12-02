import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RefreshCw, Upload, Settings, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface SyncPanelProps {
  onSync: () => void;
  isLoading: boolean;
}

export function SyncPanel({ onSync, isLoading }: SyncPanelProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [googleSheetUrl, setGoogleSheetUrl] = useState("");

  const handleSyncEasySales = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("sync-easysales");
      
      if (error) throw error;
      
      toast.success("Sincronizare completă!", {
        description: `${data?.ordersProcessed || 0} comenzi procesate`,
      });
      onSync();
    } catch (error) {
      toast.error("Eroare la sincronizare", {
        description: "Verifică API key-ul EasySales",
      });
    }
  };

  const handleSyncCosts = async () => {
    if (!googleSheetUrl) {
      toast.error("Introdu URL-ul Google Sheet");
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("sync-costs", {
        body: { sheetUrl: googleSheetUrl },
      });
      
      if (error) throw error;
      
      toast.success("Costuri actualizate!", {
        description: `${data?.productsUpdated || 0} produse sincronizate`,
      });
    } catch (error) {
      toast.error("Eroare la sincronizare costuri", {
        description: "Verifică URL-ul Google Sheet",
      });
    }
  };

  return (
    <Card className="animate-slide-up border-border bg-card" style={{ animationDelay: "100ms" }}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold">Sincronizare Date</CardTitle>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowSettings(!showSettings)}
        >
          <Settings className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-3">
          <Button
            onClick={handleSyncEasySales}
            disabled={isLoading}
            className="flex-1 gradient-primary text-primary-foreground hover:opacity-90"
          >
            {isLoading ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Sincronizează EasySales
          </Button>
          <Button
            onClick={handleSyncCosts}
            variant="outline"
            disabled={isLoading}
            className="flex-1"
          >
            <Upload className="mr-2 h-4 w-4" />
            Sincronizează Costuri
          </Button>
        </div>

        {showSettings && (
          <div className="space-y-3 pt-4 border-t border-border animate-fade-in">
            <div className="space-y-2">
              <Label htmlFor="sheet-url">URL Google Sheet (Bază de date Costuri)</Label>
              <Input
                id="sheet-url"
                placeholder="https://docs.google.com/spreadsheets/d/..."
                value={googleSheetUrl}
                onChange={(e) => setGoogleSheetUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Sheet-ul trebuie să aibă coloanele: SKU, Nume Produs, Cost Producție
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle2 className="h-4 w-4 text-success" />
          <span>Ultima sincronizare: -</span>
        </div>
      </CardContent>
    </Card>
  );
}

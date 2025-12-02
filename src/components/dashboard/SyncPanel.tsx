import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RefreshCw, Upload, Settings, CheckCircle2, FileSpreadsheet, Calculator, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface SyncPanelProps {
  onSync: () => void;
  isLoading: boolean;
}

export function SyncPanel({ onSync, isLoading }: SyncPanelProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [googleSheetUrl, setGoogleSheetUrl] = useState("");
  const [isSyncingCosts, setIsSyncingCosts] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [isResyncing, setIsResyncing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    setIsSyncingCosts(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-costs", {
        body: { sheetUrl: googleSheetUrl },
      });
      
      if (error) throw error;
      
      toast.success("Costuri actualizate!", {
        description: `${data?.totalUpserted || 0} produse sincronizate`,
      });
      onSync();
    } catch (error) {
      toast.error("Eroare la sincronizare costuri", {
        description: "Verifică URL-ul Google Sheet",
      });
    } finally {
      setIsSyncingCosts(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file type
    const validTypes = ['.csv', '.txt'];
    const fileExt = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!validTypes.includes(fileExt)) {
      toast.error("Format invalid", {
        description: "Te rog încarcă un fișier CSV",
      });
      return;
    }

    setIsSyncingCosts(true);
    try {
      const csvData = await file.text();
      
      const { data, error } = await supabase.functions.invoke("sync-costs", {
        body: { csvData },
      });
      
      if (error) throw error;
      
      toast.success("Costuri importate!", {
        description: `${data?.totalUpserted || 0} produse sincronizate`,
      });
      onSync();
    } catch (error) {
      console.error('File upload error:', error);
      toast.error("Eroare la import", {
        description: "Verifică formatul fișierului CSV",
      });
    } finally {
      setIsSyncingCosts(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRecalculateCosts = async () => {
    setIsRecalculating(true);
    try {
      const { data, error } = await supabase.functions.invoke("recalculate-costs");
      
      if (error) throw error;
      
      toast.success("Costuri recalculate!", {
        description: `${data?.updated || 0} produse actualizate`,
      });
      onSync();
    } catch (error) {
      console.error('Recalculate error:', error);
      toast.error("Eroare la recalculare", {
        description: "Verifică logurile pentru detalii",
      });
    } finally {
      setIsRecalculating(false);
    }
  };

  const handleResyncOrders = async () => {
    setIsResyncing(true);
    toast.info("Re-sincronizare în curs...", {
      description: "Acest proces poate dura câteva minute",
    });
    try {
      const { data, error } = await supabase.functions.invoke("resync-orders");
      
      if (error) throw error;
      
      toast.success("Re-sincronizare completă!", {
        description: `${data?.ordersProcessed || 0} comenzi verificate, ${data?.differences?.length || 0} diferențe găsite`,
      });
      
      if (data?.differences && data.differences.length > 0) {
        console.log("Diferențe găsite:", data.differences);
      }
      
      onSync();
    } catch (error) {
      console.error('Resync error:', error);
      toast.error("Eroare la re-sincronizare", {
        description: "Verifică logurile pentru detalii",
      });
    } finally {
      setIsResyncing(false);
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
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={handleSyncEasySales}
            disabled={isLoading}
            className="flex-1 min-w-[180px] gradient-primary text-primary-foreground hover:opacity-90"
          >
            {isLoading ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Sincronizează EasySales
          </Button>
          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
            disabled={isSyncingCosts}
            className="flex-1 min-w-[150px]"
          >
            {isSyncingCosts ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="mr-2 h-4 w-4" />
            )}
            Import Costuri CSV
          </Button>
          <Button
            onClick={handleRecalculateCosts}
            variant="secondary"
            disabled={isRecalculating}
            className="flex-1 min-w-[150px]"
          >
            {isRecalculating ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Calculator className="mr-2 h-4 w-4" />
            )}
            Recalculează Costuri
          </Button>
          <Button
            onClick={handleResyncOrders}
            variant="outline"
            disabled={isResyncing}
            className="flex-1 min-w-[150px] border-amber-500/50 text-amber-600 hover:bg-amber-500/10"
          >
            {isResyncing ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="mr-2 h-4 w-4" />
            )}
            Re-sync Comenzi
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        {showSettings && (
          <div className="space-y-3 pt-4 border-t border-border animate-fade-in">
            <div className="space-y-2">
              <Label htmlFor="sheet-url">URL Google Sheet (Bază de date Costuri)</Label>
              <div className="flex gap-2">
                <Input
                  id="sheet-url"
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  value={googleSheetUrl}
                  onChange={(e) => setGoogleSheetUrl(e.target.value)}
                  className="flex-1"
                />
                <Button
                  onClick={handleSyncCosts}
                  variant="secondary"
                  disabled={isSyncingCosts || !googleSheetUrl}
                  size="sm"
                >
                  <Upload className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Sheet-ul/CSV-ul trebuie să aibă coloanele: SKU, Nume Produs, Cost Producție
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

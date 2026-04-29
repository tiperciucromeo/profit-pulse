import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, RotateCcw } from "lucide-react";
import { Label } from "@/components/ui/label";

type AttractorType = "clifford" | "lorenz";

interface CliffordParams {
  a: number;
  b: number;
  c: number;
  d: number;
}

interface LorenzParams {
  sigma: number;
  rho: number;
  beta: number;
}

const AttractorVisualizer = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [attractorType, setAttractorType] = useState<AttractorType>("clifford");
  const [pointCount, setPointCount] = useState(100000);
  const [isGenerating, setIsGenerating] = useState(false);

  // Clifford parameters
  const [cliffordParams, setCliffordParams] = useState<CliffordParams>({
    a: -1.4,
    b: 1.6,
    c: 1.0,
    d: 0.7,
  });

  // Lorenz parameters
  const [lorenzParams, setLorenzParams] = useState<LorenzParams>({
    sigma: 10,
    rho: 28,
    beta: 8 / 3,
  });

  // Color scheme
  const [colorScheme, setColorScheme] = useState<"rainbow" | "blue" | "red" | "green">("rainbow");

  const getColor = useCallback((t: number, total: number): string => {
    const ratio = t / total;
    switch (colorScheme) {
      case "rainbow":
        const hue = (ratio * 360) % 360;
        return `hsl(${hue}, 100%, 50%)`;
      case "blue":
        return `hsl(240, 100%, ${50 + ratio * 50}%)`;
      case "red":
        return `hsl(0, 100%, ${50 + ratio * 50}%)`;
      case "green":
        return `hsl(120, 100%, ${50 + ratio * 50}%)`;
      default:
        return "white";
    }
  }, [colorScheme]);

  const drawClifford = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, width, height);

    const { a, b, c, d } = cliffordParams;
    let x = 0;
    let y = 0;

    // Center and scale
    const centerX = width / 2;
    const centerY = height / 2;
    const scale = Math.min(width, height) / 4;

    // Generate points
    for (let i = 0; i < pointCount; i++) {
      const newX = Math.sin(a * y) + c * Math.cos(a * x);
      const newY = Math.sin(b * x) + d * Math.cos(b * y);
      x = newX;
      y = newY;

      // Draw point
      const px = centerX + x * scale;
      const py = centerY + y * scale;

      if (px >= 0 && px < width && py >= 0 && py < height) {
        ctx.fillStyle = getColor(i, pointCount);
        ctx.fillRect(px, py, 1, 1);
      }
    }
  }, [cliffordParams, pointCount, getColor]);

  const drawLorenz = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, width, height);

    const { sigma, rho, beta } = lorenzParams;
    let x = 0.1;
    let y = 0;
    let z = 0;
    const dt = 0.01;

    // Center and scale
    const centerX = width / 2;
    const centerY = height / 2;
    const scale = 10;

    // Generate points
    for (let i = 0; i < pointCount; i++) {
      const dx = sigma * (y - x) * dt;
      const dy = (x * (rho - z) - y) * dt;
      const dz = (x * y - beta * z) * dt;

      x += dx;
      y += dy;
      z += dz;

      // Project 3D to 2D (view from angle)
      const angle = 0.5;
      const px = centerX + (x * Math.cos(angle) - y * Math.sin(angle)) * scale;
      const py = centerY + (x * Math.sin(angle) + y * Math.cos(angle) - z * 0.5) * scale;

      if (px >= 0 && px < width && py >= 0 && py < height) {
        ctx.fillStyle = getColor(i, pointCount);
        ctx.fillRect(px, py, 1, 1);
      }
    }
  }, [lorenzParams, pointCount, getColor]);

  const drawAttractor = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || canvas.width === 0 || canvas.height === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Use the actual canvas dimensions (which are scaled by DPR)
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;

    if (width === 0 || height === 0) return;

    if (attractorType === "clifford") {
      drawClifford(ctx, width, height);
    } else {
      drawLorenz(ctx, width, height);
    }
  }, [attractorType, drawClifford, drawLorenz]);

  // Initialize and resize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      
      const dpr = window.devicePixelRatio || 1;
      
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
      
      // Redraw after resize
      requestAnimationFrame(() => {
        drawAttractor();
      });
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [drawAttractor]);

  // Redraw when parameters change or on mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || canvas.width === 0 || canvas.height === 0) return;
    
    drawAttractor();
  }, [drawAttractor]);

  const handleDownload = async () => {
    setIsGenerating(true);
    
    try {
      // Create a high-resolution canvas for export (8000x8000px)
      const exportSize = 8000;
      const exportCanvas = document.createElement("canvas");
      exportCanvas.width = exportSize;
      exportCanvas.height = exportSize;
      const exportCtx = exportCanvas.getContext("2d");
      
      if (!exportCtx) {
        setIsGenerating(false);
        return;
      }

    // Scale up the point count proportionally for high-res export
    const exportPointCount = Math.floor(pointCount * (exportSize / 600)); // Scale based on display size

    // Get color function
    const getColorExport = (t: number, total: number): string => {
      const ratio = t / total;
      switch (colorScheme) {
        case "rainbow":
          const hue = (ratio * 360) % 360;
          return `hsl(${hue}, 100%, 50%)`;
        case "blue":
          return `hsl(240, 100%, ${50 + ratio * 50}%)`;
        case "red":
          return `hsl(0, 100%, ${50 + ratio * 50}%)`;
        case "green":
          return `hsl(120, 100%, ${50 + ratio * 50}%)`;
        default:
          return "white";
      }
    };

    // Fill background
    exportCtx.fillStyle = "#000000";
    exportCtx.fillRect(0, 0, exportSize, exportSize);

    if (attractorType === "clifford") {
      const { a, b, c, d } = cliffordParams;
      let x = 0;
      let y = 0;

      const centerX = exportSize / 2;
      const centerY = exportSize / 2;
      const scale = exportSize / 4;

      // Generate and draw points
      for (let i = 0; i < exportPointCount; i++) {
        const newX = Math.sin(a * y) + c * Math.cos(a * x);
        const newY = Math.sin(b * x) + d * Math.cos(b * y);
        x = newX;
        y = newY;

        const px = centerX + x * scale;
        const py = centerY + y * scale;

        if (px >= 0 && px < exportSize && py >= 0 && py < exportSize) {
          exportCtx.fillStyle = getColorExport(i, exportPointCount);
          // Draw slightly larger points for better quality
          exportCtx.fillRect(px, py, 2, 2);
        }

        // Show progress every 10000 points
        if (i % 10000 === 0 && i > 0) {
          await new Promise(resolve => setTimeout(resolve, 0)); // Yield to browser
        }
      }
    } else {
      const { sigma, rho, beta } = lorenzParams;
      let x = 0.1;
      let y = 0;
      let z = 0;
      const dt = 0.01;

      const centerX = exportSize / 2;
      const centerY = exportSize / 2;
      const scale = exportSize / 8; // Adjust scale for Lorenz

      for (let i = 0; i < exportPointCount; i++) {
        const dx = sigma * (y - x) * dt;
        const dy = (x * (rho - z) - y) * dt;
        const dz = (x * y - beta * z) * dt;

        x += dx;
        y += dy;
        z += dz;

        const angle = 0.5;
        const px = centerX + (x * Math.cos(angle) - y * Math.sin(angle)) * scale;
        const py = centerY + (x * Math.sin(angle) + y * Math.cos(angle) - z * 0.5) * scale;

        if (px >= 0 && px < exportSize && py >= 0 && py < exportSize) {
          exportCtx.fillStyle = getColorExport(i, exportPointCount);
          exportCtx.fillRect(px, py, 2, 2);
        }

        // Show progress every 10000 points
        if (i % 10000 === 0 && i > 0) {
          await new Promise(resolve => setTimeout(resolve, 0)); // Yield to browser
        }
      }
    }

      // Download the high-resolution image
      exportCanvas.toBlob((blob) => {
        if (!blob) {
          setIsGenerating(false);
          return;
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.download = `${attractorType}-attractor-8000x8000-${Date.now()}.png`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        setIsGenerating(false);
      }, "image/png");
    } catch (error) {
      console.error("Error generating image:", error);
      setIsGenerating(false);
    }
  };

  const handleReset = () => {
    if (attractorType === "clifford") {
      setCliffordParams({
        a: -1.4,
        b: 1.6,
        c: 1.0,
        d: 0.7,
      });
    } else {
      setLorenzParams({
        sigma: 10,
        rho: 28,
        beta: 8 / 3,
      });
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="container mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold">Attractor Visualizer</CardTitle>
            <CardDescription>
              Generate beautiful images of Clifford and Lorenz attractors. Adjust parameters with sliders to create endless variations.
            </CardDescription>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Controls Panel */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Controls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Attractor Type */}
                <Tabs value={attractorType} onValueChange={(v) => setAttractorType(v as AttractorType)}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="clifford">Clifford</TabsTrigger>
                    <TabsTrigger value="lorenz">Lorenz</TabsTrigger>
                  </TabsList>
                </Tabs>

                {/* Point Count */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Point Count</Label>
                    <span className="text-sm text-muted-foreground">{pointCount.toLocaleString()}</span>
                  </div>
                  <Slider
                    value={[pointCount]}
                    onValueChange={(value) => setPointCount(value[0])}
                    min={1000}
                    max={500000}
                    step={5000}
                  />
                </div>

                {/* Color Scheme */}
                <div className="space-y-2">
                  <Label>Color Scheme</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["rainbow", "blue", "red", "green"] as const).map((scheme) => (
                      <Button
                        key={scheme}
                        variant={colorScheme === scheme ? "default" : "outline"}
                        size="sm"
                        onClick={() => setColorScheme(scheme)}
                        className="capitalize"
                      >
                        {scheme}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2">
                  <Button 
                    onClick={handleDownload} 
                    className="w-full" 
                    variant="outline"
                    disabled={isGenerating}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    {isGenerating ? "Generating 8K..." : "Download Ultra HD (8K)"}
                  </Button>
                  <Button onClick={handleReset} className="w-full" variant="outline">
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reset Parameters
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Parameters */}
            <Card>
              <CardHeader>
                <CardTitle>Parameters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {attractorType === "clifford" ? (
                  <>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>a: {cliffordParams.a.toFixed(2)}</Label>
                      </div>
                      <Slider
                        value={[cliffordParams.a]}
                        onValueChange={(value) => setCliffordParams({ ...cliffordParams, a: value[0] })}
                        min={-3}
                        max={3}
                        step={0.01}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>b: {cliffordParams.b.toFixed(2)}</Label>
                      </div>
                      <Slider
                        value={[cliffordParams.b]}
                        onValueChange={(value) => setCliffordParams({ ...cliffordParams, b: value[0] })}
                        min={-3}
                        max={3}
                        step={0.01}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>c: {cliffordParams.c.toFixed(2)}</Label>
                      </div>
                      <Slider
                        value={[cliffordParams.c]}
                        onValueChange={(value) => setCliffordParams({ ...cliffordParams, c: value[0] })}
                        min={-3}
                        max={3}
                        step={0.01}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>d: {cliffordParams.d.toFixed(2)}</Label>
                      </div>
                      <Slider
                        value={[cliffordParams.d]}
                        onValueChange={(value) => setCliffordParams({ ...cliffordParams, d: value[0] })}
                        min={-3}
                        max={3}
                        step={0.01}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>σ (sigma): {lorenzParams.sigma.toFixed(2)}</Label>
                      </div>
                      <Slider
                        value={[lorenzParams.sigma]}
                        onValueChange={(value) => setLorenzParams({ ...lorenzParams, sigma: value[0] })}
                        min={0}
                        max={50}
                        step={0.1}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>ρ (rho): {lorenzParams.rho.toFixed(2)}</Label>
                      </div>
                      <Slider
                        value={[lorenzParams.rho]}
                        onValueChange={(value) => setLorenzParams({ ...lorenzParams, rho: value[0] })}
                        min={0}
                        max={100}
                        step={0.1}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>β (beta): {lorenzParams.beta.toFixed(3)}</Label>
                      </div>
                      <Slider
                        value={[lorenzParams.beta]}
                        onValueChange={(value) => setLorenzParams({ ...lorenzParams, beta: value[0] })}
                        min={0}
                        max={10}
                        step={0.01}
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Canvas */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle className="capitalize">
                  {attractorType === "clifford" ? "Clifford" : "Lorenz"} Attractor
                </CardTitle>
                <CardDescription>
                  {attractorType === "clifford"
                    ? "A strange attractor defined by trigonometric functions. Adjust parameters a, b, c, d to explore different patterns."
                    : "The famous butterfly attractor from chaos theory. Adjust σ, ρ, and β to see how the system evolves."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="w-full h-[600px] rounded-lg overflow-hidden border border-border bg-black">
                  <canvas
                    ref={canvasRef}
                    className="w-full h-full block"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttractorVisualizer;


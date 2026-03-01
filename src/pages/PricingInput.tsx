import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calculator, Sparkles } from 'lucide-react';
import { PricingInput as PricingInputType, calculatePricing } from '@/lib/pricing-engine';
import PricingResultPage from './PricingResult';

const productCatalog: Record<string, string> = {
  'SKU-1042': 'Industrial Valve Assembly',
  'SKU-2088': 'Precision Bearing Set',
  'SKU-3321': 'Hydraulic Pump Motor',
  'SKU-4455': 'Stainless Steel Flange',
  'SKU-5500': 'Pressure Gauge Sensor',
};

export default function PricingInputPage() {
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<ReturnType<typeof calculatePricing> | null>(null);
  const [formData, setFormData] = useState<PricingInputType>({
    sku: '',
    productName: '',
    customerName: '',
    customerTier: 'Standard',
    salesChannel: 'Traditional',
    costPrice: 0,
    currentStock: 0,
    inventoryAging: 0,
    demandLevel: 'Medium',
    competitorPrice: undefined,
  });

  const handleSkuChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      sku: value,
      productName: productCatalog[value] || prev.productName,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pricing = calculatePricing(formData);
    setResult(pricing);
    setShowResult(true);
  };

  if (showResult && result) {
    return (
      <PricingResultPage
        input={formData}
        result={result}
        onBack={() => setShowResult(false)}
      />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">New Pricing Analysis</h1>
        <p className="text-muted-foreground mt-1">Enter product and market data to generate optimal pricing</p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              Pricing Input
            </CardTitle>
            <CardDescription>Fill in all required fields for accurate pricing recommendations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Product Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>SKU / Product ID</Label>
                <Select value={formData.sku} onValueChange={handleSkuChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select SKU" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(productCatalog).map(([sku, name]) => (
                      <SelectItem key={sku} value={sku}>
                        {sku} – {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Product Name</Label>
                <Input
                  value={formData.productName}
                  onChange={(e) => setFormData((p) => ({ ...p, productName: e.target.value }))}
                  placeholder="Auto-filled from SKU"
                />
              </div>
            </div>

            {/* Customer Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Customer Name</Label>
                <Input
                  value={formData.customerName}
                  onChange={(e) => setFormData((p) => ({ ...p, customerName: e.target.value }))}
                  placeholder="Enter customer name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Customer Tier</Label>
                <Select
                  value={formData.customerTier}
                  onValueChange={(v) => setFormData((p) => ({ ...p, customerTier: v as PricingInputType['customerTier'] }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Standard">Standard</SelectItem>
                    <SelectItem value="Loyal">Loyal</SelectItem>
                    <SelectItem value="Corporate">Corporate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Sales Channel</Label>
                <Select
                  value={formData.salesChannel}
                  onValueChange={(v) => setFormData((p) => ({ ...p, salesChannel: v as PricingInputType['salesChannel'] }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Traditional">Traditional</SelectItem>
                    <SelectItem value="Corporate">Corporate</SelectItem>
                    <SelectItem value="E-commerce">E-commerce</SelectItem>
                    <SelectItem value="Project">Project</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Pricing & Inventory */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Cost Price ($)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.costPrice || ''}
                  onChange={(e) => setFormData((p) => ({ ...p, costPrice: parseFloat(e.target.value) || 0 }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Current Stock Level</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.currentStock || ''}
                  onChange={(e) => setFormData((p) => ({ ...p, currentStock: parseInt(e.target.value) || 0 }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Inventory Aging (days)</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.inventoryAging || ''}
                  onChange={(e) => setFormData((p) => ({ ...p, inventoryAging: parseInt(e.target.value) || 0 }))}
                  required
                />
              </div>
            </div>

            {/* Market */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Demand Level</Label>
                <Select
                  value={formData.demandLevel}
                  onValueChange={(v) => setFormData((p) => ({ ...p, demandLevel: v as PricingInputType['demandLevel'] }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Competitor Benchmark Price ($) <span className="text-muted-foreground">(optional)</span></Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.competitorPrice || ''}
                  onChange={(e) => setFormData((p) => ({ ...p, competitorPrice: parseFloat(e.target.value) || undefined }))}
                />
              </div>
            </div>

            <div className="pt-2">
              <Button type="submit" className="gap-2" size="lg">
                <Sparkles className="h-4 w-4" />
                Generate AI Recommendation
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}

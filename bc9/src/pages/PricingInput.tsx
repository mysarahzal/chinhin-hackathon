// import { useState } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
// import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input';
// import { Label } from '@/components/ui/label';
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// import { Calculator, Sparkles } from 'lucide-react';
// import { PricingInput as PricingInputType, calculatePricing } from '@/lib/pricing-engine';
// import PricingResultPage from './PricingResult';

// const productCatalog: Record<string, string> = {
//   'SKU-1042': 'Industrial Valve Assembly',
//   'SKU-2088': 'Precision Bearing Set',
//   'SKU-3321': 'Hydraulic Pump Motor',
//   'SKU-4455': 'Stainless Steel Flange',
//   'SKU-5500': 'Pressure Gauge Sensor',
// };

// export default function PricingInputPage() {
//   const [showResult, setShowResult] = useState(false);
//   const [result, setResult] = useState<ReturnType<typeof calculatePricing> | null>(null);
//   const [formData, setFormData] = useState<PricingInputType>({
//     sku: '',
//     productName: '',
//     customerName: '',
//     customerTier: 'Standard',
//     salesChannel: 'Traditional',
//     costPrice: 0,
//     currentStock: 0,
//     inventoryAging: 0,
//     demandLevel: 'Medium',
//     competitorPrice: undefined,
//   });

//   const handleSkuChange = (value: string) => {
//     setFormData((prev) => ({
//       ...prev,
//       sku: value,
//       productName: productCatalog[value] || prev.productName,
//     }));
//   };

//   const handleSubmit = (e: React.FormEvent) => {
//     e.preventDefault();
//     const pricing = calculatePricing(formData);
//     setResult(pricing);
//     setShowResult(true);
//   };

//   if (showResult && result) {
//     return (
//       <PricingResultPage
//         input={formData}
//         result={result}
//         onBack={() => setShowResult(false)}
//       />
//     );
//   }

//   return (
//     <div className="space-y-6 animate-fade-in max-w-3xl">
//       <div>
//         <h1 className="text-2xl font-bold text-foreground">New Pricing Analysis</h1>
//         <p className="text-muted-foreground mt-1">Enter product and market data to generate optimal pricing</p>
//       </div>

//       <form onSubmit={handleSubmit}>
//         <Card>
//           <CardHeader>
//             <CardTitle className="text-lg flex items-center gap-2">
//               <Calculator className="h-5 w-5 text-primary" />
//               Pricing Input
//             </CardTitle>
//             <CardDescription>Fill in all required fields for accurate pricing recommendations</CardDescription>
//           </CardHeader>
//           <CardContent className="space-y-6">
//             {/* Product Info */}
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//               <div className="space-y-2">
//                 <Label>SKU / Product ID</Label>
//                 <Select value={formData.sku} onValueChange={handleSkuChange}>
//                   <SelectTrigger>
//                     <SelectValue placeholder="Select SKU" />
//                   </SelectTrigger>
//                   <SelectContent>
//                     {Object.entries(productCatalog).map(([sku, name]) => (
//                       <SelectItem key={sku} value={sku}>
//                         {sku} – {name}
//                       </SelectItem>
//                     ))}
//                   </SelectContent>
//                 </Select>
//               </div>
//               <div className="space-y-2">
//                 <Label>Product Name</Label>
//                 <Input
//                   value={formData.productName}
//                   onChange={(e) => setFormData((p) => ({ ...p, productName: e.target.value }))}
//                   placeholder="Auto-filled from SKU"
//                 />
//               </div>
//             </div>

//             {/* Customer Info */}
//             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//               <div className="space-y-2">
//                 <Label>Customer Name</Label>
//                 <Input
//                   value={formData.customerName}
//                   onChange={(e) => setFormData((p) => ({ ...p, customerName: e.target.value }))}
//                   placeholder="Enter customer name"
//                   required
//                 />
//               </div>
//               <div className="space-y-2">
//                 <Label>Customer Tier</Label>
//                 <Select
//                   value={formData.customerTier}
//                   onValueChange={(v) => setFormData((p) => ({ ...p, customerTier: v as PricingInputType['customerTier'] }))}
//                 >
//                   <SelectTrigger><SelectValue /></SelectTrigger>
//                   <SelectContent>
//                     <SelectItem value="Standard">Standard</SelectItem>
//                     <SelectItem value="Loyal">Loyal</SelectItem>
//                     <SelectItem value="Corporate">Corporate</SelectItem>
//                   </SelectContent>
//                 </Select>
//               </div>
//               <div className="space-y-2">
//                 <Label>Sales Channel</Label>
//                 <Select
//                   value={formData.salesChannel}
//                   onValueChange={(v) => setFormData((p) => ({ ...p, salesChannel: v as PricingInputType['salesChannel'] }))}
//                 >
//                   <SelectTrigger><SelectValue /></SelectTrigger>
//                   <SelectContent>
//                     <SelectItem value="Traditional">Traditional</SelectItem>
//                     <SelectItem value="Corporate">Corporate</SelectItem>
//                     <SelectItem value="E-commerce">E-commerce</SelectItem>
//                     <SelectItem value="Project">Project</SelectItem>
//                   </SelectContent>
//                 </Select>
//               </div>
//             </div>

//             {/* Pricing & Inventory */}
//             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//               <div className="space-y-2">
//                 <Label>Cost Price ($)</Label>
//                 <Input
//                   type="number"
//                   min="0"
//                   step="0.01"
//                   value={formData.costPrice || ''}
//                   onChange={(e) => setFormData((p) => ({ ...p, costPrice: parseFloat(e.target.value) || 0 }))}
//                   required
//                 />
//               </div>
//               <div className="space-y-2">
//                 <Label>Current Stock Level</Label>
//                 <Input
//                   type="number"
//                   min="0"
//                   value={formData.currentStock || ''}
//                   onChange={(e) => setFormData((p) => ({ ...p, currentStock: parseInt(e.target.value) || 0 }))}
//                   required
//                 />
//               </div>
//               <div className="space-y-2">
//                 <Label>Inventory Aging (days)</Label>
//                 <Input
//                   type="number"
//                   min="0"
//                   value={formData.inventoryAging || ''}
//                   onChange={(e) => setFormData((p) => ({ ...p, inventoryAging: parseInt(e.target.value) || 0 }))}
//                   required
//                 />
//               </div>
//             </div>

//             {/* Market */}
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//               <div className="space-y-2">
//                 <Label>Demand Level</Label>
//                 <Select
//                   value={formData.demandLevel}
//                   onValueChange={(v) => setFormData((p) => ({ ...p, demandLevel: v as PricingInputType['demandLevel'] }))}
//                 >
//                   <SelectTrigger><SelectValue /></SelectTrigger>
//                   <SelectContent>
//                     <SelectItem value="Low">Low</SelectItem>
//                     <SelectItem value="Medium">Medium</SelectItem>
//                     <SelectItem value="High">High</SelectItem>
//                   </SelectContent>
//                 </Select>
//               </div>
//               <div className="space-y-2">
//                 <Label>Competitor Benchmark Price ($) <span className="text-muted-foreground">(optional)</span></Label>
//                 <Input
//                   type="number"
//                   min="0"
//                   step="0.01"
//                   value={formData.competitorPrice || ''}
//                   onChange={(e) => setFormData((p) => ({ ...p, competitorPrice: parseFloat(e.target.value) || undefined }))}
//                 />
//               </div>
//             </div>

//             <div className="pt-2">
//               <Button type="submit" className="gap-2" size="lg">
//                 <Sparkles className="h-4 w-4" />
//                 Generate AI Recommendation
//               </Button>
//             </div>
//           </CardContent>
//         </Card>
//       </form>
//     </div>
//   );
// }
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  PricingInput as PricingInputData, 
  getAiRecommendation 
} from '@/lib/pricing-engine';
import PricingResult from './PricingResult';
import { Calculator, Save, RefreshCcw, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const PricingInput = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<any>(null);
  
  const [formData, setFormData] = useState<PricingInputData>({
    sku: '',
    productName: '',
    customerName: '',
    customerTier: 'Standard',
    salesChannel: 'Traditional',
    costPrice: 0,
    currentStock: 0,
    inventoryAging: 0,
    demandLevel: 'Medium',
    competitorPrice: 0,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'costPrice' || name === 'currentStock' || name === 'inventoryAging' || name === 'competitorPrice' 
        ? parseFloat(value) || 0 
        : value
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Calls your Azure AI Foundry grounded agent
      const recommendation = await getAiRecommendation(formData);
      setResult(recommendation);
      setShowResult(true);
      
      toast({
        title: "Pricing Recommendation Generated",
        description: "AI has successfully analyzed inventory and margin rules.",
      });
    } catch (error) {
      console.error("AI Recommendation Error:", error);
      toast({
        title: "Generation Failed",
        description: "Could not connect to the AI Agent. Please check your .env configuration.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({
      sku: '',
      productName: '',
      customerName: '',
      customerTier: 'Standard',
      salesChannel: 'Traditional',
      costPrice: 0,
      currentStock: 0,
      inventoryAging: 0,
      demandLevel: 'Medium',
      competitorPrice: 0,
    });
    setShowResult(false);
    setResult(null);
  };

  if (showResult && result) {
    return (
      <PricingResult 
        input={formData} 
        result={result} 
        onBack={() => setShowResult(false)} 
      />
    );
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Price Recommendation</h1>
            <p className="text-muted-foreground">Input product and market data for AI-driven pricing analysis.</p>
          </div>
          <Button variant="outline" onClick={handleReset} className="flex items-center gap-2">
            <RefreshCcw className="h-4 w-4" /> Reset Form
          </Button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-border/50 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Product Information</CardTitle>
                <CardDescription>Basic product identification and cost data.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="sku">Product SKU</Label>
                  <Input 
                    id="sku" 
                    name="sku" 
                    placeholder="e.g. CH-BM-102" 
                    required 
                    value={formData.sku}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="productName">Product Name</Label>
                  <Input 
                    id="productName" 
                    name="productName" 
                    placeholder="e.g. Steel Beam Grade A" 
                    required 
                    value={formData.productName}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="costPrice">Unit Cost (MYR)</Label>
                    <Input 
                      id="costPrice" 
                      name="costPrice" 
                      type="number" 
                      step="0.01" 
                      required 
                      value={formData.costPrice || ''}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="currentStock">Current Stock</Label>
                    <Input 
                      id="currentStock" 
                      name="currentStock" 
                      type="number" 
                      required 
                      value={formData.currentStock || ''}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="inventoryAging">Inventory Aging (Days)</Label>
                  <Input 
                    id="inventoryAging" 
                    name="inventoryAging" 
                    type="number" 
                    required 
                    value={formData.inventoryAging || ''}
                    onChange={handleInputChange}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Customer & Market</CardTitle>
                <CardDescription>Details about the target segment and market conditions.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="customerName">Customer Name</Label>
                  <Input 
                    id="customerName" 
                    name="customerName" 
                    placeholder="e.g. BuildRight Construction" 
                    required 
                    value={formData.customerName}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="customerTier">Customer Tier</Label>
                    <Select 
                      value={formData.customerTier} 
                      onValueChange={(v) => handleSelectChange('customerTier', v)}
                    >
                      <SelectTrigger id="customerTier">
                        <SelectValue placeholder="Select tier" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Standard">Standard</SelectItem>
                        <SelectItem value="Loyal">Loyal</SelectItem>
                        <SelectItem value="Corporate">Corporate</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="salesChannel">Sales Channel</Label>
                    <Select 
                      value={formData.salesChannel} 
                      onValueChange={(v) => handleSelectChange('salesChannel', v)}
                    >
                      <SelectTrigger id="salesChannel">
                        <SelectValue placeholder="Select channel" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Traditional">Traditional</SelectItem>
                        <SelectItem value="Corporate">Corporate</SelectItem>
                        <SelectItem value="E-commerce">E-commerce</SelectItem>
                        <SelectItem value="Project">Project</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="demandLevel">Market Demand</Label>
                  <Select 
                    value={formData.demandLevel} 
                    onValueChange={(v) => handleSelectChange('demandLevel', v)}
                  >
                    <SelectTrigger id="demandLevel">
                      <SelectValue placeholder="Select demand" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low (Overstock)</SelectItem>
                      <SelectItem value="Medium">Medium (Balanced)</SelectItem>
                      <SelectItem value="High">High (In Demand)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="competitorPrice">Competitor Price (MYR) - Optional</Label>
                  <Input 
                    id="competitorPrice" 
                    name="competitorPrice" 
                    type="number" 
                    step="0.01" 
                    value={formData.competitorPrice || ''}
                    onChange={handleInputChange}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-8 flex justify-end gap-4">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={() => navigate('/dashboard')}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="bg-primary hover:bg-primary/90 min-w-[200px]"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Analysis...
                </>
              ) : (
                <>
                  <Calculator className="mr-2 h-4 w-4" />
                  Generate Recommendation
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
};

export default PricingInput;
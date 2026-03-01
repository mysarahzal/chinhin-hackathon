import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Lightbulb,
  Send,
  Sliders,
  DollarSign,
  TrendingUp,
  ShieldCheck,
} from 'lucide-react';
import { PricingInput, PricingResult, simulatePrice } from '@/lib/pricing-engine';
import { toast } from 'sonner';

interface Props {
  input: PricingInput;
  result: PricingResult;
  onBack: () => void;
}

const complianceConfig = {
  Pass: { icon: CheckCircle2, className: 'status-safe', label: 'Margin Safe' },
  Warning: { icon: AlertTriangle, className: 'status-warning', label: 'Margin Warning' },
  Fail: { icon: XCircle, className: 'status-danger', label: 'Below Threshold' },
};

export default function PricingResultPage({ input, result, onBack }: Props) {
  const [adjustedPrice, setAdjustedPrice] = useState(result.recommendedPrice);
  const simulation = simulatePrice(input.costPrice, adjustedPrice, input.currentStock, result.minimumMargin);
  const compliance = complianceConfig[result.marginCompliance];
  const ComplianceIcon = compliance.icon;

  const handleSubmitForApproval = () => {
    toast.success('Pricing decision submitted for approval', {
      description: `${input.productName} at $${adjustedPrice.toFixed(2)} sent to approver.`,
    });
  };

  const handleExportCSV = () => {
    const csv = [
      ['Field', 'Value'],
      ['SKU', input.sku],
      ['Product', input.productName],
      ['Customer', input.customerName],
      ['Cost Price', input.costPrice.toString()],
      ['Recommended Price', result.recommendedPrice.toString()],
      ['Adjusted Price', adjustedPrice.toString()],
      ['Margin %', simulation.margin.toString()],
      ['Profit/Unit', simulation.profitPerUnit.toString()],
    ].map((r) => r.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pricing-${input.sku}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported successfully');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pricing Recommendation</h1>
          <p className="text-muted-foreground">{input.productName} – {input.customerName}</p>
        </div>
      </div>

      {/* Result Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="metric-card">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Recommended Price</p>
                <p className="text-xl font-bold text-foreground">${result.recommendedPrice.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="metric-card">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Expected Margin</p>
                <p className="text-xl font-bold text-foreground">{result.expectedMargin.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="metric-card">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-info/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Profit / Unit</p>
                <p className="text-xl font-bold text-foreground">${result.profitPerUnit.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="metric-card">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                result.marginCompliance === 'Pass' ? 'bg-success/10' :
                result.marginCompliance === 'Warning' ? 'bg-warning/10' : 'bg-danger/10'
              }`}>
                <ComplianceIcon className={`h-5 w-5 ${
                  result.marginCompliance === 'Pass' ? 'text-success' :
                  result.marginCompliance === 'Warning' ? 'text-warning' : 'text-danger'
                }`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Compliance</p>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${compliance.className}`}>
                  {compliance.label}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rationale */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-warning" />
              Pricing Rationale
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {result.rationale.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <ShieldCheck className="h-4 w-4 text-info mt-0.5 shrink-0" />
                  <span className="text-foreground">{r}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Simulator */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sliders className="h-4 w-4 text-primary" />
              Price Simulator
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Adjusted Selling Price ($)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={adjustedPrice}
                onChange={(e) => setAdjustedPrice(parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-xs text-muted-foreground">Margin</p>
                <p className={`text-lg font-bold ${simulation.belowThreshold ? 'text-danger' : 'text-success'}`}>
                  {simulation.margin.toFixed(1)}%
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-xs text-muted-foreground">Profit / Unit</p>
                <p className={`text-lg font-bold ${simulation.profitPerUnit < 0 ? 'text-danger' : 'text-foreground'}`}>
                  ${simulation.profitPerUnit.toFixed(2)}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-xs text-muted-foreground">Est. Revenue</p>
                <p className="text-lg font-bold text-foreground">${simulation.revenue.toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-xs text-muted-foreground">Est. Profit</p>
                <p className={`text-lg font-bold ${simulation.profit < 0 ? 'text-danger' : 'text-foreground'}`}>
                  ${simulation.profit.toLocaleString()}
                </p>
              </div>
            </div>

            {simulation.belowThreshold && (
              <div className="flex items-center gap-2 text-sm text-danger bg-danger/10 rounded-md p-3 border border-danger/20">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Margin below minimum threshold ({result.minimumMargin}%). Approval required.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button onClick={handleSubmitForApproval} className="gap-2">
          <Send className="h-4 w-4" />
          Submit for Approval
        </Button>
        <Button variant="outline" onClick={handleExportCSV}>
          Export CSV
        </Button>
      </div>
    </div>
  );
}

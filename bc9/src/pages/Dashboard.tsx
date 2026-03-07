import { useAuth } from '@/contexts/AuthContext';
import { dashboardMetrics, mockDecisions } from '@/lib/mock-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BarChart3,
  TrendingUp,
  ShieldCheck,
  Clock,
  DollarSign,
  AlertTriangle,
} from 'lucide-react';

const statusColors: Record<string, string> = {
  Approved: 'status-safe',
  Pending: 'status-warning',
  Rejected: 'status-danger',
};

export default function Dashboard() {
  const { user } = useAuth();

  const metrics = [
    {
      label: 'Total Decisions',
      value: dashboardMetrics.totalDecisions,
      icon: BarChart3,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      label: 'Avg Margin',
      value: `${dashboardMetrics.avgMargin}%`,
      icon: TrendingUp,
      color: 'text-success',
      bg: 'bg-success/10',
    },
    {
      label: 'Margin Compliance',
      value: `${dashboardMetrics.marginCompliance}%`,
      icon: ShieldCheck,
      color: 'text-info',
      bg: 'bg-info/10',
    },
    {
      label: 'Avg Decision Time',
      value: dashboardMetrics.avgDecisionTime,
      icon: Clock,
      color: 'text-warning',
      bg: 'bg-warning/10',
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome back, {user?.name}</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <Card key={m.label} className="metric-card">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{m.label}</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{m.value}</p>
                </div>
                <div className={`h-10 w-10 rounded-lg ${m.bg} flex items-center justify-center`}>
                  <m.icon className={`h-5 w-5 ${m.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue Impact Card */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-success/10 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Estimated Revenue Impact (This Month)</p>
              <p className="text-3xl font-bold text-foreground">
                ${dashboardMetrics.revenueImpact.toLocaleString()}
              </p>
            </div>
            {dashboardMetrics.pendingApprovals > 0 && (
              <div className="ml-auto flex items-center gap-2 bg-warning/10 text-warning rounded-lg px-3 py-2">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">{dashboardMetrics.pendingApprovals} pending approvals</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Decisions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Pricing Decisions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">ID</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Product</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Customer</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">Cost</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">Final Price</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">Margin</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {mockDecisions.map((d) => (
                  <tr key={d.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                    <td className="py-3 px-2 font-mono text-xs">{d.id}</td>
                    <td className="py-3 px-2">
                      <div>
                        <p className="font-medium text-foreground">{d.productName}</p>
                        <p className="text-xs text-muted-foreground">{d.sku}</p>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-foreground">{d.customerName}</td>
                    <td className="py-3 px-2 text-right font-mono text-foreground">${d.costPrice.toFixed(2)}</td>
                    <td className="py-3 px-2 text-right font-mono font-medium text-foreground">${d.finalPrice.toFixed(2)}</td>
                    <td className="py-3 px-2 text-right">
                      <span className={`font-medium ${d.margin >= 20 ? 'text-success' : d.margin >= 15 ? 'text-warning' : 'text-danger'}`}>
                        {d.margin.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusColors[d.status]}`}>
                        {d.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

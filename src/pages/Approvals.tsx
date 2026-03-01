import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { mockDecisions, PricingDecision } from '@/lib/mock-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  CheckCircle2,
  XCircle,
  Clock,
  MessageSquare,
  ShieldCheck,
  Lightbulb,
} from 'lucide-react';
import { toast } from 'sonner';

export default function Approvals() {
  const { user } = useAuth();
  const [decisions, setDecisions] = useState<PricingDecision[]>(mockDecisions);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [comment, setComment] = useState('');

  const isApprover = user?.role === 'Approver';
  const pending = decisions.filter((d) => d.status === 'Pending');
  const history = decisions.filter((d) => d.status !== 'Pending');
  const selected = decisions.find((d) => d.id === selectedId);

  const handleAction = (id: string, action: 'Approved' | 'Rejected') => {
    setDecisions((prev) =>
      prev.map((d) =>
        d.id === id ? { ...d, status: action, approverComment: comment || undefined } : d
      )
    );
    setComment('');
    setSelectedId(null);
    toast.success(`Decision ${action.toLowerCase()} successfully`);
  };

  const statusConfig: Record<string, { icon: typeof CheckCircle2; className: string }> = {
    Approved: { icon: CheckCircle2, className: 'status-safe' },
    Pending: { icon: Clock, className: 'status-warning' },
    Rejected: { icon: XCircle, className: 'status-danger' },
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Decision Review & Approval</h1>
        <p className="text-muted-foreground mt-1">
          {isApprover ? 'Review and approve pricing decisions' : 'Track your submitted decisions'}
        </p>
      </div>

      {/* Pending Approvals */}
      {pending.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Clock className="h-5 w-5 text-warning" />
            Pending ({pending.length})
          </h2>
          {pending.map((d) => (
            <Card key={d.id} className={`transition-shadow ${selectedId === d.id ? 'ring-2 ring-primary' : ''}`}>
              <CardContent className="p-5">
                <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-muted-foreground">{d.id}</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusConfig[d.status].className}`}>
                        {d.status}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{d.productName}</p>
                      <p className="text-sm text-muted-foreground">{d.customerName} · {d.customerTier} · {d.salesChannel}</p>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      <div className="p-2 rounded bg-muted">
                        <p className="text-xs text-muted-foreground">Cost</p>
                        <p className="font-medium text-foreground">${d.costPrice.toFixed(2)}</p>
                      </div>
                      <div className="p-2 rounded bg-muted">
                        <p className="text-xs text-muted-foreground">AI Price</p>
                        <p className="font-medium text-foreground">${d.recommendedPrice.toFixed(2)}</p>
                      </div>
                      <div className="p-2 rounded bg-muted">
                        <p className="text-xs text-muted-foreground">Final Price</p>
                        <p className="font-medium text-foreground">${d.finalPrice.toFixed(2)}</p>
                      </div>
                      <div className="p-2 rounded bg-muted">
                        <p className="text-xs text-muted-foreground">Margin</p>
                        <p className={`font-medium ${d.margin >= 20 ? 'text-success' : d.margin >= 15 ? 'text-warning' : 'text-danger'}`}>
                          {d.margin.toFixed(1)}%
                        </p>
                      </div>
                    </div>

                    {/* Rationale */}
                    <div className="flex items-start gap-2 p-3 rounded bg-muted/50">
                      <Lightbulb className="h-4 w-4 text-warning mt-0.5 shrink-0" />
                      <div className="text-sm text-muted-foreground space-y-1">
                        {d.rationale.map((r, i) => (
                          <p key={i}>{r}</p>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Approval actions */}
                  {isApprover && (
                    <div className="lg:w-64 space-y-3">
                      {selectedId === d.id ? (
                        <>
                          <Textarea
                            placeholder="Add comment (optional)"
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            rows={3}
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="flex-1 gap-1 bg-success hover:bg-success/90 text-success-foreground"
                              onClick={() => handleAction(d.id, 'Approved')}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="flex-1 gap-1"
                              onClick={() => handleAction(d.id, 'Rejected')}
                            >
                              <XCircle className="h-3.5 w-3.5" /> Reject
                            </Button>
                          </div>
                          <Button size="sm" variant="ghost" className="w-full" onClick={() => setSelectedId(null)}>
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <Button size="sm" variant="outline" className="w-full gap-1" onClick={() => setSelectedId(d.id)}>
                          <MessageSquare className="h-3.5 w-3.5" /> Review
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Decision History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">ID</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Product</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">Final Price</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">Margin</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Status</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Comment</th>
                </tr>
              </thead>
              <tbody>
                {history.map((d) => {
                  const sc = statusConfig[d.status];
                  return (
                    <tr key={d.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                      <td className="py-3 px-2 font-mono text-xs">{d.id}</td>
                      <td className="py-3 px-2 text-foreground">{d.productName}</td>
                      <td className="py-3 px-2 text-right font-mono font-medium text-foreground">${d.finalPrice.toFixed(2)}</td>
                      <td className="py-3 px-2 text-right">
                        <span className={`font-medium ${d.margin >= 20 ? 'text-success' : d.margin >= 15 ? 'text-warning' : 'text-danger'}`}>
                          {d.margin.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${sc.className}`}>
                          {d.status}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-muted-foreground text-xs max-w-[200px] truncate">{d.approverComment || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

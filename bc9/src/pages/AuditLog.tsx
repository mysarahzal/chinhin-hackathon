import { mockAuditLog } from '@/lib/mock-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollText, ArrowRight } from 'lucide-react';

export default function AuditLog() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Audit Log</h1>
        <p className="text-muted-foreground mt-1">Complete history of pricing actions and decisions</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ScrollText className="h-5 w-5 text-primary" />
            Activity Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-0">
            {mockAuditLog.map((entry, idx) => (
              <div
                key={entry.id}
                className={`flex gap-4 py-4 ${idx < mockAuditLog.length - 1 ? 'border-b' : ''}`}
              >
                <div className="flex flex-col items-center">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <ArrowRight className="h-3.5 w-3.5 text-primary" />
                  </div>
                  {idx < mockAuditLog.length - 1 && (
                    <div className="w-px flex-1 bg-border mt-2" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-foreground">{entry.action}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{entry.details}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground">
                        {new Date(entry.timestamp).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                      <p className="text-xs text-muted-foreground">{entry.user}</p>
                    </div>
                  </div>
                  <div className="flex gap-4 mt-2 text-xs">
                    <span className="text-muted-foreground">
                      Decision: <span className="font-mono text-foreground">{entry.decisionId}</span>
                    </span>
                    {entry.originalPrice !== entry.adjustedPrice && (
                      <span className="text-muted-foreground">
                        ${entry.originalPrice.toFixed(2)} → <span className="font-medium text-foreground">${entry.adjustedPrice.toFixed(2)}</span>
                      </span>
                    )}
                    <span className="text-muted-foreground">
                      Margin: <span className={`font-medium ${entry.margin >= 20 ? 'text-success' : entry.margin >= 15 ? 'text-warning' : 'text-danger'}`}>
                        {entry.margin.toFixed(1)}%
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

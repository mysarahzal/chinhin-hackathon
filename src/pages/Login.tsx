import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Brain, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (login(email, password)) {
      navigate('/dashboard');
    } else {
      setError('Invalid credentials. Try sarah@company.com or michael@company.com');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary mb-4">
            <Brain className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">AI Pricing Strategist</h1>
          <p className="text-muted-foreground mt-1">Smart Price Optimization for Maximum Profit</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sign In</CardTitle>
            <CardDescription>Enter your credentials to access the pricing platform</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-danger bg-danger/10 rounded-md p-3">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full">
                Sign In
              </Button>
            </form>

            <div className="mt-6 p-3 rounded-md bg-muted">
              <p className="text-xs font-medium text-muted-foreground mb-2">Demo Accounts</p>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p><span className="font-medium text-foreground">Sales Manager:</span> sarah@company.com</p>
                <p><span className="font-medium text-foreground">Approver:</span> michael@company.com</p>
                <p className="text-muted-foreground/70">Any password works</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'Sales Manager' | 'Approver';
}

export interface PricingDecision {
  id: string;
  sku: string;
  productName: string;
  customerName: string;
  customerTier: string;
  salesChannel: string;
  costPrice: number;
  recommendedPrice: number;
  finalPrice: number;
  margin: number;
  status: 'Pending' | 'Approved' | 'Rejected';
  submittedBy: string;
  submittedAt: string;
  approverComment?: string;
  rationale: string[];
}

export interface AuditEntry {
  id: string;
  decisionId: string;
  action: string;
  user: string;
  timestamp: string;
  details: string;
  originalPrice: number;
  adjustedPrice: number;
  margin: number;
}

export const mockUsers: User[] = [
  { id: '1', name: 'Sarah Chen', email: 'sarah@company.com', role: 'Sales Manager' },
  { id: '2', name: 'Michael Torres', email: 'michael@company.com', role: 'Approver' },
];

export const mockDecisions: PricingDecision[] = [
  {
    id: 'PD-001',
    sku: 'SKU-1042',
    productName: 'Industrial Valve Assembly',
    customerName: 'Acme Corp',
    customerTier: 'Corporate',
    salesChannel: 'Corporate',
    costPrice: 245.00,
    recommendedPrice: 318.50,
    finalPrice: 310.00,
    margin: 21.0,
    status: 'Approved',
    submittedBy: 'Sarah Chen',
    submittedAt: '2026-02-28T10:30:00Z',
    rationale: ['Medium demand – standard pricing applied', 'Corporate customer tier – moderate flexibility allowed'],
  },
  {
    id: 'PD-002',
    sku: 'SKU-2088',
    productName: 'Precision Bearing Set',
    customerName: 'BuildRight Ltd',
    customerTier: 'Loyal',
    salesChannel: 'Traditional',
    costPrice: 89.00,
    recommendedPrice: 115.70,
    finalPrice: 115.70,
    margin: 23.1,
    status: 'Approved',
    submittedBy: 'Sarah Chen',
    submittedAt: '2026-02-27T14:15:00Z',
    rationale: ['High demand detected – margin protected', 'Loyal customer tier – moderate flexibility allowed'],
  },
  {
    id: 'PD-003',
    sku: 'SKU-3321',
    productName: 'Hydraulic Pump Motor',
    customerName: 'TechFlow Inc',
    customerTier: 'Standard',
    salesChannel: 'E-commerce',
    costPrice: 520.00,
    recommendedPrice: 676.00,
    finalPrice: 650.00,
    margin: 20.0,
    status: 'Pending',
    submittedBy: 'Sarah Chen',
    submittedAt: '2026-03-01T09:00:00Z',
    rationale: ['Low demand – slight discount applied', 'Stock aging > 90 days – discount recommended'],
  },
  {
    id: 'PD-004',
    sku: 'SKU-4455',
    productName: 'Stainless Steel Flange',
    customerName: 'PipePro Solutions',
    customerTier: 'Standard',
    salesChannel: 'Project',
    costPrice: 42.00,
    recommendedPrice: 52.50,
    finalPrice: 48.00,
    margin: 12.5,
    status: 'Rejected',
    submittedBy: 'Sarah Chen',
    submittedAt: '2026-02-26T16:45:00Z',
    approverComment: 'Margin too low for standard customer. Please re-evaluate.',
    rationale: ['Stock aging > 120 days – significant discount recommended', 'High inventory level – volume discount applied'],
  },
];

export const mockAuditLog: AuditEntry[] = [
  {
    id: 'AL-001',
    decisionId: 'PD-001',
    action: 'AI Recommendation Generated',
    user: 'System',
    timestamp: '2026-02-28T10:28:00Z',
    details: 'AI engine generated recommended price of $318.50',
    originalPrice: 318.50,
    adjustedPrice: 318.50,
    margin: 23.1,
  },
  {
    id: 'AL-002',
    decisionId: 'PD-001',
    action: 'Price Adjusted by User',
    user: 'Sarah Chen',
    timestamp: '2026-02-28T10:30:00Z',
    details: 'User adjusted price from $318.50 to $310.00',
    originalPrice: 318.50,
    adjustedPrice: 310.00,
    margin: 21.0,
  },
  {
    id: 'AL-003',
    decisionId: 'PD-001',
    action: 'Submitted for Approval',
    user: 'Sarah Chen',
    timestamp: '2026-02-28T10:31:00Z',
    details: 'Decision submitted for approval',
    originalPrice: 318.50,
    adjustedPrice: 310.00,
    margin: 21.0,
  },
  {
    id: 'AL-004',
    decisionId: 'PD-001',
    action: 'Approved',
    user: 'Michael Torres',
    timestamp: '2026-02-28T11:00:00Z',
    details: 'Decision approved by Michael Torres',
    originalPrice: 318.50,
    adjustedPrice: 310.00,
    margin: 21.0,
  },
  {
    id: 'AL-005',
    decisionId: 'PD-003',
    action: 'AI Recommendation Generated',
    user: 'System',
    timestamp: '2026-03-01T08:58:00Z',
    details: 'AI engine generated recommended price of $676.00',
    originalPrice: 676.00,
    adjustedPrice: 676.00,
    margin: 23.1,
  },
  {
    id: 'AL-006',
    decisionId: 'PD-003',
    action: 'Price Adjusted by User',
    user: 'Sarah Chen',
    timestamp: '2026-03-01T09:00:00Z',
    details: 'User adjusted price from $676.00 to $650.00',
    originalPrice: 676.00,
    adjustedPrice: 650.00,
    margin: 20.0,
  },
];

export const dashboardMetrics = {
  totalDecisions: 47,
  avgMargin: 22.4,
  marginCompliance: 89.4,
  avgDecisionTime: '4.2 min',
  pendingApprovals: 3,
  revenueImpact: 142580,
};

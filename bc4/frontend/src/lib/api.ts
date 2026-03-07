import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

// Attach JWT automatically
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refresh = localStorage.getItem("refresh_token");
      if (refresh) {
        try {
          const { data } = await axios.post(`${API_BASE}/auth/refresh`, { refresh_token: refresh });
          localStorage.setItem("access_token", data.access_token);
          localStorage.setItem("refresh_token", data.refresh_token);
          original.headers.Authorization = `Bearer ${data.access_token}`;
          return api(original);
        } catch {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          localStorage.removeItem("user");
          if (typeof window !== "undefined") window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// ── Typed API functions ──────────────────────────────────────────────────

export interface User {
  id: string;
  username: string;
  email: string;
  full_name: string;
  role: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export interface AnalysisResult {
  sku: string;
  total_stock: number;
  weighted_demand: number;
  coverage_months: number;
  risk_level: string;
  slow_moving: boolean;
  quality_risk: boolean;
  projected_lead_time_demand: number;
  recommended_purchase_qty: number;
  management_justification: string;
  pr_summary: string;
  seasonality_factor: number;
  forecast_confidence: number;
  explainability: string;
  priority_score: number;
  executive_summary?: string;
  seasonal_flag?: string;
  adjusted_demand?: number;
  current_stock?: number;
  incoming_stock?: number;
  avg_3m?: number;
  avg_6m?: number;
  lead_time_months?: number;
  failure_rate_pct?: number;
  unit_price?: number;
}

export interface WhatIfDelta {
  qty_delta: number;
  risk_changed: boolean;
  risk_before: string;
  risk_after: string;
  coverage_delta: number;
  demand_delta: number;
  recommendation: string;
}

export interface WhatIfCompareResponse {
  baseline: AnalysisResult;
  scenario: AnalysisResult;
  delta: WhatIfDelta;
}

export interface RunSummary {
  id: string;
  run_type: string;
  total_skus: number;
  high_risk_count: number;
  total_recommended_units: number;
  avg_coverage: number;
  created_at: string;
  service_level: number;
}

export interface ApprovalItem {
  id: string;
  run_id: string;
  sku: string;
  status: string;
  recommended_qty: number;
  risk_level: string;
  approved_by?: string;
  decided_at?: string;
  created_at: string;
}

export interface PRItem {
  id: string;
  sku: string;
  quantity: number;
  risk_level: string;
  unit_price?: number;
  total_value?: number;
}

export interface PurchaseRequest {
  id: string;
  pr_number?: number;
  run_id?: string;
  status: string;
  created_at: string;
  total_value: number;
  items: PRItem[];
}

export interface AuditEntry {
  id: string;
  action: string;
  entity_type?: string;
  entity_id?: string;
  user_id?: string;
  details?: Record<string, any>;
  created_at: string;
}

export interface DashboardStats {
  total_runs: number;
  total_skus_analyzed: number;
  total_high_risk: number;
  total_approved: number;
  total_pending: number;
  total_prs: number;
  total_pr_value: number;
  risk_distribution: Record<string, number>;
  latest_run_id?: string;
  latest_run_at?: string;
}

// Auth
export const authLogin = (username: string, password: string) =>
  api.post<LoginResponse>("/auth/login", { username, password });

export const authMe = () => api.get<User>("/auth/me");

// Dashboard
export const getDashboardStats = () => api.get<DashboardStats>("/dashboard/stats");

// Analysis
export const analyzeSingle = (data: any) => api.post("/analyze", data);
export const analyzeBulk = (items: any[]) => api.post("/analyze-bulk", { items });
export const listRuns = () => api.get<RunSummary[]>("/analysis/runs");
export const getRun = (id: string) => api.get<RunSummary>(`/analysis/run/${id}`);
export const getRunResults = (id: string) => api.get<AnalysisResult[]>(`/analysis/run/${id}/results`);

// What-if
export const whatIfCompare = (data: {
  sku: string;
  current_stock: number;
  incoming_stock: number;
  avg_3m: number;
  avg_6m: number;
  lead_time_months: number;
  failure_rate_pct: number;
  unit_price?: number;
  month?: number;
  demand_change_pct?: number;
  lead_time_change?: number;
  stock_adjustment?: number;
}) => api.post<WhatIfCompareResponse>("/what-if", data);

// Approvals
export const listApprovals = (params?: any) => api.get<ApprovalItem[]>("/approvals", { params });
export const approveSku = (runId: string, sku: string) => api.post(`/approvals/${runId}/${encodeURIComponent(sku)}/approve`);
export const rejectSku = (runId: string, sku: string) => api.post(`/approvals/${runId}/${encodeURIComponent(sku)}/reject`);
export const approveAll = (runId: string) => api.post(`/approvals/${runId}/approve-all`);

// PRs
export const createPrFromRun = (runId: string) => api.post(`/prs/from-run/${runId}`);
export const listPrs = () => api.get<PurchaseRequest[]>("/prs");
export const getPr = (id: string) => api.get<PurchaseRequest>(`/prs/${id}`);
export const exportPrPdf = (id: string) => api.get(`/prs/${id}/export/pdf`, { responseType: "blob" });
export const exportPrExcel = (id: string) => api.get(`/prs/${id}/export/excel`, { responseType: "blob" });

// Audit
export const listAudit = (params?: any) => api.get<AuditEntry[]>("/audit", { params });

// Settings
export const getSettings = () => api.get("/settings");
export const updateSettings = (data: any) => api.put("/settings", data);

// Seed
export const seedDemo = () => api.post("/seed/demo");

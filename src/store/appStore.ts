import { create } from 'zustand';

export interface Competitor {
  id: string;
  name: string;
  shortName: string;
  listing: boolean;
  marketCap: string;
  mainProducts: string[];
  coreStrengths: string[];
  marketShare: {
    nationalGrid: string;
    region: string;
  };
  recentAction: string;
  threatLevel: 'high' | 'medium' | 'low';
  status: string;
}

export interface CompetitorNews {
  id: string;
  competitorId: string;
  competitorName: string;
  title: string;
  content: string;
  summary: string;
  tag: 'major' | 'new' | 'bid' | 'strategy' | 'personnel' | 'report';
  tagLabel: string;
  impactAnalysis?: string;
  source: string;
  sourceUrl?: string;
  publishedAt: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  actionRequired: boolean;
  pushedTo: string[];
  status: string;
}

export interface Policy {
  id: string;
  title: string;
  content: string;
  source: string;
  sourceUrl?: string;
  publishedAt: string;
  impactLevel: 'high' | 'medium' | 'low';
  affectedProducts: string[];
  opportunities: string[];
  threats: string[];
  impactAnalysis?: string;
  recommendation?: string;
  status: string;
}

export interface BidResult {
  id: string;
  competitorId: string;
  competitorName: string;
  projectName: string;
  projectType: string;
  amount: number;
  marketShare: string;
  shareChange: string;
  mainCategories: string[];
  bidDate: string;
  status: string;
}

export interface Alert {
  id: string;
  level: 'high' | 'medium' | 'low';
  title: string;
  content: string;
  source: string;
  competitorId?: string;
  createdAt: string;
  type: 'competitor' | 'policy';
}

export interface BidPackage {
  id: string;
  createdAt: string;
  projectId?: string;
  projectName: string;
  bidHistory: BidResult[];
  competitorNews: CompetitorNews[];
  marketShare: Array<{ name: string; amount: number; share: string }>;
  recommendations: Array<{
    type: string;
    title: string;
    content: string;
    priority: string;
  }>;
}

export interface Report {
  id: string;
  createdAt: string;
  reportType: 'daily' | 'weekly' | 'monthly';
  period: string;
  summary: {
    totalNews: number;
    majorSignals: number;
    topCompetitors: Array<{ id: string; name: string; activityScore: number }>;
    summary: string;
  };
  details: {
    competitorActivity: Competitor[];
    marketShareChanges: Array<{
      competitorName: string;
      latestShare: string;
      previousShare: string;
      change: string;
      trend: string;
    }>;
    swot: {
      strengths: string[];
      weaknesses: string[];
      opportunities: string[];
      threats: string[];
    };
  };
  recommendations: Array<{
    area: string;
    priority: string;
    recommendation: string;
    action: string;
  }>;
}

interface AppState {
  // Data
  competitors: Competitor[];
  competitorNews: CompetitorNews[];
  policies: Policy[];
  bidResults: BidResult[];
  alerts: Alert[];
  
  // UI State
  activeTab: string;
  currentRole: string;
  isLoading: boolean;
  
  // Actions
  setActiveTab: (tab: string) => void;
  setCurrentRole: (role: string) => void;
  setCompetitors: (data: Competitor[]) => void;
  setCompetitorNews: (data: CompetitorNews[]) => void;
  setPolicies: (data: Policy[]) => void;
  setBidResults: (data: BidResult[]) => void;
  setAlerts: (data: Alert[]) => void;
  setLoading: (loading: boolean) => void;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export const useAppStore = create<AppState>((set) => ({
  // Initial state
  competitors: [],
  competitorNews: [],
  policies: [],
  bidResults: [],
  alerts: [],
  activeTab: 'dashboard',
  currentRole: 'sales',
  isLoading: false,
  
  // Actions
  setActiveTab: (tab) => set({ activeTab: tab }),
  setCurrentRole: (role) => set({ currentRole: role }),
  setCompetitors: (data) => set({ competitors: data }),
  setCompetitorNews: (data) => set({ competitorNews: data }),
  setPolicies: (data) => set({ policies: data }),
  setBidResults: (data) => set({ bidResults: data }),
  setAlerts: (data) => set({ alerts: data }),
  setLoading: (loading) => set({ isLoading: loading }),
}));

// API Functions
export async function fetchCompetitors() {
  const res = await fetch(`${API_BASE}/competitors`);
  const data = await res.json();
  useAppStore.getState().setCompetitors(data);
  return data;
}

export async function fetchCompetitorNews(params?: { competitorId?: string; date?: string; tag?: string }) {
  const searchParams = new URLSearchParams();
  if (params?.competitorId) searchParams.set('competitorId', params.competitorId);
  if (params?.date) searchParams.set('date', params.date);
  if (params?.tag) searchParams.set('tag', params.tag);
  
  const res = await fetch(`${API_BASE}/competitor-news?${searchParams}`);
  const data = await res.json();
  useAppStore.getState().setCompetitorNews(data);
  return data;
}

export async function fetchPolicies(impactLevel?: string) {
  const url = impactLevel ? `${API_BASE}/policies?impactLevel=${impactLevel}` : `${API_BASE}/policies`;
  const res = await fetch(url);
  const data = await res.json();
  useAppStore.getState().setPolicies(data);
  return data;
}

export async function fetchBidResults(params?: { competitorId?: string; projectType?: string }) {
  const searchParams = new URLSearchParams();
  if (params?.competitorId) searchParams.set('competitorId', params.competitorId);
  if (params?.projectType) searchParams.set('projectType', params.projectType);
  
  const res = await fetch(`${API_BASE}/bid-results?${searchParams}`);
  const data = await res.json();
  useAppStore.getState().setBidResults(data);
  return data;
}

export async function fetchAlerts(level?: string) {
  const url = level ? `${API_BASE}/alerts?level=${level}` : `${API_BASE}/alerts`;
  const res = await fetch(url);
  const data = await res.json();
  useAppStore.getState().setAlerts(data);
  return data;
}

export async function createBidPackage(projectName: string, projectId?: string): Promise<BidPackage> {
  const res = await fetch(`${API_BASE}/bid-packages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectName, projectId }),
  });
  return res.json();
}

export async function generateReport(reportType: 'daily' | 'weekly' | 'monthly'): Promise<Report> {
  const res = await fetch(`${API_BASE}/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reportType }),
  });
  return res.json();
}

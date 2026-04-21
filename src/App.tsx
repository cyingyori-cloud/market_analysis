import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { Dashboard } from './pages/Dashboard';
import { CompetitorMonitor } from './pages/CompetitorMonitor';
import { BidIntelligence } from './pages/BidIntelligence';
import { PolicyAnalysis } from './pages/PolicyAnalysis';
import { ReportCenter } from './pages/ReportCenter';
import { useAppStore } from './store/appStore';

function PageRouter() {
  const { activeTab } = useAppStore();

  switch (activeTab) {
    case 'dashboard': return <Dashboard />;
    case 'competitor-monitor': return <CompetitorMonitor />;
    case 'bid-intelligence': return <BidIntelligence />;
    case 'policy-analysis': return <PolicyAnalysis />;
    case 'report-center': return <ReportCenter />;
    default: return <Dashboard />;
  }
}

export default function App() {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto">
          <PageRouter />
        </main>
      </div>
    </div>
  );
}

import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { CompetitorMonitor } from './pages/CompetitorMonitor';
import { PolicyAnalysis } from './pages/PolicyAnalysis';
import { useAppStore } from './store/appStore';

function PageRouter() {
  const { activeTab } = useAppStore();

  switch (activeTab) {
    case 'competitor-monitor': return <CompetitorMonitor />;
    case 'policy-analysis': return <PolicyAnalysis />;
    default: return <CompetitorMonitor />;
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

import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useApp } from './state/AppStateProvider';
import { unreadCount } from './state/selectors';
import { COPY } from './copy';
import { Landing } from './screens/shared/Landing';
import { Agreement } from './screens/shared/Agreement';
import { AuditLog } from './screens/shared/AuditLog';
import { DemoPanel } from './screens/shared/DemoPanel';
import { SenderHome } from './screens/sender/Home';
import { SendWizard } from './screens/sender/SendWizard';
import { TransferStatus } from './screens/sender/TransferStatus';
import { Activity } from './screens/sender/Activity';
import { Helpers } from './screens/sender/Helpers';
import { Help } from './screens/sender/Help';
import { Report } from './screens/sender/Report';
import { ApproverDashboard } from './screens/approver/Dashboard';
import { ApprovalDetail } from './screens/approver/ApprovalDetail';
import { Notifications } from './screens/approver/Notifications';
import { Settings } from './screens/approver/Settings';
import type { Persona } from './types';

/** Unread count in the tab title, so an open-but-hidden tab is still noticed. */
function useDocumentTitle(persona: Persona | null) {
  const { state } = useApp();
  const unread = persona ? unreadCount(state, persona) : 0;
  useEffect(() => {
    const base = `${COPY.app.name} (demo)`;
    document.title = unread > 0 ? `(${unread}) ${base}` : base;
  }, [unread]);
}

function RequirePersona({ persona, children }: { persona: Persona; children: JSX.Element }) {
  const { state } = useApp();
  const location = useLocation();
  if (!state.unlocked.includes(persona)) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }
  return children;
}

export function App() {
  const { state } = useApp();
  useDocumentTitle(state.activePersona);

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/setup" element={<Agreement />} />
      <Route path="/audit" element={<AuditLog />} />
      <Route path="/demo" element={<DemoPanel />} />

      <Route
        path="/m"
        element={
          <RequirePersona persona="margaret">
            <SenderHome />
          </RequirePersona>
        }
      />
      <Route
        path="/m/send"
        element={
          <RequirePersona persona="margaret">
            <SendWizard />
          </RequirePersona>
        }
      />
      <Route
        path="/m/transfer/:id"
        element={
          <RequirePersona persona="margaret">
            <TransferStatus />
          </RequirePersona>
        }
      />
      <Route
        path="/m/activity"
        element={
          <RequirePersona persona="margaret">
            <Activity />
          </RequirePersona>
        }
      />
      <Route
        path="/m/helpers"
        element={
          <RequirePersona persona="margaret">
            <Helpers />
          </RequirePersona>
        }
      />
      <Route
        path="/m/help"
        element={
          <RequirePersona persona="margaret">
            <Help />
          </RequirePersona>
        }
      />
      <Route
        path="/m/report"
        element={
          <RequirePersona persona="margaret">
            <Report />
          </RequirePersona>
        }
      />

      <Route
        path="/d"
        element={
          <RequirePersona persona="david">
            <ApproverDashboard />
          </RequirePersona>
        }
      />
      <Route
        path="/d/approve/:id"
        element={
          <RequirePersona persona="david">
            <ApprovalDetail />
          </RequirePersona>
        }
      />
      <Route
        path="/d/notifications"
        element={
          <RequirePersona persona="david">
            <Notifications />
          </RequirePersona>
        }
      />
      <Route
        path="/d/settings"
        element={
          <RequirePersona persona="david">
            <Settings />
          </RequirePersona>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

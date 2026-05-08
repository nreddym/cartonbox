import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import LoginPage from './pages/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './components/MainLayout';
import authService from './services/auth.service';
import PaperRollListPage from './pages/PaperRollListPage';
import PaperRollFormPage from './pages/PaperRollFormPage';
import InventoryInwardListPage from './pages/InventoryInwardListPage';
import InventoryInwardFormPage from './pages/InventoryInwardFormPage';
import JobCardListPage from './pages/JobCardListPage';
import JobCardFormPage from './pages/JobCardFormPage';
import JobCardDetailPage from './pages/JobCardDetailPage';
import ProductionDashboardPage from './pages/ProductionDashboardPage';
import ProductionCompletePage from './pages/ProductionCompletePage';
import MaterialIssueListPage from './pages/MaterialIssueListPage';
import MaterialIssueFormPage from './pages/MaterialIssueFormPage';
import FinishedGoodsListPage from './pages/FinishedGoodsListPage';
import FinishedGoodsOutwardListPage from './pages/FinishedGoodsOutwardListPage';
import FinishedGoodsOutwardFormPage from './pages/FinishedGoodsOutwardFormPage';
import InventoryAdjustmentListPage from './pages/InventoryAdjustmentListPage';
import InventoryAdjustmentFormPage from './pages/InventoryAdjustmentFormPage';
import ReportsPage from './pages/ReportsPage';
import AuditLogsPage from './pages/AuditLogsPage';
import UserListPage from './pages/UserListPage';
import UserFormPage from './pages/UserFormPage';

const Dashboard: React.FC = () => {
  const user = authService.getCurrentUser();
  return (
    <div>
      <h2>Dashboard</h2>
      <p>Welcome{user?.username ? `, ${user.username}` : ''}.</p>
      <p>Use the navigation menu to access modules available for your role.</p>
    </div>
  );
};

const Forbidden: React.FC = () => (
  <div>
    <h2>Access denied</h2>
    <p>You do not have permission to view this page.</p>
  </div>
);

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/forbidden" element={<Forbidden />} />
                  <Route path="/paper-rolls" element={<PaperRollListPage />} />
                  <Route path="/paper-rolls/new" element={<PaperRollFormPage mode="create" />} />
                  <Route path="/paper-rolls/:id/edit" element={<PaperRollFormPage mode="edit" />} />
                  <Route path="/inventory-inward" element={<InventoryInwardListPage />} />
                  <Route path="/inventory-inward/new" element={<InventoryInwardFormPage />} />
                  <Route path="/job-cards" element={<JobCardListPage />} />
                  <Route path="/job-cards/new" element={<JobCardFormPage />} />
                  <Route path="/job-cards/:id" element={<JobCardDetailPage />} />
                  <Route path="/job-cards/:id/complete" element={<ProductionCompletePage />} />
                  <Route path="/material-issues" element={<MaterialIssueListPage />} />
                  <Route path="/material-issues/new" element={<MaterialIssueFormPage />} />
                  <Route path="/production" element={<ProductionDashboardPage />} />
                  <Route path="/finished-goods" element={<FinishedGoodsListPage />} />
                  <Route path="/fg-outward" element={<FinishedGoodsOutwardListPage />} />
                  <Route path="/fg-outward/new" element={<FinishedGoodsOutwardFormPage />} />
                  <Route path="/adjustments" element={<InventoryAdjustmentListPage />} />
                  <Route path="/adjustments/new" element={<InventoryAdjustmentFormPage />} />
                  <Route path="/reports" element={<ReportsPage />} />
                  <Route path="/audit-logs" element={<AuditLogsPage />} />
                  <Route path="/users" element={<UserListPage />} />
                  <Route path="/users/new" element={<UserFormPage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </MainLayout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;

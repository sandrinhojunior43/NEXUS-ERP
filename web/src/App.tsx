import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './lib/auth';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { InventoryPage } from './pages/inventory/InventoryPage';
import { WarehousesPage } from './pages/warehouses/WarehousesPage';
import { LotesPage } from './pages/lotes/LotesPage';
import { MovesPage } from './pages/moves/MovesPage';
import { ProductionPage } from './pages/production/ProductionPage';
import { SuppliersPage } from './pages/suppliers/SuppliersPage';
import { PurchasesPage } from './pages/purchases/PurchasesPage';
import { CustomersPage } from './pages/customers/CustomersPage';
import { CrmPage } from './pages/crm/CrmPage';
import { SalesPage } from './pages/sales/SalesPage';
import { FinancialPage } from './pages/financial/FinancialPage';
import { SettingsPage } from './pages/settings/SettingsPage';
import { DepartmentsPage } from './pages/departments/DepartmentsPage';
import { EmployeesPage } from './pages/employees/EmployeesPage';
import { QualityPage } from './pages/quality/QualityPage';
import { ComingSoon } from './components/ComingSoon';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/estoque" element={<InventoryPage />} />
                <Route path="/depositos" element={<WarehousesPage />} />
                <Route path="/lotes" element={<LotesPage />} />
                <Route path="/movimentacoes" element={<MovesPage />} />
                <Route path="/fichas-tecnicas" element={<ProductionPage />} />
                <Route path="/producao" element={<ProductionPage />} />
                <Route path="/qualidade" element={<QualityPage />} />
                <Route path="/fornecedores" element={<SuppliersPage />} />
                <Route path="/requisicoes" element={<ComingSoon label="Requisições" />} />
                <Route path="/compras" element={<PurchasesPage />} />
                <Route path="/departamentos" element={<DepartmentsPage />} />
                <Route path="/funcionarios" element={<EmployeesPage />} />
                <Route path="/crm" element={<CrmPage />} />
                <Route path="/clientes" element={<CustomersPage />} />
                <Route path="/vendas" element={<SalesPage />} />
                <Route path="/expedicao" element={<ComingSoon label="Expedição" />} />
                <Route path="/devolucoes" element={<ComingSoon label="Devoluções" />} />
                <Route path="/financeiro" element={<FinancialPage />} />
                <Route path="/fiscal" element={<ComingSoon label="Documentos fiscais" />} />
                <Route path="/auditoria" element={<ComingSoon label="Auditoria" />} />
                <Route path="/usuarios" element={<ComingSoon label="Usuários" />} />
                <Route path="/contabilidade" element={<ComingSoon label="Contabilidade" />} />
                <Route path="/configuracoes" element={<SettingsPage />} />
              </Route>
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

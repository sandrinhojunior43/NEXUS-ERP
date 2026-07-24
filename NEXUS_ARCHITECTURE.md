# 🏗️ **NEXUS - Arquitetura Técnica**

## **Visão Geral da Arquitetura**

```
┌─────────────────────────────────────────────────────────┐
│                    NEXUS v4.2 (DEMO)                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │           FRONTEND (Single HTML File)             │  │
│  │  - UI Components (Sidebar, Cards, Tables)         │  │
│  │  - Chart.js Visualizations                        │  │
│  │  - Form Management                                │  │
│  │  - Export/Import Logic                            │  │
│  └───────────────────────────────────────────────────┘  │
│                       ↕️                                 │
│  ┌───────────────────────────────────────────────────┐  │
│  │          STATE MANAGEMENT (JavaScript)            │  │
│  │  - app.data (Inventory, Orders, Inspections)      │  │
│  │  - app.currentUser (Auth state)                   │  │
│  │  - app.charts (Chart instances)                   │  │
│  └───────────────────────────────────────────────────┘  │
│                       ↕️                                 │
│  ┌───────────────────────────────────────────────────┐  │
│  │    PERSISTENCE LAYER (localStorage)               │  │
│  │  Key: 'nexus_data'                                │  │
│  │  Key: 'darkMode'                                  │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 🔄 **Fluxo de Dados**

### **1. Autenticação**

```
User inputs (email/password)
    ↓
DOM → JavaScript event listener
    ↓
authenticate() function
    ↓
Find user in app.data.users[]
    ↓
Match email + password
    ↓
✓ Valid: Set app.currentUser, show app page
✗ Invalid: Alert error message
```

### **2. Navegação**

```
User clicks sidebar item OR types command
    ↓
switchTab(tabName) function
    ↓
Hide all .tab-content divs
    ↓
Show target tab (e.g., #tab-estoque)
    ↓
Update .sidebar-item active state
    ↓
Call initializeCharts() (se necessário)
```

### **3. CRUD Operações**

```
User submits form
    ↓
submitInventoryForm() / submitOrderForm() / etc
    ↓
Validate input data
    ↓
Push new record to app.data.inventory[]
    ↓
saveData() → localStorage.setItem()
    ↓
renderTable() → update DOM
    ↓
showToast() → success notification
```

### **4. Export**

```
User clicks export button
    ↓
exportInventoryExcel() function
    ↓
XLSX.utils.json_to_sheet(data)
    ↓
XLSX.writeFile(workbook, filename)
    ↓
Browser download triggered
```

---

## 📦 **Estrutura de Dados**

### **app.data.inventory[]**

```javascript
{
  id: 1,                          // Unique ID
  sku: "SKU000001",               // Stock Keeping Unit
  description: "Produto 1",       // Nome do item
  quantity: 245,                  // Quantidade em estoque
  unitPrice: 125.50               // Valor unitário (R$)
}
```

### **app.data.productionOrders[]**

```javascript
{
  id: 1,                          // Unique ID
  op: "OP000001",                 // Ordem de Produção
  product: "Produto 1",           // Descrição
  quantity: 250,                  // Qtd a produzir
  machine: "M5",                  // Máquina responsável
  progress: 45,                   // % concluído (0-100)
  status: "producao"              // planejada|producao|pausada|concluida
}
```

### **app.data.inspections[]**

```javascript
{
  id: 1,                          // Unique ID
  inspectionId: "INS000001",      // ID da inspeção
  op: "OP000001",                 // OP relacionada
  inspectedQty: 100,              // Qtd inspecionada
  acceptedQty: 98,                // Qtd conforme
  conformanceRate: "98.00",       // Taxa % de conformidade
  status: "conforme"              // conforme|nao-conforme
}
```

### **app.data.users[]**

```javascript
{
  email: "sandro.aparecido@nexus.com",  // Usuário único
  password: "SJR02@",                   // Senhas em plain text (DEMO ONLY!)
  role: "admin"                         // admin|gerente|operador
}
```

---

## 🎨 **Componentes da UI**

### **1. Login Container**

```
┌────────────────────────────────┐
│        NEXUS (Logo)            │
│   Enterprise ERP System        │
├────────────────────────────────┤
│ Email: [_________________]     │
│ Senha: [_________________]     │
│                                │
│  [  ENTRAR  ]                  │
│                                │
│ Demo: sandro@nexus.com / SJR02@│
└────────────────────────────────┘
```

### **2. Top Bar**

```
┌─────────────────────────────────────────────────────────┐
│ 🏠 HOME | 🔍 Código: [EST____] Sug | 🌙 👤 sandro | SAIR│
└─────────────────────────────────────────────────────────┘
```

**Elementos:**
- Home button
- Command bar (autocompletar)
- User info (email/role)
- Dark mode toggle
- Logout button

### **3. Sidebar**

```
┌──────────────┐
│ OPERACIONAL  │
│ ─────────────│
│ 📊 Dashboard │
│ 📦 Estoque   │
│ 🏭 Produção  │
│ ✅ Qualidade │
├──────────────┤
│ ADMIN        │
│ ─────────────│
│ 📥 Import    │
│ 📊 Relatórios│
│ ⚙️ Config    │
└──────────────┘
```

**Interaction:**
- Click item → switchTab()
- Active state (highlight blue)
- Mouse hover effect

### **4. Content Area**

```
┌──────────────────────────────────────┐
│ PAGE TITLE (Blue)                    │
├──────────────────────────────────────┤
│                                      │
│ [KPI Card] [KPI Card] [KPI Card]     │
│                                      │
│ [Table Header]                       │
│ ┌────────────────────────────────┐   │
│ │ Row 1                          │   │
│ │ Row 2                          │   │
│ │ Row 3                          │   │
│ └────────────────────────────────┘   │
│                                      │
│ [Chart 1]        [Chart 2]           │
│ [Chart 3]        [Chart 4]           │
│                                      │
└──────────────────────────────────────┘
```

---

## 🎯 **Módulos Funcionais**

### **Module: Dashboard**

```javascript
// Responsabilidades
├─ Renderizar KPI cards
├─ Inicializar 4 gráficos principais
├─ Atualizar contadores em tempo real
└─ Exibir alertas/avisos críticos

// Dados utilizados
├─ app.data.inventory.length
├─ app.data.productionOrders.length
├─ compliance metrics (hardcoded demo)
└─ performance metrics (hardcoded demo)

// Gráficos
├─ chartRevenue (bar, 12 meses)
├─ chartConformance (line, trend)
├─ chartStock (doughnut, categorias)
└─ chartOrders (bar, status)
```

### **Module: Estoque (Inventory)**

```javascript
// Responsabilidades
├─ Listar 50 itens em tabela
├─ CRUD operações (criar/editar/deletar)
├─ Buscar/filtrar por SKU
├─ Calcular valor total (qtd × preço)
├─ Export Excel e PDF
└─ Paginação (20 items/page)

// Funcionalidades
├─ openAddItemForm() - Modal formulário
├─ submitInventoryForm() - Salvar item
├─ renderInventoryTable() - Atualizar tabela
├─ exportInventoryExcel() - XLSX download
├─ exportInventoryPDF() - PDF download
└─ closeForm() - Fechar modal
```

### **Module: Produção (Production)**

```javascript
// Responsabilidades
├─ Listar 30 ordens de produção
├─ Mostrar progresso visual (progress bar)
├─ Filtrar por status (4 status possíveis)
├─ Associar máquinas
├─ Export dados
└─ Atualizar status em tempo real

// Funcionalidades
├─ openAddOrderForm() - Modal ordem
├─ submitOrderForm() - Salvar ordem
├─ renderProductionTable() - Tabela
├─ exportOrdersExcel() - XLSX
├─ exportOrdersPDF() - PDF
└─ Status workflow (planejada → produção → pausada → concluída)
```

### **Module: Qualidade (Quality)**

```javascript
// Responsabilidades
├─ Registrar inspeções (25 registros)
├─ Calcular taxa de conformidade
├─ Classificar como conforme/não-conforme
├─ Relacionar com OP
├─ Export relatórios
└─ Trend analysis

// Funcionalidades
├─ openAddInspectionForm() - Modal inspeção
├─ submitInspectionForm() - Salvar inspeção
├─ renderQualityTable() - Tabela
├─ conformanceRate = (accepted / inspected) × 100
├─ exportQualityExcel() - XLSX
└─ exportQualityPDF() - PDF
```

### **Module: Import/Export**

```javascript
// Responsabilidades
├─ Fazer upload de CSV/Excel
├─ Preview dados antes de confirmar
├─ Validar estrutura do arquivo
├─ Inserir dados em app.data
├─ Manter histórico de imports
└─ Tratamento de erros

// Funcionalidades
├─ previewImport() - Ler arquivo + mostrar preview
├─ confirmImport() - Processar dados
├─ cancelImport() - Limpar upload
├─ Suporta: CSV, XLSX, XLS
└─ Max 5 linhas no preview
```

### **Module: Relatórios (Reports)**

```javascript
// Responsabilidades
├─ Gerar 4 gráficos de análise
├─ Exportar dados em múltiplos formatos
├─ Criar relatórios PDF com branding
├─ Filtrar por período/categoria
└─ Dashboard analytics

// Gráficos
├─ chartExportStock (bar, movimentação)
├─ chartExportProduction (line, semanal)
├─ chartExportQuality (radar, conformidade)
└─ chartPerformance (radar, 5D)
```

### **Module: Configuração (Settings)**

```javascript
// Responsabilidades
├─ Gerenciar preferências de usuário
├─ Dark mode toggle
├─ Exibir info do sistema
├─ Gerenciar credenciais (v5.0)
└─ Privacy settings (v5.0)

// Funcionalidades
├─ toggleDarkMode() - Switch theme
├─ loadDarkModePreference() - Persist localStorage
├─ System info display (versão, status, BD)
└─ User profile management
```

---

## 🔒 **Segurança (v4.2 - BÁSICA)**

### **⚠️ Avisos de Segurança (DEMO ONLY)**

```
❌ Senhas em plain text (localStorage)
❌ Sem validação server-side
❌ Sem HTTPS
❌ Sem rate limiting
❌ Sem CSRF protection
❌ SQL injection possível (quando v5.0)
❌ XSS vulnerabilidades em forms
```

### **Melhorias Necessárias (v5.0)**

```
✅ Senhas hashed com bcrypt
✅ JWT tokens com expiração
✅ Server-side validation
✅ HTTPS/TLS obrigatório
✅ Rate limiting (5 reqs/min por IP)
✅ CSRF tokens
✅ Prepared statements (Prisma)
✅ Input sanitization
✅ CORS configurado
✅ Security headers
```

---

## ⚡ **Performance Otimizações**

### **Atual (v4.2)**

```
Load time:        ~1.5s (primeira vez)
Subsequent loads: ~200ms (localStorage)
Bundle size:      62 KB (HTML total)
Chart render:     ~300ms (4 gráficos)
```

### **Futuro (v5.0)**

```
Load time:        ~800ms (React app)
API response:     ~100-200ms (Postgres)
Bundle size:      ~40 KB (JS) + 30 KB (CSS)
Chart render:     ~150ms (memoized)
Database:         Indexed queries
Caching:          Redis (session)
```

---

## 🌐 **Integração Futura (v5.0+)**

### **API Bridges**

```
NEXUS API ↔ SAP C4C (REST)
NEXUS API ↔ Oracle (REST)
NEXUS API ↔ Totvs (REST)
NEXUS API ↔ Trello (Webhooks)
```

### **File-Based Integration**

```
SFTP Server ← CSV exports
→ Legacy systems (EDI, X12)
SFTP Server ← Database snapshots
→ Data warehouse (Snowflake)
```

### **Real-time Sync**

```
Kafka topics:
├─ inventory.changes
├─ production.events
├─ quality.reports
└─ financial.transactions
```

---

## 📊 **Database Schema (Futuro - v5.0)**

### **Tables Propostas**

```sql
-- Users & Auth
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255),
  role ENUM('admin', 'gerente', 'operador'),
  created_at TIMESTAMP
);

-- Inventory
CREATE TABLE inventory (
  id UUID PRIMARY KEY,
  sku VARCHAR(50) UNIQUE,
  description TEXT,
  quantity INT,
  unit_price DECIMAL(10,2),
  category VARCHAR(100),
  updated_at TIMESTAMP
);

-- Production Orders
CREATE TABLE production_orders (
  id UUID PRIMARY KEY,
  op_number VARCHAR(50) UNIQUE,
  product_id UUID REFERENCES inventory(id),
  quantity INT,
  machine_id UUID,
  progress INT,
  status ENUM('planejada', 'producao', 'pausada', 'concluida'),
  started_at TIMESTAMP,
  completed_at TIMESTAMP
);

-- Quality Inspections
CREATE TABLE quality_inspections (
  id UUID PRIMARY KEY,
  op_id UUID REFERENCES production_orders(id),
  inspected_qty INT,
  accepted_qty INT,
  conformance_rate DECIMAL(5,2),
  notes TEXT,
  inspected_at TIMESTAMP
);

-- Audit Log
CREATE TABLE audit_log (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  action VARCHAR(100),
  table_name VARCHAR(50),
  record_id UUID,
  changes JSONB,
  timestamp TIMESTAMP
);
```

---

## 🚀 **Deployment Architecture (Futuro)**

### **Vercel (Frontend)**

```
GitHub Push
    ↓
GitHub Actions CI
    ↓
Run tests
    ↓
Build React app
    ↓
Deploy to Vercel Edge
    ↓
Auto SSL certificate
    ↓
https://nexus.vercel.app (live)
```

### **Render/Railway (Backend)**

```
GitHub Push
    ↓
Auto deploy
    ↓
Docker build
    ↓
Run migrations
    ↓
Start Node server
    ↓
PostgreSQL connection
    ↓
https://api.nexus.vercel.app (API)
```

### **Environment Variables**

```
DATABASE_URL=postgresql://user:pass@host:5432/nexus
JWT_SECRET=super_secret_key_min_32_chars
NODE_ENV=production
API_PORT=3000
CORS_ORIGIN=https://nexus.vercel.app
```

---

## 📈 **Escalabilidade (v6.0+)**

### **Microservices Proposto**

```
┌─────────────────────────────────────────┐
│         API Gateway (Kong)              │
├─────────────────────────────────────────┤
│                                         │
│ ┌──────────────┐  ┌──────────────┐    │
│ │ Auth Service │  │ Inventory    │    │
│ │ (Auth)       │  │ Service      │    │
│ └──────────────┘  └──────────────┘    │
│                                         │
│ ┌──────────────┐  ┌──────────────┐    │
│ │ Production   │  │ Quality      │    │
│ │ Service      │  │ Service      │    │
│ └──────────────┘  └──────────────┘    │
│                                         │
│ ┌──────────────┐  ┌──────────────┐    │
│ │ Financial    │  │ Reporting    │    │
│ │ Service      │  │ Service      │    │
│ └──────────────┘  └──────────────┘    │
│                                         │
├─────────────────────────────────────────┤
│         Message Queue (RabbitMQ)        │
├─────────────────────────────────────────┤
│                                         │
│ ┌──────────────┐  ┌──────────────┐    │
│ │ PostgreSQL   │  │ Redis Cache  │    │
│ │ (Primary)    │  │              │    │
│ └──────────────┘  └──────────────┘    │
│                                         │
└─────────────────────────────────────────┘

Orchestration: Kubernetes (K8s)
Logging: ELK Stack (Elasticsearch)
Monitoring: Prometheus + Grafana
```

---

## 📝 **Notas Técnicas**

### **localStorage Limitations**

```
Pro:
├─ Zero setup (browsers native)
├─ Offline capable
├─ Fast local access
└─ No server cost

Con:
├─ Max ~5-10 MB per domain
├─ No encryption
├─ Synchronous (blocks UI)
├─ No concurrent access
└─ Data lost on browser clear
```

### **Por que Single File?**

```
✅ Fácil de distribuir
✅ Sem build process necessário
✅ Roda em qualquer navegador
✅ Ideal para demo/prototipo
✅ Sem dependências externas (exceto CDN)

❌ Não escalável
❌ Sem version control granular
❌ Difícil de testar
❌ Bundled size cresce rápido
```

---

**Última atualização:** 24 de julho de 2024  
**Versão:** 4.2 Enterprise  
**Status:** Documentação Técnica Completa

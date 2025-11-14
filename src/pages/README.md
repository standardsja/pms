# Pages Directory Structure

This directory contains all React page components for the PMS application, organized by feature module.

## Active Pages

### 📁 Root Level
- **`Index.tsx`** - Main dashboard/landing page
- **`ModuleSelector.tsx`** - Module selection interface
- **`Unauthorized.tsx`** - Unauthorized access page
- **`HelpSupport.tsx`** - Help and support page

### 📁 `/Innovation` - Innovation Hub Module
Complete innovation management system with ideas, voting, and committee features.

#### Dashboard
- `InnovationDashboard.tsx` - Main Innovation Hub dashboard

#### `/Ideas` - Idea Management
- `SubmitIdea.tsx` - Submit new innovation ideas
- `ViewIdeas.tsx` - Browse all submitted ideas  
- `BrowseIdeas.tsx` - Browse ideas with filters
- `MyIdeas.tsx` - User's submitted ideas
- `VoteOnIdeas.tsx` - Vote on popular ideas
- `IdeaDetails.tsx` - Detailed idea view
- `Leaderboard.tsx` - Innovation leaderboard
- `Analytics.tsx` - Innovation analytics

#### `/Committee` - Committee Features
- `CommitteeDashboard.tsx` - Committee member dashboard
- `ReviewIdeas.tsx` - Review and approve ideas

#### `/Projects` - Project Management
- `BSJProjects.tsx` - View promoted projects

### 📁 `/Procurement` - Procurement Management Module
Complete procurement workflow system with role-based dashboards.

#### Main Dashboards
- `Dashboard.tsx` - General procurement dashboard
- `DepartmentHeadDashboard.tsx` - Department head dashboard

#### `/Auth` - Authentication
- `Login.tsx` - Login page
- `ForgotPassword.tsx` - Password recovery
- `ResetPassword.tsx` - Password reset
- `Onboarding.tsx` - User onboarding

#### `/Manager` - Procurement Manager
- `ProcurementManagerDashboard.tsx` - Manager dashboard
- `RFQsAwaitingApproval.tsx` - RFQs pending approval
- `EvaluationsToValidate.tsx` - Evaluations to validate

#### `/DepartmentHead` - Department Head
- `DepartmentHeadDashboard.tsx` - Department head dashboard
- `DepartmentHeadEvaluationReview.tsx` - Review evaluations
- `DepartmentHeadReportReview.tsx` - Review reports

#### `/ExecutiveDirector` - Executive Director  
- `ExecutiveDirectorDashboard.tsx` - Executive dashboard
- `ExecutiveDirectorReports.tsx` - Executive reports
- `ExecutiveDigitalSignoffs.tsx` - Digital signature approvals

#### `/RFQ` - Request for Quotation
- `RFQList.tsx` - List all RFQs
- `NewRFQ.tsx` - Create new RFQ
- `RFQDetail.tsx` - RFQ details

#### `/Quotes` - Quotations
- `QuotesList.tsx` - List all quotes
- `NewQuote.tsx` - Create new quote
- `QuoteDetail.tsx` - Quote details

#### `/Evaluation` - Bid Evaluation
- `EvaluationList.tsx` - List evaluations
- `NewEvaluation.tsx` - Create evaluation
- `EvaluationDetail.tsx` - Evaluation details

#### `/Review` - Reviews
- `ReviewList.tsx` - List reviews
- `ReviewDetail.tsx` - Review details

#### `/Approvals` - Approvals
- `ApprovalsList.tsx` - List approvals
- `ExecutiveApprovals.tsx` - Executive-level approvals

#### `/PurchaseOrders` - Purchase Orders
- `PurchaseOrderList.tsx` - List purchase orders
- `NewPurchaseOrder.tsx` - Create purchase order
- `PurchaseOrderDetail.tsx` - Purchase order details

#### `/Suppliers` - Supplier Management
- `SupplierList.tsx` - List all suppliers
- `SupplierDashboard.tsx` - Supplier portal dashboard
- `NewSupplier.tsx` - Add new supplier
- `SupplierDetail.tsx` - Supplier details
- `EditSupplier.tsx` - Edit supplier information

#### `/Catalog` - Product Catalog
- `CatalogList.tsx` - Product catalog list
- `NewCatalogItem.tsx` - Add catalog item
- `CatalogItemDetail.tsx` - Catalog item details
- `EditCatalogItem.tsx` - Edit catalog item

#### `/Payments` - Financial Management
- `PaymentsList.tsx` - List all payments
- `PaymentDetail.tsx` - Payment details
- `FinanceDashboard.tsx` - Finance dashboard
- `AwaitingDelivery.tsx` - Items awaiting delivery
- `PaymentsToProcess.tsx` - Pending payments

#### `/Requests` - Procurement Requests
- `Requests.tsx` - List procurement requests
- `RequestForm.tsx` - Create/edit request form

#### `/Finance` - Finance Department
- `Requests.tsx` - Finance request review

#### `/Reports` - Reporting
- `ReportsList.tsx` - List reports
- `NewReport.tsx` - Generate new report

#### `/Admin` - Administration
- `AdminSettings.tsx` - System administration settings

#### `/Users` - User Management
- `Profile.tsx` - User profile page
- `AccountSetting.tsx` - Account settings

### 📁 `/_unused-template-files` - Archived Template Files
Original VRISTO template files kept for reference:
- Analytics, Charts, Crypto, Finance dashboards
- Widgets, Tables, DragAndDrop demos
- Apps (Calendar, Chat, Contacts, Mailbox, Notes, Scrumboard, Todolist, Invoice)
- Authentication templates (Login/Register variations)
- Components demos (Accordions, Cards, Modals, etc.)
- DataTables examples
- Elements demos
- Forms examples
- Error pages (404, 500, 503)
- Contact Us, Coming Soon, FAQ, Knowledge Base pages

**Note:** These files are preserved for reference but not actively used in the application.

## Routing

All page routes are defined in `/src/router/routes.tsx`.

## Usage

Pages are lazy-loaded for better performance:

```tsx
const MyPage = lazy(() => import('../pages/Feature/MyPage'));
```

## Organization Guidelines

1. **Feature-based structure** - Pages grouped by business module
2. **Role-specific folders** - Pages organized by user role (Manager, Department Head, etc.)
3. **Workflow-based** - Pages follow procurement workflow stages
4. **Single responsibility** - Each page component handles one main feature
5. **Consistent naming** - Use descriptive names (List, Detail, New, Edit patterns)

## Adding New Pages

1. Create component in appropriate feature folder
2. Add lazy import in `/src/router/routes.tsx`
3. Add route definition with proper path
4. Update this README

import { Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { BudgetDetail } from "./pages/BudgetDetail";
import { BudgetList } from "./pages/BudgetList";
import { Login } from "./pages/Login";
import { PurchaseOrderDetail } from "./pages/PurchaseOrderDetail";
import { VoucherList } from "./pages/VoucherList";

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Layout />}>
        <Route path="/" element={<BudgetList />} />
        <Route path="/budgets/:id" element={<BudgetDetail />} />
        <Route path="/purchase-orders/:id" element={<PurchaseOrderDetail />} />
        <Route path="/vouchers" element={<VoucherList />} />
      </Route>
    </Routes>
  );
}

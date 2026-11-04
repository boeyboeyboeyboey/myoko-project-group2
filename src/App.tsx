import { Navigate, Route, Routes } from "react-router";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Packages from "./pages/Packages";
import PackageDetail from "./pages/PackageDetail";
import Return from "./pages/Return";
import { useBooking } from "./lib/bookingState";
import PricingNotes from "./pages/PricingNotes";
import About from "./pages/About";
import Why from "./pages/Why";

function BookRedirect() {
  const [booking] = useBooking();
  return <Navigate to={`/packages/${booking.packageId}`} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="packages" element={<Packages />} />
        <Route path="packages/:slug" element={<PackageDetail />} />
        <Route path="return" element={<Return />} />
        <Route path="book" element={<BookRedirect />} />
        <Route path="pricing-notes" element={<PricingNotes />} />
        <Route path="why" element={<Why />} />
        <Route path="about" element={<About />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

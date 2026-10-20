import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { Layout } from "@/components/Layout";
import { BookingProvider } from "@/context/BookingContext";
import AdminPage from "@/pages/AdminPage";
import BookPage from "@/pages/BookPage";
import CheckBookingPage from "@/pages/CheckBookingPage";
import ConfirmationPage from "@/pages/ConfirmationPage";
import ContactPage from "@/pages/ContactPage";
import CourtsPage from "@/pages/CourtsPage";
import HomePage from "@/pages/HomePage";
import NotFoundPage from "@/pages/NotFoundPage";
import PoliciesPage from "@/pages/PoliciesPage";
import PrivacyPage from "@/pages/PrivacyPage";
import RatesPage from "@/pages/RatesPage";
import ReceiptPage from "@/pages/ReceiptPage";

export default function App() {
  return (
    <BookingProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="courts" element={<CourtsPage />} />
            <Route path="rates" element={<RatesPage />} />
            <Route path="book" element={<BookPage />} />
            <Route path="booking/submitted" element={<ConfirmationPage />} />
            <Route path="pay" element={<ReceiptPage />} />
            <Route path="check-booking" element={<CheckBookingPage />} />
            <Route path="contact" element={<ContactPage />} />
            <Route path="policies" element={<PoliciesPage />} />
            <Route path="privacy" element={<PrivacyPage />} />
            <Route path="admin" element={<AdminPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster position="top-center" richColors closeButton />
    </BookingProvider>
  );
}

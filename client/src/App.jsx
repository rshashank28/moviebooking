import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import HomePage from './pages/HomePage';
import MoviesPage from './pages/MoviesPage';
import MovieDetailsPage from './pages/MovieDetailsPage';
import EventsPage from './pages/EventsPage';
import EventDetailsPage from './pages/EventDetailsPage';
import SeatSelectionPage from './pages/SeatSelectionPage';
import CheckoutPage from './pages/CheckoutPage';
import TicketViewPage from './pages/TicketViewPage';
import QRScannerPage from './pages/QRScannerPage';
import SearchResultsPage from './pages/SearchResultsPage';
import UserDashboardPage from './pages/UserDashboardPage';
import OrganizerDashboardPage from './pages/OrganizerDashboardPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<HomePage />} />
          <Route path="movies" element={<MoviesPage />} />
          <Route path="movies/:id" element={<MovieDetailsPage />} />
          <Route path="events" element={<EventsPage />} />
          <Route path="events/:id" element={<EventDetailsPage />} />
          <Route path="sports" element={<EventsPage defaultCategory="SPORTS" />} />
          <Route path="comedy" element={<EventsPage defaultCategory="STANDUP_COMEDY" />} />
          <Route path="shows/:id" element={<SeatSelectionPage />} />
          <Route path="checkout" element={<CheckoutPage />} />
          <Route path="tickets/:id" element={<TicketViewPage />} />
          <Route path="scanner" element={<QRScannerPage />} />
          <Route path="search" element={<SearchResultsPage />} />
          <Route path="dashboard" element={<UserDashboardPage />} />
          <Route path="organizer" element={<OrganizerDashboardPage />} />
          <Route path="admin" element={<AdminDashboardPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

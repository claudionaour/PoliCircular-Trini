import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PublicLayout } from '../layouts/PublicLayout';
import { AppLayout } from '../layouts/AppLayout';
import { AdminLayout } from '../layouts/AdminLayout';
import { AdminRoute, ProtectedRoute } from '../components/ProtectedRoute';

import { WelcomePage } from '../modules/auth/WelcomePage';
import { LoginPage } from '../modules/auth/LoginPage';
import { RegisterPage } from '../modules/auth/RegisterPage';
import { ForgotPasswordPage, ResetPasswordPage } from '../modules/auth/PasswordRecoveryPages';
import { CommunityRulesPage } from '../modules/auth/CommunityRulesPage';

import { HomeDashboardPage } from '../modules/profile/HomeDashboardPage';
import { ProfilePage } from '../modules/profile/ProfilePage';
import { SettingsPrivacyPage } from '../modules/profile/SettingsPrivacyPage';

import { PublishProductWizard } from '../modules/products/PublishProductWizard';
import { MyProductsPage } from '../modules/products/MyProductsPage';

import { ExplorePage } from '../modules/explore/ExplorePage';
import { ProductDetailPage } from '../modules/explore/ProductDetailPage';

import { MatchesPage } from '../modules/matching/MatchesPage';
import { MatchRoomPage } from '../modules/matching/MatchRoomPage';
import { ExchangesPage } from '../modules/exchanges/ExchangesPage';

import { CircularTreePage } from '../modules/circular-tree/CircularTreePage';
import { ImpactPage } from '../modules/impact/ImpactPage';
import { EducationCenterPage } from '../modules/education/EducationCenterPage';
import { NotificationsPage } from '../modules/notifications/NotificationsPage';

import { AdminDashboardPage } from '../modules/administration/AdminDashboardPage';
import { AdminModerationPage } from '../modules/administration/AdminModerationPage';
import { AdminUsersPage } from '../modules/administration/AdminUsersPage';
import { AdminTerritorialPage } from '../modules/administration/AdminTerritorialPage';
import { AdminEducationPage } from '../modules/administration/AdminEducationPage';
import { AdminHistoryPage, AdminReportsPage } from '../modules/administration/AdminReportsLogsPage';

const AdaptiveShell: React.FC = () => {
  const { user } = useAuth();
  return user ? <AppLayout /> : <PublicLayout />;
};

export const AppRouter: React.FC = () => {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        {/* Rutas públicas */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<WelcomePage />} />
          <Route path="/iniciar-sesion" element={<LoginPage />} />
          <Route path="/registro" element={<RegisterPage />} />
          <Route path="/recuperar-contrasena" element={<ForgotPasswordPage />} />
          <Route path="/restablecer-contrasena" element={<ResetPasswordPage />} />
          <Route path="/reglas-comunitarias" element={<CommunityRulesPage />} />
        </Route>

        {/* Rutas adaptativas (accesibles tanto para visitantes como para usuarios autenticados) */}
        <Route element={<AdaptiveShell />}>
          <Route path="/explorar" element={<ExplorePage />} />
          <Route path="/producto/:id" element={<ProductDetailPage />} />
          <Route path="/impacto" element={<ImpactPage />} />
          <Route path="/educacion" element={<EducationCenterPage />} />
        </Route>

        {/* Rutas autenticadas de la comunidad */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/inicio" element={<HomeDashboardPage />} />
          <Route path="/publicar" element={<PublishProductWizard />} />
          <Route path="/mis-publicaciones" element={<MyProductsPage />} />
          <Route path="/matches" element={<MatchesPage />} />
          <Route path="/matches/:matchId" element={<MatchRoomPage />} />
          <Route path="/intercambios" element={<ExchangesPage />} />
          <Route path="/mi-arbol" element={<CircularTreePage />} />
          <Route path="/notificaciones" element={<NotificationsPage />} />
          <Route path="/perfil" element={<ProfilePage />} />
          <Route path="/configuracion" element={<SettingsPrivacyPage />} />
        </Route>

        {/* Panel de administración independiente y protegido por roles */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }
        >
          <Route index element={<AdminDashboardPage />} />
          <Route path="moderacion" element={<AdminModerationPage />} />
          <Route path="usuarios" element={<AdminUsersPage />} />
          <Route path="territorio" element={<AdminTerritorialPage />} />
          <Route path="educacion" element={<AdminEducationPage />} />
          <Route path="denuncias" element={<AdminReportsPage />} />
          <Route path="historial" element={<AdminHistoryPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

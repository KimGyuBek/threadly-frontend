import { Navigate, Route, Routes } from 'react-router-dom';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { MainLayout } from '@/layouts/MainLayout';
import LoginPage from '@/pages/LoginPage';
import HomeFeedPage from '@/pages/HomeFeedPage';
import SearchPage from '@/pages/SearchPage';
import CreatePostPage from '@/pages/CreatePostPage';
import ProfilePage from '@/pages/ProfilePage';
import ProfileSettingsPage from '@/pages/ProfileSettingsPage';
import ProfileSetupPage from '@/pages/ProfileSetupPage';
import AccountSettingsPage from '@/pages/AccountSettingsPage';
import AccountPasswordPage from '@/pages/AccountPasswordPage';
import AccountDeletionPage from '@/pages/AccountDeletionPage';
import AccountDeactivationPage from '@/pages/AccountDeactivationPage';
import AccountPrivacyPage from '@/pages/AccountPrivacyPage';
import MyProfileSummaryPage from '@/pages/MyProfileSummaryPage';
import NotificationsPage from '@/pages/NotificationsPage';
import NotificationDetailPage from '@/pages/NotificationDetailPage';
import PostDetailPage from '@/pages/PostDetailPage';
import UserProfilePage from '@/pages/UserProfilePage';

export const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route index element={<HomeFeedPage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="compose" element={<CreatePostPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="profile/settings" element={<ProfileSettingsPage />} />
          <Route path="profile/setup" element={<ProfileSetupPage />} />
          <Route path="profile/account" element={<AccountSettingsPage />} />
          <Route path="profile/account/password" element={<AccountPasswordPage />} />
          <Route path="profile/account/delete" element={<AccountDeletionPage />} />
          <Route path="profile/account/deactivate" element={<AccountDeactivationPage />} />
          <Route path="profile/account/privacy" element={<AccountPrivacyPage />} />
          <Route path="profile/details" element={<MyProfileSummaryPage />} />
          <Route path="users/:userId" element={<UserProfilePage />} />
          <Route path="posts/:postId/comments" element={<PostDetailPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="notifications/:eventId" element={<NotificationDetailPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

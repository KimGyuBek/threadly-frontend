import { Navigate, Route, Routes } from 'react-router-dom';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { MainLayout } from '@/layouts/MainLayout';
import LoginPage from '@/pages/LoginPage';
import HomeFeedPage from '@/pages/HomeFeedPage';
import SearchPage from '@/pages/SearchPage';
import CreatePostPage from '@/pages/CreatePostPage';
import ProfilePage from '@/pages/ProfilePage';
import ProfileSetupPage from '@/pages/ProfileSetupPage';
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
          <Route path="profile/setup" element={<ProfileSetupPage />} />
          <Route path="users/:userId" element={<UserProfilePage />} />
          <Route path="posts/:postId" element={<PostDetailPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="notifications/:eventId" element={<NotificationDetailPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

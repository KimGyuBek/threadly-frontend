import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuthStore } from '@/store/authStore';

export const ProtectedRoute = () => {
  const tokens = useAuthStore((state) => state.tokens);
  const location = useLocation();

  if (!tokens) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
};

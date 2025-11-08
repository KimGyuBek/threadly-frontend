import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import { LogOut, Bell, Home, Search, Edit3, User } from 'lucide-react';

import { logout } from '@/api/auth';
import { useAuthStore } from '@/store/authStore';

const navItems = [
  { to: '/', label: '홈', icon: Home },
  { to: '/search', label: '검색', icon: Search },
  { to: '/compose', label: '게시글 작성', icon: Edit3 },
  { to: '/profile', label: '내 프로필', icon: User },
];

export const MainLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const clearTokens = useAuthStore((state) => state.clearTokens);

  const activePath = useMemo(() => {
    if (location.pathname === '/') {
      return '/';
    }
    if (location.pathname.startsWith('/notifications')) {
      return '/notifications';
    }
    if (location.pathname.startsWith('/profile')) {
      return '/profile';
    }
    return location.pathname;
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    clearTokens();
    navigate('/login');
  };

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="app-logo">Threadly</div>
        <nav className="app-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.to} to={item.to} className={({ isActive }) => `app-nav__item ${isActive ? 'app-nav__item--active' : ''}`} end={item.to === '/'}>
                <Icon className="app-nav__icon" size={20} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
        <button type="button" className="app-nav__item app-nav__item--logout" onClick={handleLogout}>
          <LogOut className="app-nav__icon" size={20} />
          <span>로그아웃</span>
        </button>
      </aside>

      <div className="app-content">
        <div className="app-center-column">
          <header className="app-header">
            <div className="app-header__title">
              {navItems.find((item) => item.to === activePath)?.label ?? 'Threadly'}
            </div>
            <div className="app-header__actions">
              <button type="button" className="header-notification" onClick={() => navigate('/notifications')}>
                <Bell size={20} />
                <span>알림</span>
              </button>
            </div>
          </header>
          <main className="app-main">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};

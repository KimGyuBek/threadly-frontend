import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useRef, useState } from 'react';
import { LogOut, Bell, Home, Search, Edit3, User } from 'lucide-react';

import { logout } from '@/api/auth';
import { useAuthStore } from '@/store/authStore';

const navItems = [
  { to: '/', label: '홈', icon: Home },
  { to: '/search', label: '검색', icon: Search },
  { to: '/compose', label: '게시글 작성', icon: Edit3 },
  { to: '/notifications', label: '알림', icon: Bell },
  { to: '/profile', label: '내 프로필', icon: User },
];

export const MainLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const clearTokens = useAuthStore((state) => state.clearTokens);
  const [isHeaderVisible, setHeaderVisible] = useState(true);
  const lastScrollYRef = useRef(0);

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

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.scrollTo(0, 0);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return () => {};
    }

    const handleScroll = () => {
      const currentY = window.scrollY;

      if (currentY <= 20) {
        setHeaderVisible(true);
        lastScrollYRef.current = currentY;
        return;
      }

      if (Math.abs(currentY - lastScrollYRef.current) < 4) {
        lastScrollYRef.current = currentY;
        return;
      }

      if (currentY > lastScrollYRef.current) {
        setHeaderVisible(false);
      } else {
        setHeaderVisible(true);
      }

      lastScrollYRef.current = currentY;
    };

    const handleResize = () => {
      lastScrollYRef.current = window.scrollY;
      setHeaderVisible(true);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="app-logo">Threadly</div>
        <nav className="app-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.to} to={item.to} className={({ isActive }) => `app-nav__item ${isActive ? 'app-nav__item--active' : ''}`} end={item.to === '/'}>
                <Icon className="app-nav__icon" size={24} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
        <button type="button" className="app-nav__item app-nav__item--logout" onClick={handleLogout}>
          <LogOut className="app-nav__icon" size={24} />
          <span>로그아웃</span>
        </button>
      </aside>

      <div className="app-main-region">
        <header className={`app-header${isHeaderVisible ? '' : ' app-header--hidden'}`}>
          <div className="app-header__title">
            {navItems.find((item) => item.to === activePath)?.label ?? 'Threadly'}
          </div>
          <div className="app-header__brand">Threadly</div>
        </header>
        <div className="app-content">
          <div className="app-center-column">
            <main className="app-main">
              <Outlet />
            </main>
          </div>
        </div>
      </div>
    </div>
  );
};

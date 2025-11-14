import { NavLink } from 'react-router-dom';

const accountSettingItems = [
  {
    label: '비밀번호 변경',
    description: '현재 비밀번호를 확인하고 새 비밀번호로 교체합니다.',
    to: '/profile/account/password',
  },
  {
    label: '계정 공개범위 설정',
    description: '프로필과 게시글을 공개 또는 비공개로 전환합니다.',
    to: '/profile/account/privacy',
  },
  {
    label: '계정 비활성화',
    description: '일시적으로 계정을 숨기고 나중에 다시 활성화합니다.',
    to: '/profile/account/deactivate',
  },
  {
    label: '계정 탈퇴',
    description: 'Threadly 계정과 데이터를 완전히 삭제합니다.',
    to: '/profile/account/delete',
    tone: 'danger' as const,
  },
];

export const AccountSettingsMenu = () => {
  return (
    <div className="settings-list" role="navigation" aria-label="계정 설정 메뉴">
      {accountSettingItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            [
              'settings-list__item',
              item.tone === 'danger' ? 'settings-list__item--danger' : '',
              isActive ? 'settings-list__item--active' : '',
            ]
              .filter(Boolean)
              .join(' ')
          }
        >
          <span className="settings-list__label">{item.label}</span>
          <span className="settings-list__description">{item.description}</span>
        </NavLink>
      ))}
    </div>
  );
};

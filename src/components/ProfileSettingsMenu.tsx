import { NavLink } from 'react-router-dom';

const profileSettingItems = [
  {
    label: '프로필 정보 변경',
    description: '닉네임, 소개, 연락처, 프로필 이미지를 수정합니다.',
    to: '/profile/setup',
  },
  {
    label: '계정 설정',
    description: '비밀번호, 계정 상태, 공개 범위를 관리합니다.',
    to: '/profile/account',
  },
];

export const ProfileSettingsMenu = () => {
  return (
    <div className="settings-list" role="navigation" aria-label="프로필 설정 메뉴">
      {profileSettingItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) => `settings-list__item${isActive ? ' settings-list__item--active' : ''}`}
        >
          <span className="settings-list__label">{item.label}</span>
          <span className="settings-list__description">{item.description}</span>
        </NavLink>
      ))}
    </div>
  );
};

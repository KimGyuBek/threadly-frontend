import { useState } from 'react';
import type { ChangeEvent } from 'react';
import { toast } from 'react-toastify';

import { useComingSoonNotice } from '@/hooks/useComingSoonNotice';


const AccountPrivacyPage = () => {
  useComingSoonNotice();
  const [privacy, setPrivacy] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC');

  const handlePrivacyChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextPrivacy = event.target.value === 'PRIVATE' ? 'PRIVATE' : 'PUBLIC';
    setPrivacy(nextPrivacy);
    toast.success(`공개 범위를 ${nextPrivacy === 'PRIVATE' ? '비공개' : '공개'}로 업데이트했습니다. (실제 저장은 추후 제공 예정)`);
  };

  return (
    <div className="profile-setup-container">
      <h2 className="section-title">계정 공개범위 설정</h2>
      <p className="profile-setup-description">
        프로필과 게시글을 누구에게 공개할지 선택하세요. 설정은 언제든지 다시 변경할 수 있습니다.
      </p>
      <section className="account-settings-card" style={{ marginTop: '1.5rem' }}>
        <label className="auth-label" htmlFor="privacySelect">
          공개 범위
        </label>
        <select id="privacySelect" className="auth-input" value={privacy} onChange={handlePrivacyChange}>
          <option value="PUBLIC">공개</option>
          <option value="PRIVATE">비공개</option>
        </select>
        <p className="account-settings-hint">
          비공개 계정은 승인된 사용자만 프로필과 게시글을 볼 수 있습니다. 공개 설정으로 다시 전환하면 즉시 반영됩니다.
        </p>
      </section>
    </div>
  );
};

export default AccountPrivacyPage;

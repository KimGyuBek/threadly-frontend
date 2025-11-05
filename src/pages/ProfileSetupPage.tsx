import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import { registerProfile } from '@/features/profile/api/profileApi';
import type { RegisterProfilePayload } from '@/features/profile/api/profileApi';
import { useAuthStore } from '@/store/authStore';
import { buildErrorMessage } from '@/utils/errorMessage';

const genders = [
  { value: 'MALE', label: '남성' },
  { value: 'FEMALE', label: '여성' },
  { value: 'OTHER', label: '기타' },
];

const ProfileSetupPage = () => {
  const navigate = useNavigate();
  const setTokens = useAuthStore((state) => state.setTokens);
  const [form, setForm] = useState<RegisterProfilePayload>({
    nickname: '',
    statusMessage: '',
    bio: '',
    phone: '',
    gender: 'OTHER',
    profileImageUrl: '',
  });

  const mutation = useMutation({
    mutationFn: () => registerProfile(form),
    onSuccess: (tokens) => {
      setTokens(tokens);
      toast.success('프로필이 설정되었습니다.');
      navigate('/', { replace: true });
    },
    onError: (error: unknown) => {
      toast.error(buildErrorMessage(error, '프로필 설정에 실패했습니다.'));
    },
  });

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.nickname.trim()) {
      toast.error('닉네임을 입력하세요.');
      return;
    }
    mutation.mutate();
  };

  return (
    <div className="profile-setup-container">
      <h2 className="section-title">프로필 설정</h2>
      <p className="profile-setup-description">
        처음 오셨군요! 다른 사용자에게 보여질 프로필 정보를 입력해주세요.
      </p>
      <form className="profile-setup-form" onSubmit={handleSubmit}>
        <label className="auth-label" htmlFor="nickname">
          닉네임
        </label>
        <input
          id="nickname"
          name="nickname"
          type="text"
          value={form.nickname}
          onChange={handleChange}
          className="auth-input"
          placeholder="닉네임"
          disabled={mutation.isPending}
          required
        />

        <label className="auth-label" htmlFor="statusMessage">
          상태 메시지
        </label>
        <input
          id="statusMessage"
          name="statusMessage"
          type="text"
          value={form.statusMessage}
          onChange={handleChange}
          className="auth-input"
          placeholder="한 줄 소개"
          disabled={mutation.isPending}
        />

        <label className="auth-label" htmlFor="bio">
          소개
        </label>
        <textarea
          id="bio"
          name="bio"
          value={form.bio}
          onChange={handleChange}
          className="compose-textarea"
          placeholder="자기소개를 작성하세요"
          rows={6}
          disabled={mutation.isPending}
        />

        <label className="auth-label" htmlFor="phone">
          연락처
        </label>
        <input
          id="phone"
          name="phone"
          type="text"
          value={form.phone}
          onChange={handleChange}
          className="auth-input"
          placeholder="010-0000-0000"
          disabled={mutation.isPending}
        />

        <label className="auth-label" htmlFor="gender">
          성별
        </label>
        <select
          id="gender"
          name="gender"
          value={form.gender}
          onChange={handleChange}
          className="auth-input"
          disabled={mutation.isPending}
        >
          {genders.map((gender) => (
            <option key={gender.value} value={gender.value}>
              {gender.label}
            </option>
          ))}
        </select>

        <label className="auth-label" htmlFor="profileImageUrl">
          프로필 이미지 URL
        </label>
        <input
          id="profileImageUrl"
          name="profileImageUrl"
          type="text"
          value={form.profileImageUrl}
          onChange={handleChange}
          className="auth-input"
          placeholder="https://..."
          disabled={mutation.isPending}
        />

        <button type="submit" className="auth-submit" disabled={mutation.isPending}>
          {mutation.isPending ? '저장 중...' : '프로필 저장'}
        </button>
      </form>
    </div>
  );
};

export default ProfileSetupPage;

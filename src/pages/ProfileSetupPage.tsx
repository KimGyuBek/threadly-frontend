import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import { BouncingDotsLoader } from '@/components/BouncingDotsLoader';
import { NetworkErrorFallback } from '@/components/NetworkErrorFallback';
import {
  fetchMyProfile,
  registerProfile,
  updateProfile,
  uploadProfileImage,
  type RegisterProfilePayload,
} from '@/features/profile/api/profileApi';
import { useAuthStore } from '@/store/authStore';
import { buildErrorMessage } from '@/utils/errorMessage';
import { getProfileImageUrl, normalizeProfileImageUrl } from '@/utils/profileImage';
import { decodeJwt } from '@/utils/jwt';
import { isProfileSetupRequiredError } from '@/utils/profileSetup';
import { isNetworkUnavailableError } from '@/utils/networkError';

const genders = [
  { value: 'MALE', label: '남성' },
  { value: 'FEMALE', label: '여성' },
  { value: 'OTHER', label: '기타' },
];

type ProfileMode = 'register' | 'update';

type ProfileFormState = Omit<RegisterProfilePayload, 'profileImageUrl'>;

interface ProfileImageState {
  imageId: string | null;
  imageUrl?: string;
}

const ProfileSetupPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const tokens = useAuthStore((state) => state.tokens);
  const setTokens = useAuthStore((state) => state.setTokens);
  const accessToken = tokens?.accessToken;
  const userStatusType = useMemo(() => {
    if (!accessToken) {
      return null;
    }
    return decodeJwt(accessToken)?.userStatusType ?? null;
  }, [accessToken]);
  const skipProfileFetch = userStatusType === 'INCOMPLETE_PROFILE';

  const [mode, setMode] = useState<ProfileMode>('register');
  const [prefilled, setPrefilled] = useState(false);
  const [form, setForm] = useState<ProfileFormState>({
    nickname: '',
    statusMessage: '',
    bio: '',
    phone: '',
    gender: 'OTHER',
  });
  const [profileImage, setProfileImage] = useState<ProfileImageState>({
    imageId: null,
    imageUrl: undefined,
  });

  const profileQuery = useQuery({
    queryKey: ['me', 'profile', 'setup'],
    queryFn: fetchMyProfile,
    retry: false,
    enabled: !skipProfileFetch,
  });

  useEffect(() => {
    if (prefilled) {
      return;
    }
    if (skipProfileFetch) {
      setMode('register');
      setPrefilled(true);
      return;
    }
    if (profileQuery.isSuccess) {
      const profile = profileQuery.data;
      setMode('update');
      setForm({
        nickname: profile.nickname ?? '',
        statusMessage: profile.statusMessage ?? '',
        bio: profile.bio ?? '',
        phone: profile.phone ?? '',
        gender: profile.genderType || 'OTHER',
      });
      setProfileImage({
        imageId: profile.profileImageId ?? null,
        imageUrl: profile.profileImageUrl ?? undefined,
      });
      setPrefilled(true);
      return;
    }
    if (profileQuery.isError && isProfileSetupRequiredError(profileQuery.error)) {
      setMode('register');
      setPrefilled(true);
    }
  }, [prefilled, profileQuery.data, profileQuery.error, profileQuery.isError, profileQuery.isSuccess, skipProfileFetch]);

  const registerMutation = useMutation({
    mutationFn: () =>
      registerProfile({
        nickname: form.nickname.trim(),
        statusMessage: form.statusMessage ?? '',
        bio: form.bio ?? '',
        phone: form.phone ?? '',
        gender: form.gender,
        profileImageUrl: profileImage.imageUrl,
      }),
    onSuccess: (tokens) => {
      setTokens(tokens);
      toast.success('프로필이 설정되었습니다.');
      navigate('/', { replace: true });
    },
    onError: (error: unknown) => {
      toast.error(buildErrorMessage(error, '프로필 설정에 실패했습니다.'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      updateProfile({
        nickname: form.nickname.trim(),
        statusMessage: form.statusMessage ?? '',
        bio: form.bio ?? '',
        phone: form.phone ?? '',
        profileImageId: profileImage.imageId ?? null,
      }),
    onSuccess: () => {
      toast.success('프로필을 저장했습니다.');
      queryClient.invalidateQueries({ queryKey: ['me', 'profile'] });
      navigate('/profile', { replace: true });
    },
    onError: (error: unknown) => {
      toast.error(buildErrorMessage(error, '프로필 수정에 실패했습니다.'));
    },
  });

  const uploadMutation = useMutation({
    mutationFn: uploadProfileImage,
    onSuccess: (uploaded) => {
      setProfileImage({
        imageId: uploaded.userProfileImageId,
        imageUrl: normalizeProfileImageUrl(uploaded.imageUrl),
      });
      toast.success('프로필 이미지를 업로드했습니다.');
    },
    onError: (error: unknown) => {
      toast.error(buildErrorMessage(error, '프로필 이미지 업로드에 실패했습니다.'));
    },
  });

  const inFlight = registerMutation.isPending || updateMutation.isPending || uploadMutation.isPending;

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    event.target.value = '';
    if (files.length === 0) {
      return;
    }
    try {
      await uploadMutation.mutateAsync(files[0]);
    } catch {
      // toast handled in onError
    }
  };

  const handleRemoveImage = () => {
    setProfileImage({ imageId: null, imageUrl: undefined });
    toast.info('프로필 이미지를 제거했습니다.');
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.nickname.trim()) {
      toast.error('닉네임을 입력하세요.');
      return;
    }
    if (uploadMutation.isPending) {
      toast.info('이미지 업로드가 완료될 때까지 기다려 주세요.');
      return;
    }
    if (mode === 'register') {
      registerMutation.mutate();
    } else {
      updateMutation.mutate();
    }
  };

  const isLoadingProfile = !skipProfileFetch && profileQuery.isPending && !prefilled;
  const allowRegisterWithoutProfile =
    skipProfileFetch || (profileQuery.isError && isProfileSetupRequiredError(profileQuery.error));

  const fatalProfileError = !skipProfileFetch && profileQuery.isError && !allowRegisterWithoutProfile;

  const imagePreview = useMemo(() => getProfileImageUrl(profileImage.imageUrl), [profileImage.imageUrl]);

  if (isLoadingProfile) {
    return (
      <div className="profile-setup-container">
        <BouncingDotsLoader message="프로필 정보를 불러오는 중..." />
      </div>
    );
  }

  if (profileQuery.isError && isNetworkUnavailableError(profileQuery.error)) {
    return <NetworkErrorFallback />;
  }

  if (fatalProfileError) {
    return (
      <div className="feed-placeholder feed-placeholder--error">
        <p>{buildErrorMessage(profileQuery.error, '프로필 정보를 불러오지 못했습니다.')}</p>
        <button type="button" className="btn" onClick={() => profileQuery.refetch()}>
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className="profile-setup-container">
      <h2 className="section-title">{mode === 'register' ? '프로필 설정' : '프로필 수정'}</h2>
      <p className="profile-setup-description">
        {mode === 'register'
          ? '다른 사용자에게 보여질 정보를 입력하고 첫 프로필을 완성하세요.'
          : '닉네임과 소개, 연락처, 프로필 이미지를 수정할 수 있습니다.'}
      </p>
      <form className="profile-setup-form" onSubmit={handleSubmit}>
        <div className="profile-avatar" style={{ marginBottom: 16 }}>
          <img src={imagePreview} alt="프로필 미리보기" />
        </div>
        <div className="compose-upload" style={{ marginBottom: 16 }}>
          <label className="btn btn--secondary" htmlFor="profile-image-upload">
            {uploadMutation.isPending ? '이미지 업로드 중...' : '프로필 이미지 선택'}
          </label>
          <input
            id="profile-image-upload"
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            style={{ display: 'none' }}
            disabled={uploadMutation.isPending || inFlight}
          />
          {(profileImage.imageUrl || profileImage.imageId) && (
            <button
              type="button"
              className="btn btn--secondary"
              style={{ marginLeft: 8 }}
              onClick={handleRemoveImage}
              disabled={inFlight}
            >
              이미지 제거
            </button>
          )}
        </div>

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
          disabled={inFlight}
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
          disabled={inFlight}
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
          disabled={inFlight}
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
          disabled={inFlight}
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
          disabled={inFlight || mode === 'update'}
        >
          {genders.map((gender) => (
            <option key={gender.value} value={gender.value}>
              {gender.label}
            </option>
          ))}
        </select>
        {mode === 'update' ? (
          <p className="profile-setup-description" style={{ marginTop: 4 }}>
            최초 설정 이후에는 성별을 변경할 수 없습니다.
          </p>
        ) : null}

        <button type="submit" className="auth-submit" disabled={inFlight}>
          {mode === 'register'
            ? registerMutation.isPending
              ? '저장 중...'
              : '프로필 저장'
            : updateMutation.isPending
              ? '저장 중...'
              : '변경 내용 저장'}
        </button>
      </form>
    </div>
  );
};

export default ProfileSetupPage;

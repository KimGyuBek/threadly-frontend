# threadly-front

### Threadly 플랫폼의 **프론트엔드 애플리케이션**입니다.

**플랫폼은 MSA 구조로 구성되어 있으며,**

`threadly-front`는 사용자 인터페이스를 담당하는 React 기반 SPA입니다.

<br>

> **이 프로젝트는 AI 코딩 도구 Codex를 활용하여 작성되었으며, 지속적으로 업데이트 중입니다.**
>
> 현재 완성본이 아니며, 기능 개선 및 추가 작업이 진행되고 있습니다.

<br>

> **전체 서비스 아키텍처 및 시스템 구성은 메인 레포에서 확인할 수 있습니다.**
 
### 메인 레포: https://github.com/KimGyuBek/Threadly
### Wiki 문서: https://github.com/KimGyuBek/Threadly/wiki

### threadly-service(API): https://github.com/KimGyuBek/threadly-service
### notification-service: https://github.com/KimGyuBek/notification-service

<br>

### Threadly 서비스: https://threadly.kr

---

## 배포 정보

- **호스팅**: AWS S3 + CloudFront
- **프로덕션 URL**: https://threadly.kr
- **API 엔드포인트**: https://api.threadly.kr

---

## 기술 스택

**Frontend Framework**
- React 19
- TypeScript 5.9
- Vite 7

**상태 관리 & 데이터 페칭**
- TanStack Query (React Query) 5.90
- Zustand 5.0
- Axios 1.13

**UI & Styling**
- Lucide React (아이콘)
- React Toastify (알림)
- clsx (유틸리티)

**개발 도구**
- ESLint
- Vitest

---

## 프로젝트 소개

Threadly 프론트엔드는 threadly-service와 notification-service를 연동해 다음 기능을 제공합니다.
- 사용자 인증 (회원가입/로그인/OAuth2)
- 게시글 작성, 조회, 수정, 삭제
- 팔로우/언팔로우
- 실시간 알림 (WebSocket)
- 무한 스크롤 피드



## 백엔드 요구사항
- threadly-service가 `http://localhost:8080` 에서 `/api/auth/**`, `/api/notifications/**` 등 REST API를 제공합니다.
- notification-service가 `http://localhost:8081` 에서 알림 REST 및 `ws://localhost:8081/ws/notifications` WebSocket을 제공합니다.
- 두 서비스 모두 CORS 헤더가 열려 있거나, 프런트가 동일 호스트/포트에서 reverse proxy 형태로 접근해야 합니다.

## 구조
```
src/
├── api/                # axios 인스턴스 및 API 래퍼
├── components/         # 재사용 UI 컴포넌트
├── hooks/              # WebSocket 등 커스텀 훅
├── pages/              # 라우트 페이지 (로그인, 알림 목록/상세)
├── providers/          # React Query Provider 등
├── routes/             # 라우팅 구성
├── store/              # Zustand 기반 인증 상태 저장
├── types/              # API/도메인 타입 정의
└── utils/              # 포맷터 및 매퍼
```

## 환경 변수
루트에 `.env.local`을 생성하고 필요 시 API 엔드포인트를 변경할 수 있습니다.

```bash
VITE_API_BASE_URL=https://api.threadly.kr
VITE_NOTIFICATION_API_BASE_URL=https://api.threadly.kr
VITE_NOTIFICATION_WS_URL=ws://api.threadly.kr/ws/notifications
```

프로덕션 주소(`https://api.threadly.kr`)가 기본값이라 별도 설정 없이도 동작하며, 로컬 개발 시에는 위 값을 `http://localhost:8080` 등으로 교체해 사용하면 됩니다.

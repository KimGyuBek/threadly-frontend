# Threadly Frontend (React)

Threadly 프론트는 threadly-service(8080)와 notification-service(8081)를 연동해 로그인, 알림 목록/상세, WebSocket 기반 실시간 알림을 제공하는 React + TypeScript + Vite 애플리케이션입니다.

## 주요 기능
- 첫 화면에서 회원가입/로그인 토글 지원
- JWT 로그인/로그아웃 및 자동 토큰 재발급 (Axios 인터셉터 기반)
- 커서 기반 무한 스크롤 알림 목록, 일괄 읽음/삭제 처리
- 알림 상세 보기 및 메타데이터 확인
- WebSocket 실시간 알림 수신, 토스트 알림, 자동 재연결 & ACK 전송
- React Query로 데이터 캐싱 및 상태 관리, Zustand 로컬 토큰 저장소

## 환경 변수
루트에 `.env.local`을 생성하고 필요 시 API 엔드포인트를 변경할 수 있습니다.

```bash
VITE_API_BASE_URL=https://api.threadly.kr
VITE_NOTIFICATION_API_BASE_URL=https://api.threadly.kr
VITE_NOTIFICATION_WS_URL=ws://api.threadly.kr/ws/notifications
```

프로덕션 주소(`https://api.threadly.kr`)가 기본값이라 별도 설정 없이도 동작하며, 로컬 개발 시에는 위 값을 `http://localhost:8080` 등으로 교체해 사용하면 됩니다.

## 개발 환경 준비
1. 의존성 설치
   ```bash
   npm install
   ```
2. 개발 서버 실행
   ```bash
   npm run dev
   ```
   기본 포트는 `http://localhost:5173`입니다.
3. 프로덕션 빌드
   ```bash
   npm run build
   ```
4. 빌드 결과 미리보기
   ```bash
   npm run preview
   ```

> ❗️ npm 캐시 권한 문제로 설치가 실패한다면 `npm install` 앞에 `NPM_CONFIG_CACHE=$(pwd)/.npm-cache`를 임시로 지정하세요.

## 백엔드 요구사항
- threadly-service가 `http://localhost:8080` 에서 `/api/auth/**`, `/api/notifications/**` 등 REST API를 제공합니다.
- notification-service가 `http://localhost:8081` 에서 알림 REST 및 `ws://localhost:8081/ws/notifications` WebSocket을 제공합니다.
- 두 서비스 모두 CORS 헤더가 열려 있거나, 프런트가 동일 호스트/포트에서 reverse proxy 형태로 접근해야 합니다.

## 구조 개요
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

## 확인 체크리스트
- [ ] `npm run dev` 실행 후 로그인 → 알림 목록 → 알림 상세 플로우가 정상 작동
- [ ] 액세스 토큰 만료 시 자동 재발급 및 재시도 동작 확인
- [ ] WebSocket 접속 상태 배지가 `실시간 연결됨`으로 표시되고, 새 알림 수신 시 토스트와 목록 갱신 확인
- [ ] 커서 기반 "더 보기" 버튼으로 페이지네이션이 진행되는지 확인

필요 시 Vite Proxy 설정 등 추가 구성이 가능하며, 프로젝트 전반은 TypeScript와 엄격한 타입 체크(Strict 모드)로 작성되어 있습니다.

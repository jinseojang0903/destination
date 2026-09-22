# 다트 여행 (Travel Dart)

새총처럼 지도에 다트를 던져서, 찍힌 곳으로 다음 여행지를 정하는 웹앱.

## 시작하기

1. 필요한 키 발급
   - [Mapbox](https://account.mapbox.com/access-tokens/) 액세스 토큰
   - [Firebase](https://console.firebase.google.com/) 프로젝트 생성 후 **Authentication → Sign-in method → 전화(Phone)** 활성화, **Firestore** 활성화, 웹 앱 등록 후 설정값 복사
     - 테스트 중에는 Authentication → Settings → 승인된 도메인에 `localhost`가 기본 포함되어 있는지 확인하세요.
     - 실제 SMS 발송량이 늘어나면 Blaze(종량제) 요금제가 필요할 수 있어요. 개인용 소규모 사용은 무료 한도로 충분합니다.
   - [Unsplash](https://unsplash.com/oauth/applications) Access Key (선택, 없으면 대륙별 기본 이미지로 대체됨)
2. `.env.local.example`을 `.env.local`로 복사하고 위에서 발급받은 값을 채우기
3. 의존성 설치 및 실행
   ```
   npm install
   npm run dev
   ```
4. Firestore 보안 규칙 배포 (Firebase CLI 필요)
   ```
   firebase deploy --only firestore:rules
   ```

## 시도 횟수(공식 던지기) 추가 부여하기

휴대폰 번호를 처음 인증하는 순간 계정이 만들어지며(문서 키는 uid가 아니라 **전화번호 자체**, 예: `users/+821012345678`) 공식 던지기 1회가 기본으로 주어집니다. 추가 기회를 주는 방법은 두 가지입니다.

**방법 A — 사용자가 앱에서 요청 → 관리자가 승인**
사용자가 홈 화면의 "관리자에게 기회 달라고 조르기"에서 이름/사유를 적어 요청을 보내면, 관리자는 `/admin` 페이지에서 요청을 보고 승인(원하는 횟수 입력)하거나 거절할 수 있습니다. 승인 즉시 해당 전화번호의 `attemptsRemaining`이 늘어납니다.

관리자로 지정하려면 Firebase 콘솔 → Firestore Database → `admins` 컬렉션에 **자기 전화번호를 문서 ID로 하는 빈 문서**를 하나 만들면 됩니다 (예: 문서 ID `+821012345678`, 필드는 없어도 됨). 이 컬렉션은 콘솔에서만 편집 가능하고 앱에서는 절대 쓸 수 없도록 규칙으로 막아뒀습니다.

**방법 B — Firestore 콘솔에서 직접 수정**
1. Firebase 콘솔 → Firestore Database → `users/{해당 전화번호}` 문서로 이동
2. `attemptsRemaining` 필드 값을 원하는 만큼 늘리기 (예: 1 → 3)
3. (선택) `attemptsGrantedTotal`도 같이 늘려서 기록해두기

일반 사용자 계정은 `attemptsRemaining`을 절대 스스로 늘릴 수 없도록 `firestore.rules`에서 막아뒀고, 관리자 계정(`admins` 컬렉션에 등록된 전화번호)만 늘릴 수 있습니다.

## 로그인(SMS 인증) 켜고 끄기

Blaze 요금제에서 SMS는 실제 전화번호마다 비용이 나가기 때문에, 준비되기 전까지는 로그인 자체를 완전히 막아둘 수 있게 만들어뒀습니다. **기본값은 "잠김"** 입니다 — `systemStatus/config` 문서가 없으면 `/login` 페이지가 인증번호 요청 폼 자체를 보여주지 않습니다.

**열기(로그인 허용):**
1. Firebase 콘솔 → Firestore Database → **"+ 컬렉션 시작"**
2. 컬렉션 ID: `systemStatus`, 문서 ID: `config`
3. 필드 추가: 이름 `phoneAuthEnabled`, 유형 `boolean`, 값 `true`

**다시 잠그기**: 그 필드 값을 `false`로 바꾸면 됩니다 (문서를 지워도 동일한 효과).

배포 없이 즉시 반영되고, 앱에서는 절대 이 값을 쓸 수 없도록 `firestore.rules`로 막아뒀습니다.

## 지리 데이터 재생성

`public/geo/`의 국가/대륙 경계 GeoJSON과 `src/data`, `src/lib/geo/continentMap.ts`는
`scripts/build-geo-data.cjs`가 생성한 결과물입니다. 원본 데이터셋을 다시 받아 재생성하려면:

```
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson" -OutFile "scripts_countries_raw.geojson"
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/lukes/ISO-3166-Countries-with-Regional-Codes/master/all/all.json" -OutFile "scripts_regions_raw.json"
npm run gen:geo
```

## 테스트

핵심 로직(지역 내부 판정, 랜덤 착지점, 조준/파워 계산, 오차 적용)은 순수 함수로 분리되어 있으며 Vitest로 검증합니다.

```
npm test
```

## 폴더 구조 요약

- `src/lib/geo/pointInRegion.ts` — 폴리곤 내부 판정, 폴리곤 내 랜덤 포인트 생성
- `src/lib/throw/computeLanding.ts` — 조준(드래그)+파워 → 착지점 계산, 랜덤 오차, 지역 검증
- `src/components/slingshot/` — 드래그 조작 UI, 포물선 애니메이션
- `src/lib/firebase/` — 인증, 시도 횟수 관리, 히스토리 저장(트랜잭션)
- `src/app/throw/page.tsx` — 던지기 전체 흐름을 엮는 메인 화면

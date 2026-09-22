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

휴대폰 번호를 처음 인증하는 순간 계정이 만들어지며 공식 던지기 1회가 기본으로 주어지고, 관리자 승인 UI는 의도적으로 만들지 않았습니다.
누군가에게 추가 기회를 주고 싶다면:

1. Firebase 콘솔 → Firestore Database → `users/{해당 계정의 uid}` 문서로 이동
2. `attemptsRemaining` 필드 값을 원하는 만큼 늘리기 (예: 1 → 3)
3. (선택) `attemptsGrantedTotal`도 같이 늘려서 기록해두기

클라이언트 코드에서는 이 값을 절대 늘릴 수 없도록 `firestore.rules`에서 막아뒀습니다.

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

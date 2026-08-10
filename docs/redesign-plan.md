# 빛새김 리디자인 기획서 — 게임화 · 캐릭터 · 악보 · 나눔

> 작성일 2026-07-29 · 목표: "필사→나눔" 앱을 **미니멀 + 습관(스트릭·포인트) + 선택적 모임**으로 개편
> 디자인 방향 (2026-08-10 갱신): **파스텔·귀여움 대신 화이트·골드 미니멀** 유지. 게임화 수치(스트릭·포인트)는 남기되 UI는 얇은 선·여백 중심.
> 결정된 방향
> 1. **습관 트래킹** (스트릭·포인트·주간 필사 — 캐릭터 정원 UI는 최소화)
> 2. 악보는 **사용자·모임 업로드** 방식 (인터넷 크롤링 X — 저작권 이슈)
> 3. **찬양 필사가 메인** — 홈 미션에서 묵상은 제외, 필사 위주로 구성
> 4. **필사 화면은 iPad 분할** — 왼쪽 악보 / 오른쪽 필사(손글씨·타이핑) *(미구현)*
> 5. **모임은 선택적** — 모임 없이 혼자도 곡 필사 가능
> 6. A~B 스프린트 진행 중 (온보딩·홈·혼자 필사·활동 로그)

---

## 결정 반영: "모임 선택적" 구조의 파급

기존 앱은 **온보딩 → 모임 참여 강제**(`useRootNavigationLogic`가 모임 없으면 `join-gathering`으로 리다이렉트). 이걸 **혼자도 쓸 수 있게** 완화한다.

| 영역 | 지금(강제) | 변경(선택적) |
|------|-----------|--------------|
| 온보딩 | 이름 → 모임 코드 필수 | 이름 → **바로 홈**. "모임 코드 있어요"는 선택 버튼 |
| 필사 곡 소스 | 모임장이 짠 예배 콘티(setlist)에서만 | **혼자 모드**: 씨앗 곡 목록에서 곡 직접 선택 필사. 모임 모드: 콘티 병행 |
| 나눔 | 내 모임 안에서만 | 모임 있으면 모임 피드, **없으면 내 필사 보관함**(비공개) — 추후 공개 옵션 |
| 우리 마을 | — | **모임에 속했을 때만** 노출(혼자면 숨김 or "모임 만들기" 유도) |
| 홈 | 모임 정보 표시 | 모임 있으면 모임명 뱃지, 없으면 개인 정원만 |

- 네비게이션 가드 수정: `isOnboarded && !gatheringId` 여도 홈 진입 허용(현재는 `join-gathering` 강제) — `app/_layout.tsx:66` 로직 변경 필요.
- `transcriptions.worship_id` 등 모임 의존 컬럼은 **nullable 허용**(혼자 필사는 worship 없이 song만).
- 데이터 모델의 `gathering_id`는 모두 nullable로(§1.3의 `daily_activities` 이미 반영됨).

---

## 0. 큰 그림

레퍼런스 앱의 핵심 = **마스코트 + 성장 은유 + 매일 습관 체크**.
빛새김에 대입하면:

```
매일 신앙 활동(성경읽기 · 묵상/기도 · 주일예배 · 찬양 필사)을 하면
→ 캐릭터의 "정원"이 자라고 (씨앗 → 새싹 → 꽃)
→ 스트릭(연속일)과 별(포인트)이 쌓이고
→ 필사 결과를 "나눔"에 귀엽게 공유하면 모임원이 응원(스티커) 반응
→ "우리 마을"에서 모임원들의 정원을 함께 본다
```

기존 자산 재활용: `transcriptions`(필사 기록), `gatherings`/`gathering_members`(모임), `gallery_posts`/`likes`(나눔), `songs`/`worship_services`/`setlist_items`(찬양·예배).

---

## 1. 게임화 시스템

### 1.1 홈 화면 (신설 — 게임화의 중심)
현재 `app/(tabs)/index.tsx`는 `/transcribe`로 리다이렉트만 함. → **홈을 실제 첫 탭으로 승격**.

레퍼런스 기준 홈 구성:
- 상단: **캐릭터 + 정원 씬**(배경/꽃/열매), "우리 마을 보기" · "자료실 보기" 버튼
- **스트릭 카드**(🔥 N일) + **포인트 카드**(⭐ N점)
- **주차 네비게이터** ("5주차 · 7/26 주간", 좌우 화살표, 다음 모임 날짜 뱃지)
- **오늘의 정원** — 일일 미션 목록 (**찬양 필사가 메인**):
  - **찬양 필사** → 요일별 새싹 아이콘(완료=녹색, 오늘=강조, 미래=흐림) + "오늘 필사하기" CTA
  - 성경읽기 → 보조 미션 바
  - 주일 공예배 → 완료 뱃지 (주 1회)
  - ~~매일묵상/기도~~ → 이번 범위에서 제외

### 1.2 미션 · 스트릭 · 포인트 규칙 (초안)
| 미션 | 포인트 | 스트릭 기여 |
|------|--------|-------------|
| **찬양 필사 1곡** (메인) | +15 | ✅ |
| 성경읽기 | +10 | ✅ |
| 주일 공예배 | +20 | 주 1회 |

- **스트릭** = "하루에 미션 1개 이상 완료"가 연속된 일수.
- **정원 성장 단계** = 누적 포인트 구간(예: 0/50/150/400 → 씨앗/새싹/꽃/열매).
- 포인트·스트릭은 **활동 로그에서 계산**(비정규화 컬럼보다 로그 기반이 정합성 안전).

### 1.3 데이터 모델 (신규)
```sql
-- 일일 활동 로그 (미션 완료 단위)
create table public.daily_activities (
  id           uuid primary key default gen_random_uuid(),
  device_id    text not null references public.users(device_id) on delete cascade,
  gathering_id uuid references public.gatherings(id) on delete set null,
  activity_date date not null,              -- 로컬 기준 날짜
  type         text not null check (type in
                 ('bible_reading','meditation_prayer','sunday_worship','transcription')),
  ref_id       uuid,                         -- 필사면 transcription id 등
  created_at   timestamptz default now(),
  unique(device_id, activity_date, type, ref_id)
);
create index daily_activities_device_date_idx
  on public.daily_activities(device_id, activity_date);

-- 캐릭터/정원 상태 (커스터마이징 대비)
create table public.user_character (
  device_id   text primary key references public.users(device_id) on delete cascade,
  mascot      text default 'sprout',        -- 마스코트 종류
  outfit      text,                          -- 의상(추후)
  garden_theme text default 'meadow',
  updated_at  timestamptz default now()
);
```
- 스트릭/포인트 조회는 RPC로: `rpc_get_home_summary(device_id, week_start)` → `{ streak, points, week_missions[] }`.
- 기존 필사 완료 시 `daily_activities`에 `transcription` 타입 자동 insert (기존 `rpc_record_transcription` 확장).

---

## 2. 캐릭터 & 디자인 시스템

### 2.1 톤 전환
현재 팔레트(`constants/colors.ts`)는 **화이트·골드 미니멀**. 게임화에는 **파스텔 크림 + 둥근 카드 + 부드러운 그림자**가 맞음.
- 배경: 이미 있는 스플래시 크림 `#f7edd8` 계열을 앱 전역 톤으로 승격 검토.
- 포인트 컬러: 새싹 그린 / 딸기 레드 / 하늘 블루 등 파스텔 액센트 추가.
- `radius`는 이미 넉넉(`3xl: 22`). `shadow.soft`가 지금 투명 → **실제 부드러운 그림자로 부활** 필요.

### 2.2 마스코트 (에셋 전략)
- **1단계**: 마스코트 1종 + 표정 3~4개(기본/뿌듯/응원/졸림) PNG 세트. 정원 배경 몇 종.
- **2단계**: 레이어 조합 아바타(몸+표정+의상)로 커스터마이징.
- 렌더링: 정적은 `expo-image`, 흔들림/반짝임 애니메이션은 이미 있는 **Skia/Reanimated** 활용.
- 에셋 소스: AI 생성 or 외주 일러스트. (캐릭터 라이선스·일관성 위해 세트로 확보)

### 2.3 공통 컴포넌트 추가
- `GameCard`(둥근 파스텔 카드), `StatPill`(🔥/⭐ 표시), `WeekDots`(요일 새싹), `MascotView`, `ReactionBar`.

---

## 3. 악보 기능 (사용자·모임 업로드)

> ⚠️ 인터넷 악보 크롤링은 대부분 저작권 대상이라 미채택. **모임이 보유한 악보를 직접 업로드**하는 합법 경로.

### 3.1 흐름
```
곡 상세 → "악보" 탭
  · 악보 있으면: 페이지 이미지 뷰어(핀치 줌·좌우 스와이프)
  · 없으면: (리더/업로드 권한자에게) "악보 올리기" 버튼
곡 검색 → 결과에서 악보 보유 곡 뱃지 표시
```
- 기존 **가사(lyrics)는 유지**하고, 악보를 탭/토글로 병행(가사 ↔ 악보).
- **iPad(태블릿)에서는 필사 화면을 좌우 분할**: 왼쪽 = 악보 이미지 뷰어, 오른쪽 = 필사(손글씨/타이핑) 영역. 악보를 보며 바로 따라 씀. (폰에서는 세그먼트 전환으로 대체)
- 업로드: `expo-image-picker`(이미 사용 중) → `expo-image-manipulator`로 리사이즈 → Supabase Storage.
- 뷰어: 확대 모달 + 다중 페이지(넘김).

### 3.2 데이터 모델 (신규)
```sql
create table public.song_sheets (
  id           uuid primary key default gen_random_uuid(),
  song_id      uuid not null references public.songs(id) on delete cascade,
  gathering_id uuid references public.gatherings(id) on delete cascade, -- 모임 범위 공유
  uploaded_by  text references public.users(device_id),
  image_url    text not null,
  page_index   int not null default 0,     -- 여러 장 순서
  created_at   timestamptz default now()
);
create index song_sheets_song_idx on public.song_sheets(song_id, gathering_id, page_index);
```
- Storage 버킷 `sheets/`(기존 `gallery` 버킷 정책 002 참고해 동일 패턴).
- RPC: `rpc_insert_song_sheet`, `rpc_delete_song_sheet` (device_id·권한 검증).
- 권한: 기본 **리더/모임장**만 업로드, 조회는 모임원 전체.

---

## 4. 나눔(갤러리) 개편

현재: 2열 그리드 `PostCard` + `좋아요`(likes) + 필터칩.

### 4.1 귀엽게
- **스티커 반응**으로 확장: 🙏 아멘 / 🌱 응원 / ❤️ 좋아요 (단순 like → 다중 이모지).
- 카드: 둥근 폴라로이드 프레임 + 작성자 **미니 마스코트 아바타** + 날짜 손글씨 느낌.
- 필사 이미지에 **캐릭터 스탬프/프레임** 자동 합성 옵션(`react-native-view-shot` 이미 사용 중).

### 4.2 데이터 모델 (변경)
```sql
-- 기존 likes 확장(또는 신규 reactions)
alter table public.likes add column if not exists emoji text default 'heart';
-- unique(post_id, device_id) → unique(post_id, device_id, emoji)로 변경 검토
```
- RPC `rpc_toggle_reaction(post_id, emoji)`로 정리.

---

## 5. 화면 · 네비게이션 변경

| 현재 | 변경 |
|------|------|
| `(tabs)/index.tsx` → transcribe 리다이렉트 | **홈 화면 실제 구현** (게임화 대시보드) |
| 탭: 필사 · 나눔 · 마이 | 탭: **홈 · 필사 · 나눔 · 마이** (홈 신설, 첫 탭) |
| — | `home/village.tsx` (우리 마을 — 모임원 정원) |
| — | `home/resources.tsx` (자료실) |
| 곡 상세(가사) | 곡 상세에 **악보 탭** 추가 |

- 온보딩/모임 가드 로직(`useRootNavigationLogic`)은 유지, 홈을 기본 진입점으로 조정.

---

## 6. 단계별 로드맵

**Phase 1 — 디자인 토대 & 홈 골격** (게임화 없이 껍데기부터)
- 파스텔 팔레트/그림자 부활, `GameCard`·`StatPill`·`WeekDots` 컴포넌트
- 마스코트 에셋 1종 + 홈 화면 정적 레이아웃 (더미 데이터)

**Phase 2 — 게임화 데이터**
- `daily_activities`·`user_character` 테이블 + RPC(`rpc_get_home_summary`, 미션 완료)
- 필사 완료 → 활동 로그 연동, 스트릭/포인트 실계산

**Phase 3 — 악보**
- `song_sheets` + Storage + 업로드/뷰어(핀치 줌·다중 페이지)

**Phase 4 — 나눔 리디자인**
- 스티커 반응, 마스코트 아바타 카드, 스탬프 합성

**Phase 5 — 커뮤니티**
- 우리 마을(모임원 정원), 자료실

---

## 7. 미결정 · 리스크

- [ ] 미션 종류·포인트 수치 밸런싱 (실제 사용 패턴 보고 조정)
- [ ] "성경읽기/묵상"은 체크만 할지, 콘텐츠(본문·묵상글)까지 넣을지
- [ ] 캐릭터 에셋 제작 방식·예산 (AI vs 외주)
- [ ] 악보 업로드 시 저작권 고지/책임 문구 (모임이 보유·라이선스한 자료만)
- [ ] `daily_activities` 날짜 기준 타임존 처리(로컬 자정 경계)
- [ ] 다크모드에서 파스텔/캐릭터 톤 대응
- [ ] 기존 사용자 마이그레이션(과거 필사 → 초기 포인트 소급 여부)

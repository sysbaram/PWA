# 외상노트

고객별 외상과 입금을 기록하고 현재 미수금을 확인하는 모바일 우선 PWA입니다. 화면은 정적 웹 호스팅에서 실행되며, 데이터는 Google Apps Script API를 거쳐 Google Sheets에 저장됩니다.

## 포함 기능

- 고객 등록
- 외상 추가와 입금 처리
- 외상·입금 입력 중 신규 고객 등록 및 자동 선택
- 외상·입금 저장 결과 검증 후 거래내역 화면 자동 이동
- 고객별 현재 잔액과 전체 미수금 합계
- 미수금 고객 목록과 30일 이상 오래된 외상 강조
- 고객명·전화번호 검색
- 전체 및 고객별 거래내역
- 고객별 가스통 대여·반납 처리
- 현재 대여 중인 가스통 수량과 대여 이력
- 외상·입금 및 가스통 기록 삭제와 `AuditLog` 감사 이력
- 홈 화면 설치용 PWA 매니페스트
- 접근 키로 보호되는 Google Apps Script API

## Google Sheets 구조

`setup()`을 처음 실행하면 다음 시트와 머리글이 자동 생성됩니다.

### Customers

| 열 | 설명 |
|---|---|
| customer_id | 자동 생성 고객 ID |
| name | 고객명 |
| phone | 전화번호 |
| memo | 고객 메모 |
| created_at | 서울 기준 등록시각 `YYYY-MM-DD HH:mm:ss` |

### Transactions

| 열 | 설명 |
|---|---|
| transaction_id | 자동 생성 거래 ID |
| customer_id | Customers의 고객 ID |
| type | `credit`(외상) 또는 `payment`(입금) |
| amount | 금액(양수) |
| date | 거래일 `YYYY-MM-DD` |
| memo | 거래 메모 |
| created_at | 서울 기준 기록시각 `YYYY-MM-DD HH:mm:ss` |

현재 잔액은 `외상 합계 - 입금 합계`로 API가 매번 계산합니다. 원본 거래 행을 남기므로 수정 이력을 추적하기 쉽습니다.

### CylinderRentals

| 열 | 설명 |
|---|---|
| rental_id | 자동 생성 대여·반납 ID |
| customer_id | Customers의 고객 ID |
| type | `rental`(대여) 또는 `return`(반납) |
| quantity | 가스통 수량(양수) |
| cylinder_type | 가스통 규격(예: LPG 20kg) |
| date | 대여·반납일 `YYYY-MM-DD` |
| memo | 용기 번호 또는 참고사항 |
| created_at | 서울 기준 기록시각 `YYYY-MM-DD HH:mm:ss` |

현재 대여 수량은 `대여 합계 - 반납 합계`로 계산합니다. 고객 상세 화면에서 가스통 대여와 반납을 기록할 수 있으며, 해당 규격의 대여 수량보다 많은 반납은 저장되지 않습니다.

### AuditLog

외상·입금과 가스통 대여·반납 기록을 입력하거나 삭제하면 `AuditLog` 시트에 작업 종류, 원본 ID, 고객 ID, 당시 데이터가 함께 기록됩니다. 실제 기록을 삭제해도 삭제 당시 내용은 감사 이력에 남습니다.

## Google Apps Script 배포

1. 새 Google 스프레드시트를 만들고 `확장 프로그램 → Apps Script`를 엽니다.
2. `apps-script/Code.gs`의 내용을 기본 코드 파일에 붙여 넣습니다.
3. 프로젝트 설정에서 표준 시간대를 `Asia/Seoul`로 맞춥니다.
4. 함수 목록에서 `setup`을 선택하고 한 번 실행한 뒤 권한을 승인합니다.
5. 실행 로그에 표시된 `외상노트 접근 키`를 안전한 곳에 복사합니다. 키를 잃으면 `setup`을 다시 실행해 새 키를 만들 수 있습니다.
6. `배포 → 새 배포 → 웹 앱`을 선택합니다. 실행 사용자는 `나`, 액세스 권한은 정적 웹앱에서 호출할 수 있는 범위로 설정하고 배포합니다.
7. 배포된 `/exec` URL을 복사합니다.
8. 외상노트 오른쪽 위 설정 버튼에서 URL과 접근 키를 입력합니다.

기존에 Apps Script를 배포해 사용 중이라면 변경된 `Code.gs`를 붙여 넣고 `setupSheets()`를 한 번 실행해 `CylinderRentals`와 `AuditLog` 시트를 만든 다음, 기존 웹 앱 배포를 반드시 새 버전으로 업데이트해야 합니다. 접근 키는 그대로 유지됩니다.

기존 행의 `created_at` 값까지 서울 시간 `YYYY-MM-DD HH:mm:ss`로 바꾸려면 Apps Script 함수 목록에서 `normalizeCreatedAtDates`를 선택해 한 번 실행합니다. 이후 새로 저장되는 모든 고객, 외상·입금, 가스통 대여·반납 및 감사 기록은 자동으로 서울 기준 시각이 저장됩니다. 이미 날짜만 남아 있어 원래 시각을 알 수 없는 값에는 `00:00:00`이 붙습니다.

중요: Apps Script 웹 앱 자체는 인터넷에서 호출 가능하므로 긴 접근 키를 반드시 사용하고 공유하지 마세요. 접근 키는 시트에 저장되지 않으며 현재 브라우저 기기에만 저장됩니다. 고객 개인정보가 민감하거나 여러 직원의 개별 권한·접속 차단·감사 로그가 필요하면 Google 로그인 기반 서버 또는 Supabase 같은 인증형 백엔드로 전환하는 것이 좋습니다.

## 프론트엔드 실행

Node.js 22 이상이 필요합니다.

```bash
npm install
npm run dev
```

배포용 정적 파일은 다음 명령으로 `dist` 폴더에 생성됩니다.

```bash
npm run build
```

## GitHub Pages 배포

프로젝트에는 `.github/workflows/deploy-pages.yml`이 포함되어 있습니다. 저장소의 `main` 브랜치에 올리면 GitHub Actions가 자동으로 설치, 빌드, 배포합니다.

1. GitHub에서 빈 저장소를 만듭니다. 예: `credit-ledger`.
2. 이 폴더의 파일 전체를 저장소 `main` 브랜치에 올립니다. `node_modules`와 `dist`는 올리지 않습니다.
3. GitHub 저장소에서 `Settings → Pages`로 이동합니다.
4. `Build and deployment → Source`를 `GitHub Actions`로 선택합니다.
5. 저장소의 `Actions` 탭에서 `Deploy to GitHub Pages` 작업이 성공했는지 확인합니다.
6. 완료 후 표시되는 `https://사용자명.github.io/저장소명/` 주소로 접속합니다.

프로젝트 사이트와 사용자 사이트 모두에서 동작하도록 Vite의 자산 경로, PWA 시작 주소, 아이콘 경로를 상대 경로로 설정했습니다. 별도의 저장소 이름 수정은 필요하지 않습니다.

이후 수정 사항을 `main`에 push하면 같은 작업이 자동으로 재배포합니다. 앱을 연 뒤 모바일 브라우저 메뉴의 `홈 화면에 추가`를 사용하면 PWA처럼 실행됩니다.

```bash
git add .
git commit -m "외상노트 업데이트"
git push origin main
```

## 데이터 보호 권장사항

- 스프레드시트를 공개 링크로 공유하지 않습니다.
- 접근 키를 메신저나 공개 문서에 남기지 않습니다.
- Apps Script 배포 소유 계정에 2단계 인증을 켭니다.
- 정기적으로 시트 사본을 백업합니다.
- 직원이 퇴사하거나 기기를 분실하면 `setup()`을 다시 실행해 기존 키를 폐기합니다.

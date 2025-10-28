# ACN - 반려동물 케어 플랫폼

반려동물을 위한 종합 케어 플랫폼으로, 동물병원 찾기, 사료/간식/용품 구매, 펫보험 정보 등을 제공합니다.

## 🚀 주요 기능

- **동물병원 찾기**: 지역별, 이름별 동물병원 검색
- **사료/간식/용품**: 다양한 반려동물 상품 API 연동
- **펫보험**: 보험 상품 정보 제공
- **반응형 디자인**: 모바일/데스크톱 최적화

## 📁 프로젝트 구조

```
acn/
├── public/                 # 정적 파일들
│   ├── index.html         # 메인 페이지
│   ├── hospital.html      # 동물병원 찾기
│   ├── products.html      # 사료/간식/용품 (새로 추가)
│   ├── insurance.html     # 펫보험
│   ├── hospitals.csv      # 병원 데이터
│   └── include.js         # 공통 스크립트
├── src/
│   └── server.js          # API 서버 (새로 추가)
├── package.json           # 의존성 관리
└── README.md             # 프로젝트 설명
```

## 🛠 설치 및 실행

### 방법 1: 간단한 실행 (Node.js 설치 불필요)

브라우저에서 `public/index.html` 파일을 직접 열어서 실행하세요.

```bash
# 파일 탐색기에서 public 폴더의 index.html을 더블클릭하거나
# 브라우저에서 파일을 드래그 앤 드롭
```

### 방법 2: API 서버와 함께 실행 (Node.js 필요)

#### 1. Node.js 설치
- [Node.js 공식 사이트](https://nodejs.org/)에서 LTS 버전 다운로드 및 설치

#### 2. 의존성 설치
```bash
cd acn
npm install
```

#### 3. API 서버 실행
```bash
# 개발 모드 (자동 재시작)
npm run dev

# 또는 일반 실행
npm start
```

서버가 `http://localhost:3000`에서 실행됩니다.

#### 4. 웹 페이지 접속
브라우저에서 `public/index.html`을 열거나, 로컬 서버를 사용하여 접속하세요.

## 📡 API 엔드포인트

### 상품 관련 API

- `GET /api/products` - 모든 상품 조회
- `GET /api/products/:id` - 특정 상품 조회
- `GET /api/products/category/:category` - 카테고리별 상품 조회
- `GET /api/products/search/:query` - 상품 검색
- `GET /api/brands` - 브랜드 목록
- `GET /api/products/price-range?min=10000&max=50000` - 가격대별 상품 조회

### 쿼리 파라미터

- `category`: food, treats, supplies
- `search`: 검색어
- `sort`: name, price-low, price-high, rating
- `limit`: 페이지당 아이템 수 (기본값: 20)
- `page`: 페이지 번호 (기본값: 1)

## 🎨 사용된 기술

### 프론트엔드
- **HTML5**: 시맨틱 마크업
- **Tailwind CSS**: 반응형 스타일링
- **JavaScript**: 동적 기능 구현
- **Papa Parse**: CSV 파일 파싱

### 백엔드
- **Node.js**: 서버 환경
- **Express.js**: 웹 프레임워크
- **CORS**: 크로스 오리진 요청 처리

## 🔧 개발 환경 설정

### 필요한 소프트웨어
- Node.js (v14 이상)
- npm 또는 yarn

### 개발 도구
- `nodemon`: 개발 중 자동 서버 재시작
- 브라우저 개발자 도구: 디버깅 및 테스트

## 📱 반응형 디자인

- **모바일**: 320px ~ 768px
- **태블릿**: 768px ~ 1024px  
- **데스크톱**: 1024px 이상

## 🚀 배포 가이드

### 1. 프로덕션 빌드
```bash
npm run build  # (향후 빌드 스크립트 추가 예정)
```

### 2. 환경 변수 설정
```bash
NODE_ENV=production
PORT=3000
```

### 3. 서버 배포
- Heroku, AWS, Google Cloud 등 클라우드 플랫폼 사용
- 또는 VPS/전용 서버에 직접 배포

## 🤝 기여하기

1. 이 저장소를 포크합니다
2. 새로운 기능 브랜치를 생성합니다 (`git checkout -b feature/새기능`)
3. 변경사항을 커밋합니다 (`git commit -am '새 기능 추가'`)
4. 브랜치에 푸시합니다 (`git push origin feature/새기능`)
5. Pull Request를 생성합니다

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 있습니다.

## 📞 문의

프로젝트에 대한 문의사항이 있으시면 이슈를 생성해 주세요.

---

**ACN Team** - 반려동물과 함께하는 행복한 세상을 만들어갑니다 🐕🐱

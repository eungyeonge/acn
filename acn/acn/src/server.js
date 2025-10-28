// src/server.js
const express = require("express");
const cors = require("cors");
const path = require("path");
const compression = require("compression");
const helmet = require("helmet");
// 맨 위 다른 require 아래에 추가
const products = require("./data/products");
const filtered = Array.isArray(items?.data) ? items.data : (items?.records || []);



const app = express();

/* 1) Render/클라우드 환경의 포트 사용 */
const port = process.env.PORT || 3000;

/* 2) 프록시 허용 (HTTPS 뒤일 수 있음) */
app.set("trust proxy", true);

/* 3) 보안/성능 설정 */
app.use(
  helmet({
    contentSecurityPolicy: false, // HTML/CSS/JS 로딩 깨짐 방지
  })
);
app.use(compression());

/* 4) CORS 설정 */
app.use(
  cors({
    origin: "*", // 필요시 특정 도메인만 허용
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  })
);

/* 5) JSON 파싱 */
app.use(express.json());

/* 6) 정적 파일 서빙 */
const publicPath = path.join(__dirname, "..", "public");

app.use(express.static(publicPath, {
  etag: true,
  maxAge: "7d",
  setHeaders: (res, filePath) => {
    // HTML 파일은 캐시 금지 (header.html, index.html 등)
    if (filePath.endsWith(".html")) {
      res.setHeader("Cache-Control", "no-store, max-age=0");
    }
  }
}));


/* 7) 헬스 체크 (Render에서 상태확인용) */
app.get("/health", (_req, res) => res.status(200).json({ ok: true }));



/* 유기동물 보호 현황 프록시 */
// ⭐ server.js의 기존 /api/abandoned-animals 라우트 통째로 교체
app.get("/api/abandoned-animals", async (req, res) => {
  try {
    const page = Number(req.query.page || 1);
    const size = Number(req.query.size || 12);

    // Render 대시보드 > Environment 에 ACN_ABANDONED_API_KEY 등록 권장
    const apiKey = process.env.ACN_ABANDONED_API_KEY || "3f8e0f840aa246f795508b324d420499";

    // 공공데이터 포털 정식 엔드포인트
    const url = new URL("https://apis.data.go.kr/1543061/abandonmentPublicSrvc/abandonmentPublic");
    url.searchParams.set("serviceKey", apiKey);
    url.searchParams.set("_type", "json");
    url.searchParams.set("pageNo", String(page));
    url.searchParams.set("numOfRows", String(size));
    // 필요 시 지역 필터: url.searchParams.set("upr_cd", "6110000"); url.searchParams.set("org_cd", "...");

    const resp = await fetch(url);
    if (!resp.ok) {
      return res.status(502).json({ success: false, message: "Upstream API error" });
    }
    const json = await resp.json();

    const body = json?.response?.body || {};
    const items = body?.items?.item || [];         // ← 실제 데이터 배열
    const totalCount = body?.totalCount || 0;

    // 프론트 render()가 기대하는 형태: { data: [...] }
    res.json({
      success: true,
      data: {
        data: Array.isArray(items) ? items : (items ? [items] : []), // 단건도 배열화
        totalCount,
        page,
        size
      }
    });
  } catch (e) {
    console.error("❌ abandoned-animals proxy error:", e);
    res.status(500).json({ success: false, message: "유기동물 데이터를 불러올 수 없습니다." });
  }
});


/* 모든 상품 조회 */
app.get("/api/products", (req, res) => {
  const { category, search, sort, limit = 20, page = 1 } = req.query;
  let filtered = [...products];

  if (category) filtered = filtered.filter((p) => p.category === category);

  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
    );
  }

  if (sort) {
    const methods = {
      name: (a, b) => a.name.localeCompare(b.name),
      "price-low": (a, b) => a.price - b.price,
      "price-high": (a, b) => b.price - a.price,
      rating: (a, b) => b.rating - a.rating,
    };
    if (methods[sort]) filtered.sort(methods[sort]);
  }

  const lim = parseInt(limit);
  const pg = parseInt(page);
  const start = (pg - 1) * lim;
  const data = filtered.slice(start, start + lim);

  res.json({
    success: true,
    data,
    pagination: {
      currentPage: pg,
      totalPages: Math.ceil(filtered.length / lim),
      totalItems: filtered.length,
      itemsPerPage: lim,
    },
  });
});

/* 특정 상품 조회 */
app.get("/api/products/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const product = products.find((p) => p.id === id);
  if (!product)
    return res.status(404).json({
      success: false,
      message: "상품을 찾을 수 없습니다.",
    });
  res.json({ success: true, data: product });
});

/* 카테고리별 상품 조회 */
app.get("/api/products/category/:category", (req, res) => {
  const { category } = req.params;
  res.json({
    success: true,
    data: products.filter((p) => p.category === category),
    category,
  });
});

/* 검색 */
app.get("/api/products/search/:query", (req, res) => {
  const q = req.params.query.toLowerCase();
  const data = products.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q)
  );
  res.json({ success: true, data, query: q, count: data.length });
});

/* 브랜드 목록 */
app.get("/api/brands", (_req, res) => {
  const brands = [...new Set(products.map((p) => p.brand))];
  res.json({ success: true, data: brands });
});

/* 가격대 상품 조회 */
app.get("/api/products/price-range", (req, res) => {
  const min = parseInt(req.query.min);
  const max = parseInt(req.query.max);
  if (isNaN(min) || isNaN(max)) {
    return res.status(400).json({
      success: false,
      message: "최소값과 최대값을 모두 입력해주세요.",
    });
  }
  const data = products.filter((p) => p.price >= min && p.price <= max);
  res.json({ success: true, data, priceRange: { min, max } });
});

/* SPA 라우팅 (index.html 반환) */
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  res.sendFile(path.join(publicPath, "index.html"), (err) => {
    if (err) next();
  });
});

/* 에러 핸들러 */
app.use((err, _req, res, _next) => {
  console.error("❌ 서버 에러:", err);
  res.status(500).json({ success: false, message: "서버 오류 발생" });
});

/* 서버 시작 */
app.listen(port, "0.0.0.0", () => {
  console.log(`✅ 서버 실행 중! 포트: ${port}`);
});

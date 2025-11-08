// src/server.js
const express = require("express");
const cors = require("cors");
const path = require("path");
const compression = require("compression");
const helmet = require("helmet");
// 맨 위 다른 require 아래에 추가
const products = require("./data/products");



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

/* ChatGPT API 프록시 */
app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: "메시지를 입력해주세요." });
    }

    // OpenAI API 키 (환경 변수에서 가져오기)
    const openaiApiKey = process.env.OPENAI_API_KEY || "";
    
    // API 키가 없거나 테스트 환경에서는 기본 응답 반환
    if (!openaiApiKey) {
      return res.json({
        success: true,
        reply: getDefaultResponse(message)
      });
    }

    // OpenAI API 호출
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "당신은 ACN(Animal Care Net) 반려동물 케어 플랫폼의 고객센터 상담원입니다. 친절하고 전문적으로 반려동물 관련 질문에 답변해주세요. 사료, 간식, 용품, 동물병원, 펫보험, 유기동물 등에 대한 정보를 제공할 수 있습니다."
          },
          {
            role: "user",
            content: message
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("OpenAI API error:", errorData);
      return res.json({
        success: true,
        reply: getDefaultResponse(message)
      });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "죄송합니다. 답변을 생성할 수 없습니다.";

    res.json({
      success: true,
      reply
    });
  } catch (e) {
    console.error("❌ ChatGPT API proxy error:", e);
    res.json({
      success: true,
      reply: getDefaultResponse(req.body.message || "")
    });
  }
});

// 기본 응답 (API 키가 없을 때 사용)
function getDefaultResponse(message) {
  const lowerMessage = message.toLowerCase();
  
  // 예방접종 관련
  if (lowerMessage.includes("예방접종") || lowerMessage.includes("접종") || lowerMessage.includes("백신")) {
    if (lowerMessage.includes("강아지") || lowerMessage.includes("개")) {
      return "강아지 예방접종 정보입니다! 💉\n\n**필수 예방접종:**\n• 종합백신(DHPPL): 6~8주부터 시작, 3~4주 간격으로 3회\n• 코로나바이러스: 6~8주부터 시작\n• 켄넬코프(기관지염): 6~8주부터 시작\n• 광견병: 3개월 이상, 1년마다 접종\n\n**권장 예방접종:**\n• 인플루엔자: 매년 접종\n• 레프토스피라: 지역에 따라 필요\n\n접종 일정은 마이페이지의 '예방접종 캘린더'에서 관리하실 수 있습니다!";
    } else if (lowerMessage.includes("고양이") || lowerMessage.includes("고양")) {
      return "고양이 예방접종 정보입니다! 💉\n\n**필수 예방접종:**\n• 3종 혼합백신(FVRCP): 6~8주부터 시작, 3~4주 간격으로 2~3회\n  - 범백혈구감소증(팬루코페니아)\n  - 바이러스성 비기관지염(헤르페스)\n  - 칼리시바이러스\n• 광견병: 3개월 이상, 1~3년마다 접종\n\n**권장 예방접종:**\n• 백혈병(FeLV): 실외 고양이, 다묘 가정\n• 클라미디아: 다묘 가정\n\n접종 일정은 마이페이지의 '예방접종 캘린더'에서 관리하실 수 있습니다!";
    } else {
      return "예방접종에 대해 물어보셨네요! 💉\n\n**강아지 필수 접종:** 종합백신(DHPPL), 코로나바이러스, 광견병\n**고양이 필수 접종:** 3종 혼합백신(FVRCP), 광견병\n\n구체적인 접종 일정은 반려동물의 나이와 종류에 따라 다릅니다. 동물병원에서 상담받으시거나 마이페이지의 '예방접종 캘린더'를 이용해보세요!";
    }
  }
  // 홈페이지 관련 질문
  else if (lowerMessage.includes("사료") || lowerMessage.includes("먹이")) {
    return "사료 관련 문의사항이시군요! ACN에서는 다양한 프리미엄 사료를 제공하고 있습니다. 상품 페이지에서 카테고리를 선택하시면 원하시는 사료를 찾으실 수 있습니다. 추가로 궁금한 점이 있으시면 언제든 말씀해주세요! 🐕";
  } else if (lowerMessage.includes("간식")) {
    return "간식에 대해 물어보셨네요! 우리 플랫폼에서는 건강한 천연 간식부터 특별한 날을 위한 간식까지 다양한 제품을 만나보실 수 있습니다. 간식 카테고리를 확인해보세요! 🦴";
  } else if (lowerMessage.includes("병원") || lowerMessage.includes("의원")) {
    return "동물병원 찾기 서비스를 이용하시려면 상단 메뉴의 '동물병원조회'를 클릭해주세요. 지역명이나 병원 이름으로 검색하실 수 있습니다. 🏥";
  } else if (lowerMessage.includes("보험") || lowerMessage.includes("펫보험")) {
    return "펫보험에 관심이 있으시군요! 상단 메뉴의 '반려동물 보험'에서 다양한 보험 상품을 비교하고 가입하실 수 있습니다. 💳";
  } else if (lowerMessage.includes("유기동물") || lowerMessage.includes("유기")) {
    return "유기동물 보호 현황을 확인하시려면 상단 메뉴의 '유기동물 현황'을 클릭해주세요. 보호 중인 동물들의 정보를 확인하실 수 있습니다. 🐾";
  } else if (lowerMessage.includes("주문") || lowerMessage.includes("배송")) {
    return "주문 및 배송 관련 문의는 마이페이지의 주문 내역에서 확인하실 수 있습니다. 배송 문의는 주문 번호와 함께 고객센터로 연락주시면 빠르게 도와드리겠습니다! 📦";
  } else if (lowerMessage.includes("반품") || lowerMessage.includes("교환")) {
    return "반품/교환은 상품 수령 후 7일 이내에 가능합니다. 마이페이지에서 신청하시거나 고객센터로 연락주시면 안내해드리겠습니다. 🔄";
  }
  // 일반 반려동물 질문
  else if (lowerMessage.includes("강아지") || lowerMessage.includes("개")) {
    if (lowerMessage.includes("먹이") || lowerMessage.includes("사료") || lowerMessage.includes("식사")) {
      return "강아지 식사 관련 정보입니다! 🐕\n\n• 하루 식사 횟수: 성견은 1~2회, 강아지는 3~4회\n• 급여량: 체중의 2~3% 정도 (사료 종류에 따라 다름)\n• 식사 시간: 규칙적으로 같은 시간에 급여\n• 물: 항상 깨끗한 물을 충분히 제공\n\n고품질 사료를 선택하시려면 상품 페이지의 사료 카테고리를 확인해보세요!";
    } else if (lowerMessage.includes("산책") || lowerMessage.includes("운동")) {
      return "강아지 산책과 운동에 대해 물어보셨네요! 🐕\n\n• 산책 시간: 하루 2~3회, 총 30분~2시간 (견종과 나이에 따라 다름)\n• 강아지: 짧은 산책부터 시작, 점진적으로 늘리기\n• 성견: 충분한 운동량 확보\n• 날씨: 너무 더운 날이나 추운 날에는 주의\n\n산책용 용품은 상품 페이지에서 확인하실 수 있습니다!";
    } else if (lowerMessage.includes("목욕") || lowerMessage.includes("샴푸")) {
      return "강아지 목욕 정보입니다! 🐕\n\n• 목욕 빈도: 보통 2~4주에 1회 (견종과 피부 상태에 따라 다름)\n• 강아지: 3개월 이후부터 시작\n• 샴푸: 강아지 전용 샴푸 사용\n• 물 온도: 미지근한 물 사용\n• 건조: 완전히 말려주기\n\n강아지 전용 샴푸와 용품은 상품 페이지에서 구매하실 수 있습니다!";
    } else {
      return "강아지에 대해 물어보셨네요! 🐕\n\n강아지 관련하여 사료, 간식, 용품, 예방접종, 건강 관리 등 다양한 정보를 제공하고 있습니다. 구체적으로 어떤 것이 궁금하신가요? (예: 식사, 산책, 목욕, 예방접종 등)";
    }
  } else if (lowerMessage.includes("고양이") || lowerMessage.includes("고양")) {
    if (lowerMessage.includes("먹이") || lowerMessage.includes("사료") || lowerMessage.includes("식사")) {
      return "고양이 식사 관련 정보입니다! 🐱\n\n• 하루 식사 횟수: 성묘는 2~3회, 새끼고양이는 4~6회\n• 급여량: 체중의 2~3% 정도\n• 식사 시간: 규칙적으로 같은 시간에 급여\n• 물: 항상 깨끗한 물을 충분히 제공 (자동 급수기 권장)\n• 습식 사료: 수분 섭취에 도움\n\n고품질 사료를 선택하시려면 상품 페이지의 사료 카테고리를 확인해보세요!";
    } else if (lowerMessage.includes("화장실") || lowerMessage.includes("배변") || lowerMessage.includes("모래")) {
      return "고양이 화장실 관리 정보입니다! 🐱\n\n• 화장실 개수: 고양이 수 + 1개\n• 모래 깊이: 5~7cm 정도\n• 청소: 하루 1~2회 배변물 제거, 주 1회 전체 교체\n• 위치: 조용하고 사적인 공간\n• 모래 종류: 벤토나이트, 두부모래, 목재 등\n\n배변패드와 모래는 상품 페이지에서 구매하실 수 있습니다!";
    } else if (lowerMessage.includes("목욕") || lowerMessage.includes("샴푸")) {
      return "고양이 목욕 정보입니다! 🐱\n\n• 목욕 빈도: 보통 필요 없음 (고양이는 스스로 청소)\n• 목욕이 필요한 경우: 피부 질환, 오염 등\n• 고양이 전용 샴푸 사용\n• 물 온도: 미지근한 물\n• 건조: 완전히 말려주기\n• 스트레스 최소화\n\n고양이 전용 샴푸는 상품 페이지에서 구매하실 수 있습니다!";
    } else {
      return "고양이에 대해 물어보셨네요! 🐱\n\n고양이 관련하여 사료, 간식, 용품, 예방접종, 건강 관리 등 다양한 정보를 제공하고 있습니다. 구체적으로 어떤 것이 궁금하신가요? (예: 식사, 화장실, 목욕, 예방접종 등)";
    }
  } else if (lowerMessage.includes("건강") || lowerMessage.includes("질병") || lowerMessage.includes("병")) {
    return "반려동물 건강에 대해 물어보셨네요! 🏥\n\n• 정기 검진: 1년에 1~2회 권장\n• 예방접종: 정기적으로 접종\n• 구충제: 정기적으로 투여\n• 이상 징후 발견 시 즉시 병원 방문\n\n건강 관련 문의는 동물병원에서 전문적인 상담을 받으시는 것을 권장합니다. 동물병원 찾기는 상단 메뉴의 '동물병원조회'를 이용해보세요!";
  } else if (lowerMessage.includes("훈련") || lowerMessage.includes("교육")) {
    return "반려동물 훈련에 대해 물어보셨네요! 🎓\n\n• 강아지: 기본 명령어(앉아, 기다려, 와 등)부터 시작\n• 긍정적 강화: 간식과 칭찬 활용\n• 일관성: 같은 명령어와 규칙 유지\n• 짧은 시간: 10~15분씩 자주 반복\n• 전문가 도움: 필요시 훈련사 상담\n\n훈련용 간식은 상품 페이지에서 구매하실 수 있습니다!";
  } else {
    return "안녕하세요! ACN 고객센터입니다. 반려동물 관련하여 사료, 간식, 용품, 동물병원, 펫보험, 유기동물, 예방접종 등 다양한 정보를 제공하고 있습니다. 구체적으로 어떤 도움이 필요하신가요? 😊\n\n예: 예방접종, 강아지 식사, 고양이 화장실, 건강 관리 등";
  }
}

/* 쿠팡 상품 조회 프록시 */
app.get("/api/coupang-products", async (req, res) => {
  try {
    const { page = 1, limit = 50, category, sellerProductId } = req.query;
    
    // 쿠팡 API 인증 정보 (환경 변수에서 가져오기)
    const coupangApiKey = process.env.COUPANG_API_KEY || "";
    const coupangSecretKey = process.env.COUPANG_SECRET_KEY || "";
    const coupangAccessToken = process.env.COUPANG_ACCESS_TOKEN || "";

    // 단일 상품 조회
    if (sellerProductId) {
      const url = `https://api-gateway.coupang.com/v2/providers/seller_api/apis/api/v1/marketplace/seller-products/${sellerProductId}`;
      const headers = {
        "Authorization": `Bearer ${coupangAccessToken}`,
        "X-Requested-By": coupangApiKey,
        "Content-Type": "application/json"
      };

      const resp = await fetch(url, { headers });
      if (!resp.ok) {
        return res.status(502).json({ success: false, message: "쿠팡 API 오류" });
      }
      const data = await resp.json();
      return res.json({ success: true, data });
    }

    // 상품 목록 조회 (펫 상품 필터링)
    // 쿠팡 API는 펫 상품 카테고리 코드를 사용 (예: 50000008 - 반려동물용품)
    const url = new URL("https://api-gateway.coupang.com/v2/providers/seller_api/apis/api/v1/marketplace/seller-products");
    url.searchParams.set("page", String(page));
    url.searchParams.set("limit", String(limit));
    
    // 펫 관련 카테고리 필터 (쿠팡 카테고리 코드)
    if (category) {
      // category 매핑: food -> 사료, treats -> 간식, supplies -> 용품
      const categoryMap = {
        food: "50000008", // 반려동물용품 > 사료
        treats: "50000008", // 반려동물용품 > 간식
        supplies: "50000008" // 반려동물용품 > 용품
      };
      url.searchParams.set("categoryId", categoryMap[category] || "50000008");
    }

    const headers = {
      "Authorization": `Bearer ${coupangAccessToken}`,
      "X-Requested-By": coupangApiKey,
      "Content-Type": "application/json"
    };

    const resp = await fetch(url, { headers });
    if (!resp.ok) {
      // API 실패 시 샘플 데이터 반환 (개발용)
      console.warn("쿠팡 API 호출 실패, 샘플 데이터 반환");
      return res.json({ 
        success: true, 
        data: getSampleCoupangProducts(category),
        isSample: true 
      });
    }

    const json = await resp.json();
    // 쿠팡 API 응답 구조에 맞게 변환
    const items = json?.data?.content || json?.data || [];
    
    res.json({
      success: true,
      data: items.map(item => ({
        id: item.sellerProductId || item.productId,
        name: item.productName || item.name,
        price: item.salePrice || item.price,
        image: item.productImage || item.imageUrl,
        link: item.productUrl || item.coupangUrl || `https://www.coupang.com/vp/products/${item.productId}`,
        brand: item.brandName || item.brand,
        category: category || "supplies",
        rating: item.rating || 4.5,
        description: item.productDescription || item.description || ""
      })),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: json?.data?.totalElements || items.length
      }
    });
  } catch (e) {
    console.error("❌ coupang-products proxy error:", e);
    // 에러 발생 시 샘플 데이터 반환
    res.json({ 
      success: true, 
      data: getSampleCoupangProducts(req.query.category),
      isSample: true 
    });
  }
});

// 쿠팡 샘플 데이터 (API 실패 시 사용)
function getSampleCoupangProducts(category) {
  const samples = {
    food: [
      { id: "coupang-1", name: "로얄캐닌 미니 어덜트 건식사료 3.5kg", price: 45000, image: "https://images.unsplash.com/photo-1629904853716-f0bc54eea481?auto=format&fit=crop&w=400&q=80", link: "https://www.coupang.com", brand: "로얄캐닌", category: "food", rating: 4.7, description: "영양 균형이 완벽한 프리미엄 사료" },
      { id: "coupang-2", name: "오리젠 어덜트 독 2kg", price: 52000, image: "https://images.unsplash.com/photo-1558788353-f76d92427f16?auto=format&fit=crop&w=400&q=80", link: "https://www.coupang.com", brand: "오리젠", category: "food", rating: 4.8, description: "천연 원료로 만든 고품질 사료" },
      { id: "coupang-3", name: "프로플랜 포스틱스 퍼피 3kg", price: 38000, image: "https://images.unsplash.com/photo-1601758123927-19600d34e252?auto=format&fit=crop&w=400&q=80", link: "https://www.coupang.com", brand: "Purina", category: "food", rating: 4.6, description: "강아지를 위한 완벽한 성장 사료" },
      { id: "coupang-4", name: "아카나 그랜스프리 독 6.8kg", price: 89000, image: "https://images.unsplash.com/photo-1629904853716-f0bc54eea481?auto=format&fit=crop&w=400&q=80", link: "https://www.coupang.com", brand: "아카나", category: "food", rating: 4.9, description: "곡물 없는 프리미엄 사료" },
      { id: "coupang-5", name: "힐스 사이언스 다이어트 어덜트 12kg", price: 125000, image: "https://images.unsplash.com/photo-1558788353-f76d92427f16?auto=format&fit=crop&w=400&q=80", link: "https://www.coupang.com", brand: "힐스", category: "food", rating: 4.7, description: "수의사 추천 건강 사료" },
      { id: "coupang-6", name: "내추럴발란스 리미티드 재료 사료 4.5kg", price: 68000, image: "https://images.unsplash.com/photo-1601758123927-19600d34e252?auto=format&fit=crop&w=400&q=80", link: "https://www.coupang.com", brand: "내추럴발란스", category: "food", rating: 4.5, description: "천연 재료만 사용한 건강 사료" },
      { id: "coupang-7", name: "웰니스 코어 어덜트 독 4.5kg", price: 55000, image: "https://images.unsplash.com/photo-1629904853716-f0bc54eea481?auto=format&fit=crop&w=400&q=80", link: "https://www.coupang.com", brand: "웰니스", category: "food", rating: 4.6, description: "균형잡힌 영양소 함유" },
      { id: "coupang-8", name: "NOW 프레시 어덜트 독 5.4kg", price: 72000, image: "https://images.unsplash.com/photo-1558788353-f76d92427f16?auto=format&fit=crop&w=400&q=80", link: "https://www.coupang.com", brand: "NOW", category: "food", rating: 4.8, description: "곡물 없는 프리미엄 사료" },
      { id: "coupang-9", name: "퍼피 쵸이스 퍼피 독 5kg", price: 42000, image: "https://images.unsplash.com/photo-1601758123927-19600d34e252?auto=format&fit=crop&w=400&q=80", link: "https://www.coupang.com", brand: "퍼피 쵸이스", category: "food", rating: 4.4, description: "퍼피용 고단백 사료" },
      { id: "coupang-10", name: "블루 버팔로 와일드 독 4.5kg", price: 78000, image: "https://images.unsplash.com/photo-1629904853716-f0bc54eea481?auto=format&fit=crop&w=400&q=80", link: "https://www.coupang.com", brand: "블루 버팔로", category: "food", rating: 4.7, description: "야생 동물 먹이 모방 사료" }
    ],
    treats: [
      { id: "coupang-11", name: "그린이즈 육포 100g", price: 12000, image: "https://images.unsplash.com/photo-1619983081563-4301e2903c2f?auto=format&fit=crop&w=400&q=80", link: "https://www.coupang.com", brand: "그린이즈", category: "treats", rating: 4.5, description: "순 닭고기로 만든 건강 간식" },
      { id: "coupang-12", name: "바우와우 소프트바 200g", price: 15000, image: "https://images.unsplash.com/photo-1629904853716-f0bc54eea481?auto=format&fit=crop&w=400&q=80", link: "https://www.coupang.com", brand: "바우와우", category: "treats", rating: 4.6, description: "부드러운 식감의 건강 간식" },
      { id: "coupang-13", name: "닥터독 치약 간식 70g", price: 18000, image: "https://images.unsplash.com/photo-1619983081563-4301e2903c2f?auto=format&fit=crop&w=400&q=80", link: "https://www.coupang.com", brand: "닥터독", category: "treats", rating: 4.7, description: "구강 건강 케어 간식" },
      { id: "coupang-14", name: "자연은 작은별 치킨 큐브 200g", price: 14000, image: "https://images.unsplash.com/photo-1629904853716-f0bc54eea481?auto=format&fit=crop&w=400&q=80", link: "https://www.coupang.com", brand: "자연은", category: "treats", rating: 4.5, description: "순수 닭고기 큐브 간식" },
      { id: "coupang-15", name: "로얄캐닌 덴탈 케어 스틱 420g", price: 22000, image: "https://images.unsplash.com/photo-1619983081563-4301e2903c2f?auto=format&fit=crop&w=400&q=80", link: "https://www.coupang.com", brand: "로얄캐닌", category: "treats", rating: 4.8, description: "치아 건강 케어 간식" },
      { id: "coupang-16", name: "비타민스낵 연어 150g", price: 16000, image: "https://images.unsplash.com/photo-1629904853716-f0bc54eea481?auto=format&fit=crop&w=400&q=80", link: "https://www.coupang.com", brand: "비타민스낵", category: "treats", rating: 4.4, description: "오메가3 풍부한 연어 간식" },
      { id: "coupang-17", name: "펫키즈 양고기 스틱 180g", price: 19000, image: "https://images.unsplash.com/photo-1619983081563-4301e2903c2f?auto=format&fit=crop&w=400&q=80", link: "https://www.coupang.com", brand: "펫키즈", category: "treats", rating: 4.6, description: "고단백 양고기 스틱" },
      { id: "coupang-18", name: "더리얼 강아지 쿠키 250g", price: 13000, image: "https://images.unsplash.com/photo-1629904853716-f0bc54eea481?auto=format&fit=crop&w=400&q=80", link: "https://www.coupang.com", brand: "더리얼", category: "treats", rating: 4.5, description: "자연 원료 쿠키 간식" },
      { id: "coupang-19", name: "지우프리 오리발목 5개", price: 21000, image: "https://images.unsplash.com/photo-1619983081563-4301e2903c2f?auto=format&fit=crop&w=400&q=80", link: "https://www.coupang.com", brand: "지우프리", category: "treats", rating: 4.7, description: "천연 오리발목 저작 간식" },
      { id: "coupang-20", name: "피부&모발 케어 간식 300g", price: 17000, image: "https://images.unsplash.com/photo-1629904853716-f0bc54eea481?auto=format&fit=crop&w=400&q=80", link: "https://www.coupang.com", brand: "헬씨펫", category: "treats", rating: 4.6, description: "피부 건강 케어 간식" }
    ],
    supplies: [
      { id: "coupang-21", name: "LED 발광 목걸이", price: 15000, image: "https://images.unsplash.com/photo-1558788353-f76d92427f16?auto=format&fit=crop&w=400&q=80", link: "https://www.coupang.com", brand: "펫라이트", category: "supplies", rating: 4.3, description: "야간 산책용 LED 목걸이" },
      { id: "coupang-22", name: "스마트 피이드 자동급식기 2.5L", price: 75000, image: "https://images.unsplash.com/photo-1619983081563-4301e2903c2f?auto=format&fit=crop&w=400&q=80", link: "https://www.coupang.com", brand: "펫슬림", category: "supplies", rating: 4.7, description: "자동으로 사료를 제공하는 스마트 급식기" },
      { id: "coupang-23", name: "튼튼한 강아지 장난감 세트", price: 18000, image: "https://images.unsplash.com/photo-1601758123927-19600d34e252?auto=format&fit=crop&w=400&q=80", link: "https://www.coupang.com", brand: "퓨리펫", category: "supplies", rating: 4.4, description: "견고한 고무 재질의 안전한 장난감" },
      { id: "coupang-24", name: "자동 급수기 2L", price: 25000, image: "https://images.unsplash.com/photo-1558788353-f76d92427f16?auto=format&fit=crop&w=400&q=80", link: "https://www.coupang.com", brand: "펫케어", category: "supplies", rating: 4.5, description: "항상 깨끗한 물을 공급하는 자동 급수기" },
      { id: "coupang-25", name: "강아지 침대 대형", price: 45000, image: "https://images.unsplash.com/photo-1619983081563-4301e2903c2f?auto=format&fit=crop&w=400&q=80", link: "https://www.coupang.com", brand: "코지펫", category: "supplies", rating: 4.6, description: "편안한 수면을 위한 프리미엄 침대" },
      { id: "coupang-26", name: "이동장 스타일 케이지", price: 95000, image: "https://images.unsplash.com/photo-1629904853716-f0bc54eea481?auto=format&fit=crop&w=400&q=80", link: "https://www.coupang.com", brand: "펫홈", category: "supplies", rating: 4.4, description: "넓은 공간의 이동장" },
      { id: "coupang-27", name: "강아지 옷 세트 (상하의)", price: 28000, image: "https://images.unsplash.com/photo-1601758123927-19600d34e252?auto=format&fit=crop&w=400&q=80", link: "https://www.coupang.com", brand: "펫스타일", category: "supplies", rating: 4.3, description: "따뜻하고 스타일리시한 강아지 옷" },
      { id: "coupang-28", name: "강아지 샴푸 500ml", price: 12000, image: "https://images.unsplash.com/photo-1558788353-f76d92427f16?auto=format&fit=crop&w=400&q=80", link: "https://www.coupang.com", brand: "네이처스", category: "supplies", rating: 4.5, description: "천연 원료 강아지 샴푸" },
      { id: "coupang-29", name: "강아지 배변패드 100매", price: 15000, image: "https://images.unsplash.com/photo-1619983081563-4301e2903c2f?auto=format&fit=crop&w=400&q=80", link: "https://www.coupang.com", brand: "클린펫", category: "supplies", rating: 4.6, description: "흡수력 좋은 배변패드" },
      { id: "coupang-30", name: "강아지 리드줄 세트", price: 22000, image: "https://images.unsplash.com/photo-1629904853716-f0bc54eea481?auto=format&fit=crop&w=400&q=80", link: "https://www.coupang.com", brand: "세이프워크", category: "supplies", rating: 4.7, description: "안전하고 튼튼한 리드줄 세트" }
    ]
  };
  
  // 카테고리별로 반환, 없으면 전체 반환
  if (category && samples[category]) {
    return samples[category];
  }
  // 전체 상품 반환 (모든 카테고리 합치기)
  return [...samples.food, ...samples.treats, ...samples.supplies];
}


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

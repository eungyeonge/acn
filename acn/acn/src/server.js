const express = require('express');
const cors = require('cors');
const app = express();
const port = 3000;

// CORS 설정
app.use(cors());
app.use(express.json());

// 정적 파일 서빙
const path = require('path');
const publicPath = path.join(__dirname, '../public');
app.use(express.static(publicPath));

// 샘플 상품 데이터 (실제 구현 시 데이터베이스에서 가져옴)
const products = [
  {
    id: 1,
    category: 'food',
    name: '로얄캐닌 어덜트 강아지 사료',
    price: 45000,
    rating: 4.5,
    image: 'https://images.unsplash.com/photo-1629904853716-f0bc54eea481?auto=format&fit=crop&w=400&q=80',
    description: '영양 균형이 완벽한 프리미엄 사료',
    brand: '로얄캐닌',
    weight: '3kg',
    ingredients: ['닭고기', '쌀', '옥수수', '비타민'],
    ageRange: '성견용',
    size: '모든 크기',
    coupangLink: 'https://link.coupang.com/a/AF0717094' // 실제 쿠팡 파트너스 링크로 교체 필요
  },
  {
    id: 2,
    category: 'food',
    name: '힐스 사이언스 다이어트',
    price: 38000,
    rating: 4.3,
    image: 'https://images.unsplash.com/photo-1601758123927-19600d34e252?auto=format&fit=crop&w=400&q=80',
    description: '수의사가 추천하는 건강 사료',
    brand: '힐스',
    weight: '2.5kg',
    ingredients: ['닭고기', '쌀', '보리', '비타민E'],
    ageRange: '성견용',
    size: '중형견용',
    coupangLink: 'https://link.coupang.com/a/AF0717094'
  },
  {
    id: 3,
    category: 'food',
    name: '오리젠 어덜트 독',
    price: 52000,
    rating: 4.7,
    image: 'https://images.unsplash.com/photo-1619983081563-4301e2903c2f?auto=format&fit=crop&w=400&q=80',
    description: '천연 원료로 만든 고품질 사료',
    brand: '오리젠',
    weight: '2kg',
    ingredients: ['닭고기', '연어', '감자', '과일'],
    ageRange: '성견용',
    size: '모든 크기',
    coupangLink: 'https://link.coupang.com/a/AF0717094'
  },
  {
    id: 4,
    category: 'treats',
    name: '그린이즈 치킨 간식',
    price: 12000,
    rating: 4.4,
    image: 'https://images.unsplash.com/photo-1558788353-f76d92427f16?auto=format&fit=crop&w=400&q=80',
    description: '순 닭고기로 만든 건강 간식',
    brand: '그린이즈',
    weight: '200g',
    ingredients: ['닭고기', '쌀', '비타민'],
    ageRange: '전연령',
    size: '소형견용',
    coupangLink: 'https://link.coupang.com/a/AF0717094'
  },
  {
    id: 5,
    category: 'treats',
    name: '닥터후드 치즈 스틱',
    price: 8500,
    rating: 4.2,
    image: 'https://images.unsplash.com/photo-1629904853716-f0bc54eea481?auto=format&fit=crop&w=400&q=80',
    description: '칼슘 풍부한 치즈 간식',
    brand: '닥터후드',
    weight: '150g',
    ingredients: ['치즈', '유청', '비타민D'],
    ageRange: '전연령',
    size: '모든 크기',
    coupangLink: 'https://link.coupang.com/a/AF0717094'
  },
  {
    id: 6,
    category: 'supplies',
    name: '코코넛 매트 개 쿠션',
    price: 25000,
    rating: 4.6,
    image: 'https://images.unsplash.com/photo-1601758123927-19600d34e252?auto=format&fit=crop&w=400&q=80',
    description: '통기성 좋은 천연 코코넛 매트',
    brand: '펫헤븐',
    size: 'L (80x60cm)',
    material: '코코넛 섬유',
    color: '자연색',
    coupangLink: 'https://link.coupang.com/a/AF0717094'
  },
  {
    id: 7,
    category: 'supplies',
    name: '스테인리스 급식기 세트',
    price: 18000,
    rating: 4.1,
    image: 'https://images.unsplash.com/photo-1619983081563-4301e2903c2f?auto=format&fit=crop&w=400&q=80',
    description: '위생적인 스테인리스 재질',
    brand: '펫스타',
    size: '중형용',
    material: '스테인리스',
    color: '실버',
    coupangLink: 'https://link.coupang.com/a/AF0717094'
  },
  {
    id: 8,
    category: 'supplies',
    name: 'LED 발광 목걸이',
    price: 15000,
    rating: 4.3,
    image: 'https://images.unsplash.com/photo-1558788353-f76d92427f16?auto=format&fit=crop&w=400&q=80',
    description: '야간 산책용 LED 목걸이',
    brand: '펫라이트',
    size: '조절가능',
    material: '플라스틱',
    color: '다색',
    coupangLink: 'https://link.coupang.com/a/AF0717094'
  },
  // 추가 상품들
  {
    id: 9,
    category: 'food',
    name: '네이처스 버라이어티 프리미엄',
    price: 42000,
    rating: 4.6,
    image: 'https://images.unsplash.com/photo-1629904853716-f0bc54eea481?auto=format&fit=crop&w=400&q=80',
    description: '자연산 원료로 만든 프리미엄 사료',
    brand: '네이처스',
    weight: '2.7kg',
    ingredients: ['연어', '고구마', '완두콩', '오메가3'],
    ageRange: '성견용',
    size: '대형견용',
    coupangLink: 'https://link.coupang.com/a/AF0717094'
  },
  {
    id: 10,
    category: 'treats',
    name: '비타민 강화 간식',
    price: 9500,
    rating: 4.5,
    image: 'https://images.unsplash.com/photo-1558788353-f76d92427f16?auto=format&fit=crop&w=400&q=80',
    description: '비타민이 풍부한 건강 간식',
    brand: '헬시펫',
    weight: '180g',
    ingredients: ['닭고기', '당근', '비타민A', '비타민C'],
    ageRange: '전연령',
    size: '소형견용',
    coupangLink: 'https://link.coupang.com/a/AF0717094'
  }
];

// API 엔드포인트들

// 모든 상품 조회
app.get('/api/products', (req, res) => {
  const { category, search, sort, limit = 20, page = 1 } = req.query;
  
  let filteredProducts = [...products];
  
  // 카테고리 필터링
  if (category) {
    filteredProducts = filteredProducts.filter(product => product.category === category);
  }
  
  // 검색 필터링
  if (search) {
    const searchTerm = search.toLowerCase();
    filteredProducts = filteredProducts.filter(product => 
      product.name.toLowerCase().includes(searchTerm) ||
      product.brand.toLowerCase().includes(searchTerm) ||
      product.description.toLowerCase().includes(searchTerm)
    );
  }
  
  // 정렬
  if (sort) {
    switch(sort) {
      case 'name':
        filteredProducts.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'price-low':
        filteredProducts.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        filteredProducts.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        filteredProducts.sort((a, b) => b.rating - a.rating);
        break;
    }
  }
  
  // 페이지네이션
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + parseInt(limit);
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);
  
  res.json({
    success: true,
    data: paginatedProducts,
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(filteredProducts.length / limit),
      totalItems: filteredProducts.length,
      itemsPerPage: parseInt(limit)
    }
  });
});

// 특정 상품 조회
app.get('/api/products/:id', (req, res) => {
  const productId = parseInt(req.params.id);
  const product = products.find(p => p.id === productId);
  
  if (!product) {
    return res.status(404).json({
      success: false,
      message: '상품을 찾을 수 없습니다.'
    });
  }
  
  res.json({
    success: true,
    data: product
  });
});

// 카테고리별 상품 조회
app.get('/api/products/category/:category', (req, res) => {
  const category = req.params.category;
  const categoryProducts = products.filter(product => product.category === category);
  
  res.json({
    success: true,
    data: categoryProducts,
    category: category
  });
});

// 상품 검색
app.get('/api/products/search/:query', (req, res) => {
  const query = req.params.query.toLowerCase();
  const searchResults = products.filter(product => 
    product.name.toLowerCase().includes(query) ||
    product.brand.toLowerCase().includes(query) ||
    product.description.toLowerCase().includes(query)
  );
  
  res.json({
    success: true,
    data: searchResults,
    query: query,
    count: searchResults.length
  });
});

// 브랜드 목록 조회
app.get('/api/brands', (req, res) => {
  const brands = [...new Set(products.map(product => product.brand))];
  res.json({
    success: true,
    data: brands
  });
});

// 가격대별 상품 조회
app.get('/api/products/price-range', (req, res) => {
  const { min, max } = req.query;
  
  if (!min || !max) {
    return res.status(400).json({
      success: false,
      message: '최소값과 최대값을 모두 입력해주세요.'
    });
  }
  
  const filteredProducts = products.filter(product => 
    product.price >= parseInt(min) && product.price <= parseInt(max)
  );
  
  res.json({
    success: true,
    data: filteredProducts,
    priceRange: { min: parseInt(min), max: parseInt(max) }
  });
});

// 서버 시작
app.listen(port, () => {
  console.log(`🚀 Pet Products API 서버가 포트 ${port}에서 실행 중입니다.`);
  console.log(`📡 API 엔드포인트:`);
  console.log(`   GET /api/products - 모든 상품 조회`);
  console.log(`   GET /api/products/:id - 특정 상품 조회`);
  console.log(`   GET /api/products/category/:category - 카테고리별 상품 조회`);
  console.log(`   GET /api/products/search/:query - 상품 검색`);
  console.log(`   GET /api/brands - 브랜드 목록`);
  console.log(`   GET /api/products/price-range?min=10000&max=50000 - 가격대별 상품 조회`);
});

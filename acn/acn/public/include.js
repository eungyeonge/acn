// public/include.js

document.addEventListener("DOMContentLoaded", () => {
  // ⚠️ 이 스크립트를 사용하는 모든 HTML 파일에는 Firebase SDK 및 초기화 코드가 있어야 합니다.
  const auth = firebase.auth();

  const loadHeader = (user) => {
    fetch("header.html")
      .then((res) => res.text())
      .then((data) => {
        let headerContent = data;

        if (user) {
          // ✅ 로그인 상태일 때 (Firebase가 user 객체를 전달함)
          headerContent = headerContent.replace(
            /<!-- User menu will be inserted here -->/,
            `
            <a href="cart.html" class="relative p-2 hover:bg-gray-100 rounded-lg transition">
              <svg class="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01"></path>
              </svg>
              <span id="cartCount" class="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center" style="display: none;">0</span>
            </a>
            <span class="text-sm font-semibold text-gray-700">👤 ${user.email} 님</span>
            <a href="mypage.html" class="border px-3 py-1 rounded-full text-sm hover:bg-gray-100">마이페이지</a>
            <button onclick="logout()" class="border px-3 py-1 rounded-full text-sm hover:bg-red-100 text-red-600">로그아웃</button>
            `
          );
        } else {
          // ✅ 비로그인 상태일 때 (Firebase가 user 객체로 null을 전달함)
          headerContent = headerContent.replace(
            /<!-- User menu will be inserted here -->/,
            `
            <a href="login.html" class="border px-3 py-1 rounded-full text-sm hover:bg-gray-100">로그인</a>
            <a href="signup.html" class="border px-3 py-1 rounded-full text-sm hover:bg-blue-100 text-blue-600">회원가입</a>
            `
          );
        }

        document.getElementById("header").innerHTML = headerContent;
        
        if (user) {
          updateCartCount(); // 로그인 상태일 때만 장바구니 카운트 업데이트
        }
      });
  };

  const loadFooter = () => {
    fetch("footer.html")
      .then((res) => res.text())
      .then((data) => {
        document.getElementById("footer").innerHTML = data;
      });
  };

  // ✅ Firebase의 실시간 인증 상태 변경을 감지하여 헤더를 다시 그림
  auth.onAuthStateChanged((user) => {
    loadHeader(user);
  });

  loadFooter();
});

// ✅ 장바구니 개수 업데이트 함수 (localStorage 기반, 그대로 사용)
function updateCartCount() {
  const cart = JSON.parse(localStorage.getItem('cart') || '[]');
  const totalItems = cart.reduce((sum, item) => sum + (item.quantity || 0), 0);
  
  const cartCountEl = document.getElementById('cartCount');
  if (cartCountEl) {
    cartCountEl.textContent = totalItems;
    cartCountEl.style.display = totalItems > 0 ? 'flex' : 'none';
  }
}

// ✅ Firebase 로그아웃 함수
function logout() {
  firebase.auth().signOut()
    .then(() => {
      localStorage.removeItem("cart"); // 로그아웃 시 장바구니 비우기
      console.log('Firebase 로그아웃 성공');
      window.location.href = "index.html";
    })
    .catch((error) => {
      console.error('로그아웃 오류:', error);
    });
}
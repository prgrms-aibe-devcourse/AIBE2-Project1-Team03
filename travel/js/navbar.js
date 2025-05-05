import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDyIGwUGgnoVIPXe4HINkYhZzYOT_B8xzo",
  authDomain: "aibe-3.firebaseapp.com",
  projectId: "aibe-3",
  storageBucket: "aibe-3.firebasestorage.app",
  messagingSenderId: "303637126000",
  appId: "1:303637126000:web:d9d568d321334eeffa8db5",
  measurementId: "G-SY2NP4BGFC"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const authButtons = document.getElementById('auth-buttons');

onAuthStateChanged(auth, (user) => {
  if (user) {
    // ✅ 로그인 상태 → 로그아웃만
    authButtons.innerHTML = `
       <a href="Mypage.html">마이페이지</a>
      <button id="logout-btn">로그아웃</button>
    `;
    document.getElementById('logout-btn').addEventListener('click', () => {
      signOut(auth).then(() => {
        window.location.reload();  // 새로고침으로 반영
      });
    });
  } else {
    // ❌ 비로그인 상태 → 로그인 / 회원가입
    authButtons.innerHTML = `
      <a href="login.html">로그인</a>
      <a href="signup.html">회원가입</a>
    `;
  }
});
// 로그인 상태에 따라 버튼을 업데이트
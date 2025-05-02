import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

// Firebase 설정
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

// ✅ 로그인 함수
function login() {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();
  const messageDiv = document.getElementById('message');
  
  if (!email || !password) {
    messageDiv.textContent = '이메일과 비밀번호를 모두 입력하세요!';
    return;
  }
  
  if (password.length < 6) {
    messageDiv.textContent = '비밀번호는 최소 6자리 이상이어야 합니다!';
    return;
  }
  
  signInWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      window.location.href = "index.html"; // 성공시 바로 이동
    })
    .catch((error) => {
      console.error('에러 코드:', error.code);
  
      if (
        error.code === 'auth/user-not-found' || 
        error.code === 'auth/wrong-password' || 
        error.code === 'auth/invalid-credential'||
        error.code === 'auth/invalid-email' 
      ) {
        messageDiv.textContent = '이메일 또는 비밀번호가 잘못되었습니다.';
      } else {
        messageDiv.textContent = `로그인 실패: ${error.message}`;
      }
    });
}

// ✅ 버튼 클릭 → 로그인
document.getElementById('login-btn').addEventListener('click', login);

// ✅ 엔터키 입력 → 로그인
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    login();
  }
});

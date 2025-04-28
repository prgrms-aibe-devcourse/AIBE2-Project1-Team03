import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { 
  getAuth, 
  createUserWithEmailAndPassword 
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { 
  getFirestore, 
  doc, 
  setDoc 
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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
const db = getFirestore(app);

document.getElementById('signup-btn').addEventListener('click', async () => {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();
  const name = document.getElementById('name').value.trim();
  const birth = document.getElementById('birth').value.trim();
  const favorite = document.getElementById('favorite').value.trim();
  const messageDiv = document.getElementById('message');

  // ✅ 빈칸 확인
  if (!email || !password || !name || !birth || !favorite) {
    messageDiv.textContent = '모든 항목을 입력하세요!';
    return;
  }

  // ✅ 비밀번호 길이 확인
  if (password.length < 6) {
    messageDiv.textContent = '비밀번호는 최소 6자리 이상이어야 합니다!';
    return;
  }

  try {
    // ✅ 회원가입 시도
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;

    // ✅ 추가 정보 저장
    await setDoc(doc(db, "users", uid), {
      name: name,
      birth: birth,
      favoriteTravel: favorite,
      email: email
    });

    Swal.fire({
      icon: 'success',                           // 아이콘: success / error / warning / info / question
      title: '회원가입 완료!',                   // 제목
      text: '환영합니다 😊 로그인 페이지로 이동합니다!',  // 내용
      confirmButtonColor: '#8e9aaf',             // 버튼 색깔 (네 style.css 감성 컬러)
      confirmButtonText: '확인'                  // 버튼 글자
    }).then(() => {
      window.location.href = "login.html";       // 확인 누르면 로그인 페이지로 이동
    });
  } catch (error) {
    console.error('회원가입 실패:', error);

    
    if (error.code === 'auth/email-already-in-use') {
      messageDiv.textContent = '이미 존재하는 이메일입니다!';
    } else {
      messageDiv.textContent = `회원가입 실패: ${error.message}`;
    }
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    document.getElementById('signup-btn').click();
  }
});
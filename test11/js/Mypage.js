import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut,deleteUser } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc,deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL,uploadBytesResumable  } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-storage.js";
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
const storage = getStorage(app);
const mypageDiv = document.getElementById('mypage');
const logoutBtn = document.getElementById('logout-btn');

const modalOverlay = document.getElementById('modal-overlay');
const modalTitle = document.getElementById('modal-title');
const modalInput = document.getElementById('modal-input');
const confirmBtn = document.getElementById('confirm-btn');
const cancelBtn = document.getElementById('cancel-btn');
const deleteAccountBtn = document.getElementById('delete-btn');

let currentField = '';
let currentUid = '';

const fieldLabels = {
  name: '이름',
  birth: '생년월일',
  favoriteTravel: '좋아하는 여행지'
};

// 🔥 모달 열기
function openModal(field, uid) {
  currentField = field;
  currentUid = uid;
  modalTitle.textContent = `${fieldLabels[field]} 수정`;

  if (field === 'birth') {
    modalInput.type = 'date';              
    modalInput.placeholder = '';
  } else {
    modalInput.type = 'text';             
    modalInput.placeholder = '새로운 값을 입력하세요';
  }

  modalInput.value = '';                   // 입력값 초기화
  modalOverlay.style.display = 'flex';     // 모달 열기
}

// 🔵 모달 닫기
function closeModal() {
  modalOverlay.style.display = 'none';
}

// 🔴 프로필 이미지 업로드
async function uploadProfileImage(file, uid) {
  const storageRef = ref(storage, `profileImages/${uid}`);
  await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(storageRef);

  const userDocRef = doc(db, "users", uid);
  await updateDoc(userDocRef, { profileImageUrl: downloadURL });
  alert('프로필 사진이 업로드되었습니다!');
  window.location.reload();
}


// ✏️ 수정 버튼 → 모달 열기
function renderUserInfo(data, uid) {
  mypageDiv.innerHTML = `
    <div class="profile-img-box">
      ${data.profileImageUrl 
        ? `<img src="${data.profileImageUrl}" alt="프로필 이미지" class="profile-img">` 
        : `<p>프로필 이미지가 없습니다.</p>`}
    </div>
    <input type="file" id="profile-img-upload">
    <button id="upload-profile-btn">프로필 이미지 업로드</button>

    <div class="info-item">
      <span class="label">이름:</span>
      <span class="value">${data.name}</span>
      <button class="edit-btn" data-field="name">수정</button>
    </div>
    <div class="info-item">
      <span class="label">생년월일:</span>
      <span class="value">${data.birth}</span>
      <button class="edit-btn" data-field="birth">수정</button>
    </div>
    <div class="info-item">
      <span class="label">좋아하는 여행지:</span>
      <span class="value">${data.favoriteTravel}</span>
      <button class="edit-btn" data-field="favoriteTravel">수정</button>
    </div>
    <div class="info-item">
      <span class="label">이메일:</span>
      <span class="value">${data.email}</span>
      <button class="edit-btn" style="visibility: hidden;">수정</button>
    </div>
  `;

  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const field = btn.dataset.field;
      openModal(field, uid);  // 모달 열기
    });
  });


  const uploadBtn = document.getElementById('upload-profile-btn');
  uploadBtn.addEventListener('click', async () => {
    const fileInput = document.getElementById('profile-img-upload');
    const file = fileInput.files[0];
      
    const currentUser = auth.currentUser;
    if (!currentUser) {
      alert('로그인 상태가 아닙니다. 다시 로그인해주세요.');
      window.location.href = "login.html";
      return;
    }
  
    if (file) {
      try {
        // ✅ 여기! 함수만 호출하면 됨
        await uploadProfileImage(file, currentUser.uid);  
      } catch (error) {
        console.error('업로드 에러:', error);
        alert('업로드 실패: ' + error.message);
      }
    } else {
      alert('파일을 선택하세요!');
    }
  });
}

// 🔥 모달 버튼 이벤트
confirmBtn.addEventListener('click', async () => {
  const newValue = modalInput.value.trim();
  if (newValue) {
    const docRef = doc(db, "users", currentUid);
    await updateDoc(docRef, { [currentField]: newValue });
    alert(`${fieldLabels[currentField]}이(가) 수정되었습니다!`);
    closeModal();
    window.location.reload();
  } else {
    alert('값을 입력하세요!');
  }
});

cancelBtn.addEventListener('click', () => {
  closeModal();
});

// 🔥 로그인 확인 및 정보 출력
onAuthStateChanged(auth, async (user) => {
  if (user) {
    const uid = user.uid;
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      renderUserInfo(data, uid);
    } else {
      mypageDiv.innerHTML = `<p>유저 정보가 없습니다.</p>`;
    }
  } else {
    window.location.href = "login.html";
  }
});

// 🔴 로그아웃
logoutBtn.addEventListener('click', () => {
  signOut(auth).then(() => {
    window.location.href = "index.html";
  });
});

// 🔴 회원탈퇴
if (deleteAccountBtn) {
  deleteAccountBtn.addEventListener('click', async () => {
    const confirmDelete = confirm('정말 회원탈퇴 하시겠습니까?');
    if (!confirmDelete) return;

    const user = auth.currentUser;
    const uid = user.uid;

    try {
      // 🔥 1. Firestore 정보 삭제
      await deleteDoc(doc(db, "users", uid));

      // 🔥 2. Auth 삭제 (로그인 정보 삭제)
      await deleteUser(user);

      alert('회원탈퇴가 완료되었습니다. 그동안 이용해주셔서 감사합니다!');
      window.location.href = 'index.html';
    } catch (error) {
      console.error('회원탈퇴 실패:', error);
      alert('회원탈퇴 중 오류가 발생했습니다: ' + error.message);
    }
  });
}



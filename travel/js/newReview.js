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

document.addEventListener('DOMContentLoaded', () => {
    const reviewForm = document.getElementById('review-form');
    const reviewText = document.getElementById('review-text');
    const reviewTitle = document.getElementById('review-title');
    
    // 대륙에 해당하는 체크박스 요소
    const asiaView = document.getElementById('asia-view');
    const europeView = document.getElementById('europe-view');
    const americaView = document.getElementById('america-view');

    // 대륙 라디오 버튼 요소들
    const radioAsia = document.getElementById('radio-asia');
    const radioEurope = document.getElementById('radio-europe');
    const radioAmerica = document.getElementById('radio-america');

    // 대륙 라디오 버튼 클릭 시 해당 대륙의 도시 목록 보여주기
    radioAsia.addEventListener('click', () => {
        asiaView.style.display = 'block';
        europeView.style.display = 'none';
        americaView.style.display = 'none';
    });

    radioEurope.addEventListener('click', () => {
        asiaView.style.display = 'none';
        europeView.style.display = 'block';
        americaView.style.display = 'none';
    });

    radioAmerica.addEventListener('click', () => {
        asiaView.style.display = 'none';
        europeView.style.display = 'none';
        americaView.style.display = 'block';
    });

    // 폼 제출 시 처리
    reviewForm.addEventListener('submit', function(event) {
        event.preventDefault();
        
        const reviewContent = reviewText.value.trim();
        const title = reviewTitle.value.trim();
        const storage = firebase.storage();

        if (!title || !reviewContent) {
            alert("제목과 내용을 모두 입력해주세요.");
            return;
        }

        // 대륙 선택 정보
        let country = '';

        if (radioAsia.checked) {
            if (document.getElementById('korea').checked) country = '한국';
            if (document.getElementById('japan').checked) country = '일본';
            if (document.getElementById('china').checked) country = '중국';
        } else if (radioEurope.checked) {
            if (document.getElementById('italy').checked) country = '이탈리아';
            if (document.getElementById('france').checked) country = '프랑스';
            if (document.getElementById('uk').checked) country = '영국';
            if (document.getElementById('switzerland').checked) country = '스위스';
        } else if (radioAmerica.checked) {
            if (document.getElementById('usa').checked) country = '미국';
            if (document.getElementById('canada').checked) country = '캐나다';
            if (document.getElementById('brazil').checked) country = '브라질';
        }

        if (!country) {
            alert("국가를 하나 이상 선택해주세요.");
            return;
        }
        
        async function uploadImage(file, uid) {
            const storageRef = ref(storage, `reviewImages/${uid}`);
            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);
          
            const userDocRef = doc(db, "reviews", uid);
            await updateDoc(userDocRef, { reviewImageUrl: downloadURL });
            alert('사진이 업로드되었습니다!');
          }

        // 리뷰 내용, 국가, 이메일 정보
        const reviewData = {
            title: title,
            content: reviewContent,
            country: country,
            reviewImageUrl: downloadURL
        };

        // 부모 창으로 메시지 보내기
        if (window.opener) {
            window.opener.postMessage(reviewData, window.location.origin);
        }

        // 창 닫기
        window.close();
    });
});
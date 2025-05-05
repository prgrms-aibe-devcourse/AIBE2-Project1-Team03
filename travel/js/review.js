import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import {
    getFirestore,
    collection,
    getDocs,
    addDoc,
    doc,
    updateDoc,
    deleteDoc,
    Timestamp
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDyIGwUGgnoVIPXe4HINkYhZzYOT_B8xzo",
    authDomain: "aibe-3.firebaseapp.com",
    projectId: "aibe-3",
    storageBucket: "aibe-3.appspot.com",
    messagingSenderId: "303637126000",
    appId: "1:303637126000:web:d9d568d321334eeffa8db5",
    measurementId: "G-SY2NP4BGFC"
};

let app;
if (!getApps().length) {
    app = initializeApp(firebaseConfig);
} else {
    app = getApps()[0];
}

const auth = getAuth(app);
const db = getFirestore(app); 

document.addEventListener("DOMContentLoaded", function () {
    const writeReviewBtn = document.getElementById("write-review-btn");

    let messageListenerAdded = false;

    onAuthStateChanged(auth, (user) => {
        if (user) {
            writeReviewBtn.disabled = false;
            console.log("로그인됨");

            writeReviewBtn.addEventListener("click", () => {
                const newWindow = window.open("newReview.html", "newReview", "width=600,height=400");

                if (!messageListenerAdded) {
                    window.addEventListener("message", async function (event) {
                        if (event.origin === window.location.origin && event.data) {
                            const reviewData = {
                                ...event.data,
                                email: user.email,
                                uid: user.uid,
                                createdAt: Timestamp.now(),
                                comments: []
                            };

                            await saveReview(reviewData);

                            const selectedContinent = document.querySelector('input[name="continent"]:checked')?.id.replace("radio-", "") || "모두";
                            renderReviews(selectedContinent);
                        }
                    });
                    messageListenerAdded = true;
                }
            });

            renderReviews("all"); // 초기 전체 렌더링
        } else {
            writeReviewBtn.disabled = true;
            console.log("로그인 필요");
            writeReviewBtn.addEventListener("click", () => {
                alert("로그인이 필요합니다.");
            });
        }
    });

    async function saveReview(reviewData) {
        try {
            await addDoc(collection(db, "reviews"), reviewData);
            console.log("새 리뷰가 Firestore에 저장되었습니다!");
        } catch (e) {
            console.error("Firestore에 리뷰 저장 중 오류 발생: ", e);
        }
    }

    async function updateReview(review) {
        try {
            const reviewRef = doc(db, "reviews", review.id);
            await updateDoc(reviewRef, {
                content: review.content,
                comments: review.comments
            });
        } catch (e) {
            console.error("Firestore에서 리뷰 업데이트 중 오류 발생: ", e);
        }
    }

    async function deleteReview(review) {
        try {
            const reviewRef = doc(db, "reviews", review.id);
            await deleteDoc(reviewRef);
        } catch (e) {
            console.error("Firestore에서 리뷰 삭제 중 오류 발생: ", e);
        }
    }

    async function renderReviews(filterContinent = "all") {
        const reviewList = document.getElementById("review-list");
        reviewList.innerHTML = "";

        try {
            const querySnapshot = await getDocs(collection(db, "reviews"));
            const reviews = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // 선택된 국가 체크박스 가져오기
            let checkedCountries = [];
            if (filterContinent !== "all") {
                checkedCountries = Array.from(document.querySelectorAll(`#${filterContinent}-view input[type="checkbox"]:checked`))
                    .map(cb => cb.labels[0].innerText);
            }

            const filteredReviews = reviews.filter(review => {
                if (filterContinent === "all") return true;
                return checkedCountries.includes(review.country);
            });

            filteredReviews.forEach((review) => {
                const li = document.createElement("li");
                li.classList.add("review-item");

                let createdAtString = "Unknown";
                if (review.createdAt instanceof Timestamp) {
                    createdAtString = review.createdAt.toDate().toLocaleString();
                }
                
                li.innerHTML = `
                    <p class="review-title"><strong>제목:</strong> ${review.title}</p>  
                    ${review.imageUrl ? `<img src="${review.imageUrl}" style="max-width: 300px;">` : ""}
                    <p class="review-summary">
                        <strong>국가:</strong> ${review.country} <br>
                        <strong>작성자:</strong> ${review.email} <br>
                        <strong>작성일:</strong> ${createdAtString}
                    </p>
                    <p><em>리뷰 클릭 시 전체 내용이 표시됩니다</em></p>
                    <div class="comments">
                        <h4>댓글</h4>
                        <ul class="comment-list">
                            ${review.comments?.map(comment => `<li>${comment}</li>`).join("") || ""}
                        </ul>
                        <textarea class="comment-input" placeholder="댓글을 입력하세요"></textarea>
                        <button class="comment-btn">댓글 추가</button>
                    </div>

                    <div class="review-actions">
                        <button class="edit-btn">수정</button>
                        <button class="delete-btn">삭제</button>
                    </div>
                `;

                li.style.cursor = "pointer";
                // reviewList.appendChild(li);

                // ▶ 리뷰 클릭 시 팝업 창으로 content 표시
                li.querySelector(".review-summary").addEventListener("click", () => {
                    const popup = window.open("", "reviewPopup", "width=500,height=400");
                    popup.document.write(`
                        <html>
                            <head>
                                <title>리뷰 상세 보기</title>
                                <style>
                                    body { font-family: sans-serif; padding: 20px; }
                                    h2 { margin-bottom: 10px; }
                                    p { white-space: pre-wrap; }
                                </style>
                            </head>
                            <body>
                                <h2>${review.title}</h2>
                                ${review.imageUrl ? `<img src="${review.imageUrl}" style="max-width:100%;">` : ""}
                                <p><strong>국가:</strong> ${review.country}</p>
                                <p><strong>작성자:</strong> ${review.email}</p>
                                <p><strong>작성일:</strong> ${createdAtString}</p>
                                <hr>
                                <p>${review.content}</p>
                            </body>
                        </html>
                    `);
                });

                // 이벤트 연결
                const commentBtn = li.querySelector(".comment-btn");
                const commentInput = li.querySelector(".comment-input");
                const editBtn = li.querySelector(".edit-btn");
                const deleteBtn = li.querySelector(".delete-btn");

                commentBtn.addEventListener("click", async () => {
                    const commentText = commentInput.value.trim();
                    if (commentText) {
                        review.comments.push(commentText);
                        await updateReview(review);
                        renderReviews(filterContinent);
                    }
                });

                deleteBtn.addEventListener("click", async () => {
                    const currentUser = auth.currentUser;
                
                    if (currentUser && currentUser.uid === review.uid) {
                        if (confirm("정말 이 리뷰를 삭제할까요?")) {
                            await deleteReview(review);
                            renderReviews(filterContinent);
                        }
                    } else {
                        alert("본인이 작성한 리뷰만 삭제할 수 있습니다.");
                    }
                });
                
                editBtn.addEventListener("click", async () => {
                    const currentUser = auth.currentUser;
                
                    if (currentUser && currentUser.uid === review.uid) {
                        const newContent = prompt("리뷰 내용을 수정하세요:", review.content);
                        if (newContent !== null && newContent.trim() !== "") {
                            review.content = newContent.trim();
                            await updateReview(review);
                            renderReviews(filterContinent);
                        }
                    } else {
                        alert("본인이 작성한 리뷰만 수정할 수 있습니다.");
                    }
                });
                
                reviewList.appendChild(li);
            });
        } catch (e) {
            console.error("Firestore에서 리뷰 불러오기 중 오류 발생: ", e);
        }
    }

    // 라디오 버튼 이벤트
    const allBtn = document.getElementById("radio-all");
    const asiaBtn = document.getElementById("radio-asia");
    const europeBtn = document.getElementById("radio-europe");
    const americaBtn = document.getElementById("radio-america");

    allBtn.addEventListener("click", () => {
        document.querySelectorAll(".continent-view").forEach(div => div.style.display = "none");
        renderReviews("all");
    });

    asiaBtn.addEventListener("click", () => {
        document.getElementById("asia-view").style.display = "block";
        document.getElementById("europe-view").style.display = "none";
        document.getElementById("america-view").style.display = "none";
        renderReviews("asia");
    });

    europeBtn.addEventListener("click", () => {
        document.getElementById("asia-view").style.display = "none";
        document.getElementById("europe-view").style.display = "block";
        document.getElementById("america-view").style.display = "none";
        renderReviews("europe");
    });

    americaBtn.addEventListener("click", () => {
        document.getElementById("asia-view").style.display = "none";
        document.getElementById("europe-view").style.display = "none";
        document.getElementById("america-view").style.display = "block";
        renderReviews("america");
    });

    // 체크박스 상태 변경 시 자동 필터링
    document.querySelectorAll("#city-checkboxes input[type='checkbox']").forEach(cb => {
        cb.addEventListener("change", () => {
            const selectedContinent = document.querySelector('input[name="continent"]:checked')?.id.replace("radio-", "") || "all";
            renderReviews(selectedContinent);
        });
    });
});



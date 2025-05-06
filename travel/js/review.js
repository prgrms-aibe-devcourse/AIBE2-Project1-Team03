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
    Timestamp,
    orderBy, 
    query
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
    const myReviewsBtn = document.getElementById("my-review-btn");

    let messageListenerAdded = false;

    onAuthStateChanged(auth, (user) => {
        if (user) {
            writeReviewBtn.disabled = false;
            console.log("로그인됨");

            // myReviewsBtn.addEventListener("click", () => {
            //     renderMyReviews(user.email);
            // });

            writeReviewBtn.addEventListener("click", () => {
                const newWindow = window.open("newReview.html", "newReview", "width=700,height=700");

                if (!messageListenerAdded) {
                    window.addEventListener("message", async function (event) {
                        if (
                            event.origin === window.location.origin &&
                            event.data &&
                            event.data.title &&
                            event.data.content &&
                            event.data.country
                          ) {
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

    function truncateText(text, maxLength) {
        if (!text) return "";
        return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
    }    

    async function renderReviews(filterContinent = "all") {
        const reviewList = document.getElementById("review-list");
        reviewList.innerHTML = "";

        try {
            const q = query(collection(db, "reviews"), orderBy("createdAt", "desc"));
            const querySnapshot = await getDocs(q);
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
                
                // ${review.imageUrl ? `<img src="${review.imageUrl}" style="max-width: 300px;">` : ""}
                li.innerHTML = `
                    <p class="review-title"><strong>${review.title}</strong></p>  
                    <div class="review-summary">
                    ${review.imageUrl ? `<img src="${review.imageUrl}" alt="Review Image">` : ""}
                        <div class="review-meta">
                        <p><strong>🚩:</strong> ${review.country}</p>
                        <p><strong>👤:</strong> ${review.email}</p>
                        <p><strong>📆:</strong> ${createdAtString}</p>
                        </div>
                    </div>
                    <p class="review-content-preview"><em>${truncateText(review.content, 80)}</em></p>
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
                li.querySelector(".review-summary").addEventListener("click", openReviewPopup);
                li.querySelector(".review-content-preview").addEventListener("click", openReviewPopup); 
                function openReviewPopup() {
                    const popup = window.open("", "reviewPopup", "width=700,height=2000");
                    popup.document.write(`
                        <html>
                            <head> 
                            <title>리뷰 상세 보기</title>
                            <style>
                                body {
                                    margin: 0;
                                    padding: 0;
                                    font-family: 'Noto Sans KR', sans-serif;
                                    background-color: #f0f4f8;
                                    display: flex;
                                    justify-content: center;
                                }
                                .card {
                                    background-color: #fff;
                                    border-radius: 16px;
                                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
                                    max-width: 700px;
                                    width: 100%;
                                    padding: 24px;
                                    margin-top: 0; 
                                }
                                h2 {
                                    font-size: 1.8em;
                                    font-weight: 700;
                                    color: #2c3e50;
                                    margin-top: 0; 
                                    margin-bottom: 16px;
                                }
                                img {
                                    width: 100%;
                                    border-radius: 12px;
                                    margin-bottom: 20px;
                                }
                                .info {
                                    display: flex;
                                    flex-direction: column;
                                    gap: 8px;
                                    font-size: 0.95em;
                                    color: #34495e;
                                }
                                .info p {
                                    margin: 0;
                                }
                                .info span {
                                    margin-left: 6px;
                                }
                                .content {
                                    line-height: 1.6;
                                    font-size: 1em;
                                    color: #555;
                                    white-space: pre-line;
                                }
                                hr {
                                    margin: 20px 0;
                                    border: none;
                                    border-top: 1px solid #ddd;
                                }
                            </style>
                        </head>
                        <body>
                            <div class="card">
                                <h2>${review.title}</h2>
                                ${review.imageUrl ? `<img src="${review.imageUrl}">` : ""}
                                <div class="info">
                                    <p>📍<span>${review.country}</span></p>
                                    <p>👤<span>${review.email}</span></p>
                                    <p>📅<span>${createdAtString}</span></p>
                                </div>
                                <hr>
                                <div class="content">
                                    ${review.content}
                                </div>
                            </div>
                        </body>
                        </html>
                    `);
                }

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
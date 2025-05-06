import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth }        from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
let latestRawItineraryText = "";
const firebaseConfig = {
    apiKey: "AIzaSyDyIGwUGgnoVIPXe4HINkYhZzYOT_B8xzo",
    authDomain: "aibe-3.firebaseapp.com",
    projectId: "aibe-3",
    storageBucket: "aibe-3.firebasestorage.app",
    messagingSenderId: "303637126000",
    appId: "1:303637126000:web:d9d568d321334eeffa8db5",
    measurementId: "G-SY2NP4BGFC"
  };
  const app  = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db   = getFirestore(app);

document.getElementById('ai-smart-recommend-btn').addEventListener('click', async () => {
    const minBudget = document.querySelector('[name="minBudget"]').value;
    const maxBudget = document.querySelector('[name="maxBudget"]').value;
    const days = document.querySelector('[name="days"]').value;
    const countryCode = document.querySelector('[name="country"]').value;
    const travelStyle = document.querySelector('[name="travelStyle"]').value;
    const interests = document.querySelector('[name="interests"]').value;
    const region = document.querySelector('[name="region"]').value;
   
  
    if (!minBudget || !maxBudget || !days) {
      alert("예산과 여행 일수를 모두 입력해주세요.");
      return;
    }
  
    const countryMap = {
      KR: "대한민국",
      JP: "일본",
      FR: "프랑스",
      US: "미국",
      IT: "이탈리아"
    };
  
    const countryName = countryMap[countryCode] || "추천 국가";
  
    const prompt = `
    나는 ${days}일 동안 ${countryName}으로 여행을 갈 거야.
    여행 지역은 반드시 **${region} 중심**으로만 추천해줘.
    총 예산은 ${minBudget}~${maxBudget} 달러야.
    여행 스타일은 ${travelStyle} 스타일을 선호하고,
    내가 특히 관심 있는 활동은 ${interests}야.
    
    하루 단위로 아침, 점심, 오후, 저녁, 숙소 일정을 구체적으로 추천해줘.
    
    각 일정마다 다음 정보를 반드시 포함해줘:
    - 장소 이름 또는 식당 이름 (구글맵에서 검색되는 실제 장소 이름으로만! 반드시 존재하는 장소여야 해)
    - 간단한 설명 (왜 추천하는지)
    - 예상 비용 (달러 기준)
    - 반드시 ${region} 지역 중심이어야 하며, 지역 외 장소는 포함하지 마
    - 그리고 최적의 동선으로 추천해줘 
    특히 숙소는 매일 포함하고, **숙소 이름을 반드시 명시**해. 숙소 이름이 같아도 생략하지 마.  
    숙소 이름도 구글맵에서 검색 가능한 실제 이름이여야 해.
    마지막 날은 공항으로 가잖아? 실제 공항이여야해

    아래 형식을 반드시 지켜서 작성해줘 무조건 :
    
    Day 1:
    - 오전: [장소 이름] - [설명] (예상 비용: $XX)
    - 점심: [식당 이름] - [설명] (예상 비용: $XX)
    - 오후: [장소 이름] - [설명] (예상 비용: $XX)
    - 저녁: [식당 이름] - [설명] (예상 비용: $XX)
    - 숙소: [숙소 이름] - [설명] (예상 비용: $XX)
    - 일일 총 비용: $XXX
    
    Day 2:
    ...

    마지막날엔 이래야해

    - 오전: [장소 이름] - [설명] (예상 비용: $XX)
    - 점심: [식당 이름] - [설명] (예상 비용: $XX)
    - 공항: [공항 이름] - [설명] (예상 비용: $XX)
    - 일일 총 비용: $XXX
    `;
  
    try {
      const response = await fetch("http://localhost:3000/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt })
      });
  
      const result = await response.json();
      const itineraryText = result.candidates?.[0]?.content?.parts?.[0]?.text;
      latestRawItineraryText = itineraryText;
  
      if (!itineraryText) {
        alert("AI가 일정을 생성하지 못했어요 😢");
        return;
      }
      const itinerary = parseGeminiItinerary(itineraryText);
      displayAiPanel(itinerary, region);
      document.getElementById("gemini-itinerary").innerText = itineraryText;
      document.getElementById("ai-panel").style.display = "block";
  
      
    } catch (err) {
      console.error("Gemini 호출 오류:", err);
      alert("일정 생성 중 오류가 발생했어요.");
    }
  });
  
 

  let aiMap;
  function initAiMap(center = { lat: 35.6895, lng: 139.6917 }) {
    aiMap = new google.maps.Map(document.getElementById("ai-map"), {
      center,
      zoom: 12
    });
  }
  
  function renderAiMarkers(places) {
    if (!aiMap) initAiMap();
  
    const bounds = new google.maps.LatLngBounds();
  
    places.forEach((place, index) => {
      const marker = new google.maps.Marker({
        position: { lat: place.lat, lng: place.lng },
        map: aiMap,
        label: `${index + 1}`,     // 숫자 라벨
        title: place.name          // 마우스 오버용
      });
  
      const infoWindow = new google.maps.InfoWindow({
        content: `<strong>${index + 1}. ${place.name}</strong>`
      });
  
      marker.addListener('click', () => {
        infoWindow.open(aiMap, marker);
      });
  
      bounds.extend(marker.getPosition());
    });
  
    aiMap.fitBounds(bounds);
  }
  

  function parseGeminiItinerary(text) {
    const dayMatches = [...text.matchAll(/Day\s+(\d+):/g)];
    const result = [];
  
    for (let i = 0; i < dayMatches.length; i++) {
      const current = dayMatches[i];
      const next = dayMatches[i + 1];
  
      const startIdx = current.index + current[0].length;
      const endIdx = next ? next.index : text.length;
  
      const content = text.slice(startIdx, endIdx).trim();
  
      result.push({
        day: Number(current[1]),
        title: current[1],  // ex: "Day 3"
        content
      });
    }
  
    return result;
  }

  function displayAiPanel(itinerary, region) {
    const panel = document.getElementById("ai-panel");
    const btnBox = document.getElementById("ai-day-buttons");
    const listBox = document.getElementById("ai-itinerary-list");
    const mapBox = document.getElementById("ai-map");
  
    panel.style.display = "block";
    btnBox.innerHTML = "";
    listBox.innerHTML = "";
  
    itinerary.forEach(({ day, title, content }) => {
      const btn = document.createElement("button");
      btn.textContent = `Day ${day}`;
  
      btn.onclick = async () => {
        listBox.innerHTML = `
  <h3>Day${title}: </h3>
  <pre style="white-space: pre-wrap;">${content}</pre>
`;
  
        // 1️⃣ 장소 이름 뽑기
        const placeNames = extractPlaceNamesFromItinerary([{ content }]);  // 하루치만 넣음
  
        // 2️⃣ Google Maps에서 좌표 얻기
        const coords = await getPlaceCoordinates(placeNames, region);
  
        // 3️⃣ 지도 초기화
        initAiMap(coords.length > 0 ? coords[0] : { lat: 35.6895, lng: 139.6917 });
  
        // 4️⃣ 마커 렌더링
        renderAiMarkers(coords);
      };
  
      btnBox.appendChild(btn);
    });
  
    if (itinerary.length > 0) {
      btnBox.querySelector("button").click();
    }
  }
  


  function extractPlaceNamesFromItinerary(itinerary) {
    const placeNames = [];
  
    const regex = /-\s*(?:오전|점심|오후|저녁|숙소|공항):\s*([^\-]+?)\s*-/g;
  
    itinerary.forEach(day => {
      const matches = [...day.content.matchAll(regex)];
      for (const match of matches) {
        const name = match[1].trim();
        if (name && !placeNames.includes(name)) {
          placeNames.push(name);
        }
      }
    });
  
    return placeNames;
  }

  async function getPlaceCoordinates(placeNames, region = '') {
    const proxy = 'http://localhost:8080/';
    const key = 'AIzaSyA5ueda7Qmq4m_agO069YgX82NkEhJCzRY';
    const results = [];
  
    // ✅ 지역별 중심 좌표 정의
    const regionCenterMap = {
      "오사카": { lat: 34.6937, lng: 135.5023 },
      "도쿄": { lat: 35.6895, lng: 139.6917 },
      "교토": { lat: 35.0116, lng: 135.7681 },
      "삿포로": { lat: 43.0618, lng: 141.3545 },
      "파리": { lat: 48.8566, lng: 2.3522 },
      "로마": { lat: 41.9028, lng: 12.4964 },
      "밀라노": { lat: 45.4642, lng: 9.1900 },
      "뉴욕": { lat: 40.7128, lng: -74.0060 },
      "LA": { lat: 34.0522, lng: -118.2437 },
      "샌프란시스코": { lat: 37.7749, lng: -122.4194 },
      "서울": { lat: 37.5665, lng: 126.9780 },
      "부산": { lat: 35.1796, lng: 129.0756 },
      "제주도": { lat: 33.4996, lng: 126.5312 },
    };
  
    const center = regionCenterMap[region] || { lat: 35.6895, lng: 139.6917 };  // fallback: 도쿄
  
    for (const name of placeNames) {
      const query = encodeURIComponent(name);
      const url = `${proxy}https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&location=${center.lat},${center.lng}&radius=20000&key=${key}&language=ko`;
  
      try {
        const res = await fetch(url);
        const data = await res.json();
        if (data.status === 'OK' && data.results.length > 0) {
          const loc = data.results[0].geometry.location;
          results.push({ name, lat: loc.lat, lng: loc.lng });
        }
      } catch (err) {
        console.warn('Place fetch error for:', name, err);
      }
    }
  
    return results;
  }
  
const regionOptions = {
    JP: ["도쿄", "오사카", "교토", "삿포로"],
    FR: ["파리", "니스", "마르세유"],
    US: ["뉴욕", "LA", "샌프란시스코"],
    IT: ["로마", "베네치아", "밀라노"],
    KR: ["서울", "부산", "제주도"]
  };
  
  document.getElementById("country-select").addEventListener("change", (e) => {
    const selected = e.target.value;
    const regionSelect = document.getElementById("region-select");
  
    regionSelect.innerHTML = `<option value="">선택 안 함</option>`;
    if (regionOptions[selected]) {
      regionOptions[selected].forEach(region => {
        const opt = document.createElement("option");
        opt.value = region;
        opt.textContent = region;
        regionSelect.appendChild(opt);
      });
    }
  });




  function convertItineraryToFirestoreFormat(rawText, countryCode, displayName) {
    const days = [];
  
    // 🔧 수정된 정규식
    const dayBlocks = [...rawText.matchAll(
      /Day\s*:?[\s]*(\d+):\s*\n([\s\S]*?)(?=\nDay\s*:?[\s]*\d+:|\n- 오전:|\n\*\*참고|\Z)/g)];
  
    const typeMap = {
      "오전": "오전",
      "점심": "점심",
      "오후": "오후",
      "저녁": "저녁",
      "숙소": "숙소",
      "공항": "공항"
    };
  
    for (const [_, dayStr, content] of dayBlocks) {
      const places = [];
      const lines = content.trim().split('\n');
  
      for (const line of lines) {
        const match = line.match(/-\s*(오전|점심|오후|저녁|숙소|공항):\s*\*{0,2}(.+?)\*{0,2}\s*-\s*(.*?)\s*\(예상 비용:.*?\)/);
        if (match) {
          const [, timeSlot, name, description] = match;
          places.push({
            name: name.trim(),
            description: description.trim(),
            type: typeMap[timeSlot]
          });
        }
      }
  
      days.push({
        day: parseInt(dayStr),
        places
      });
    }
  
    return {
      country: countryCode,
      displayName,
      updatedAt: new Date().toISOString(),
      days
    };
  }
  
  


 
// ✏️ 일정 저장 버튼 클릭 시
document.getElementById("save-itinerary-btn").addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user) {
      alert("로그인이 필요해요.");
      return;
    }
  
    const rawText = latestRawItineraryText;
    const countryCode = document.querySelector('[name="country"]').value;
    const displayName = prompt("일정 이름을 입력해주세요 (예: 오사카_맛집투어)");
  
    if (!displayName) {
      alert("일정 이름은 필수예요!");
      return;
    }
  
    const docData = convertItineraryToFirestoreFormat(rawText, countryCode, displayName);
  
    try {
      await addDoc(collection(db, "users", user.uid, "itineraries"), docData);
      alert("✅ 일정이 저장되었어요!");
    } catch (err) {
      console.error("Firestore 저장 오류:", err);
      alert("❌ 일정 저장에 실패했어요.");
    }
  });
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

    const form = document.getElementById('filterForm');

    // ✅ 브라우저 기본 유효성 검사 실행
    if (!form.checkValidity()) {
      form.reportValidity();  // 
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
    - 그리고 최적의 동선으로 추천해줘(뭐 오전에 어디를 가고 점심을 어디를 먹고 하는데 거리가 너무 멀면 안된다는 소리) 
    특히 숙소는 매일 포함하고, **숙소 이름을 반드시 명시**해. 숙소 이름이 같아도 생략하지 마.  
    숙소 이름도 구글맵에서 검색 가능한 실제 이름이여야 해.
    마지막 날은 공항으로 가잖아? 실제 공항이여야해 최대한 동선에 맞춰 가까운 공항이여야하고
    최대한 예산에 맞춰서(최소${minBudget}달러여야하고 최대${maxBudget} 달러여야해) 추천해줘야해 
    - "근처 식당", "시내 호텔", "공원", "쇼핑몰"처럼 **구체적 이름이 없는 표현은 절대 사용하지 마.**
    - **모든 장소, 식당, 숙소, 공항 이름은 구글맵에서 실제로 검색 가능한 이름**이어야 하고 풀네임으로 알려줘 그래야 ${region}안에서 제대로 검색되니까.
  
    아래 형식을 반드시 지켜서 작성해줘 무조건 ([]는 안써도돼) :
    
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

    단, 여행 스타일이 "빡빡"일 경우에만 관심사에 따라 하루 일정에  
    아래와 같이 **일정이 한 줄 더 추가**될 수 있어. 이때 시간대 이름은 그대로 반복해도 돼.

    - 관심사가 "맛집 탐방"이면: 점심 또는 저녁 일정이 한 번 더 추가됨 점심점심 저녁저녁 섞었으면 좋겠음 (맨날  점심 연달아서가 아니라 어떤날은 저녁 두번)
    - 관심사가 "쇼핑" 또는 "관광지"면: 오전 또는 오후 일정이 한 번 더 추가되는데 오전오전 오후오후 섞었으면 좋겠음 

    예시 (맛집 탐방의 경우):
    - 오전: [장소 이름] - [설명] (예상 비용: $XX)
    - 점심: [식당 이름] - [설명] (예상 비용: $XX)
    - 점심: [식당 이름] - [설명] (예상 비용: $XX)
    - 오후: [장소 이름] - [설명] (예상 비용: $XX)
    - 저녁: [식당 이름] - [설명] (예상 비용: $XX)
    - 숙소: [숙소 이름] - [설명] (예상 비용: $XX)
    - 일일 총 비용: $XXX
    또는
    - 오전: [장소 이름] - [설명] (예상 비용: $XX)
    - 점심: [식당 이름] - [설명] (예상 비용: $XX)
    - 오후: [장소 이름] - [설명] (예상 비용: $XX)
    - 저녁: [식당 이름] - [설명] (예상 비용: $XX)
    - 저녁: [식당 이름] - [설명] (예상 비용: $XX)
    - 숙소: [숙소 이름] - [설명] (예상 비용: $XX)
    - 일일 총 비용: $XXX
이렇게 

    예시 (관심사가 쇼핑 또는 관광지일 경우):
    - 오전: [장소 이름] - [설명] (예상 비용: $XX)
    - 오전: [장소 이름] - [설명] (예상 비용: $XX)
    - 점심: [식당 이름] - [설명] (예상 비용: $XX)
    - 오후: [장소 이름] - [설명] (예상 비용: $XX)
    - 저녁: [식당 이름] - [설명] (예상 비용: $XX)
    - 숙소: [숙소 이름] - [설명] (예상 비용: $XX)
    - 일일 총 비용: $XXX
    또는
    - 오전: [장소 이름] - [설명] (예상 비용: $XX)
    - 점심: [식당 이름] - [설명] (예상 비용: $XX)
    - 오후: [장소 이름] - [설명] (예상 비용: $XX)
    - 오후: [장소 이름] - [설명] (예상 비용: $XX)
    - 저녁: [식당 이름] - [설명] (예상 비용: $XX)
    - 숙소: [숙소 이름] - [설명] (예상 비용: $XX)
    - 일일 총 비용: $XXX


    반드시 위와 동일한 형식을 유지해서 작성해야하는데 여행스타일이 "여유"면 기본 형식대로 해줘


    `;
   // 🔼 로딩 시작
   showLoading();
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
    finally {
        hideLoading(); // ✅ 로딩 종료
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
  
    let totalCost = 0; // 💰 총 비용 저장
  
    itinerary.forEach(({ day, title, content }) => {
      // 총 비용 누적 계산
      const dailyMatch = content.match(/일일 총 비용:\s*\$([0-9]+)/);
      if (dailyMatch) {
        totalCost += parseInt(dailyMatch[1]);
      }
  
      // Day 버튼 생성
      const btn = document.createElement("button");
      btn.textContent = `Day ${day}`;
      btn.classList.add("day-button");
  
      btn.onclick = async () => {
        const parsed = [];
        const lines = content.trim().split('\n');
        const regex = /-\s*(오전|점심|오후|저녁|숙소|공항):\s*\[?(.+?)\]?\s*-\s*(.*?)\s*\(예상 비용:\s*\$([^)]+)\)/;
  
        let dailyTotal = "";
        lines.forEach(line => {
          const match = line.match(regex);
          if (match) {
            const [, time, name, desc, cost] = match;
            parsed.push({ time, name, desc, cost });
          } else if (line.includes("일일 총 비용")) {
            dailyTotal = line;
          }
        });
  
        listBox.innerHTML = `<h3>Day ${title}</h3>`;
        parsed.forEach(({ time, name, desc, cost }) => {
          const card = document.createElement("div");
          card.style.background = "#f1f8ff";
          card.style.borderLeft = "6px solid #2196F3";
          card.style.marginBottom = "10px";
          card.style.padding = "12px 16px";
          card.style.borderRadius = "8px";
  
          card.innerHTML = `
            <strong>${time} · [${name}]</strong><br>
            <div style="margin-top: 6px;">${desc}</div>
            <div style="margin-top: 6px; color: gray;">예상 비용: $${cost}</div>
          `;
          listBox.appendChild(card);
        });
  
        if (dailyTotal) {
          const costLine = document.createElement("div");
          costLine.style.marginTop = "10px";
          costLine.style.fontWeight = "bold";
          costLine.style.fontSize = "16px";
          listBox.appendChild(costLine);
          costLine.textContent = dailyTotal;
        }
  
        const placeNames = parsed.map(p => p.name);
        const coords = await getPlaceCoordinates(placeNames, region);
        initAiMap(coords.length > 0 ? coords[0] : { lat: 35.6895, lng: 139.6917 });
        renderAiMarkers(coords);
      };
  
      btnBox.appendChild(btn);
    });
  
    // 💸 총 비용 요소 추가
    const totalCostEl = document.createElement("div");
    totalCostEl.textContent = `총 예상 비용: $${totalCost} (* 항공권 제외 가격이며, 실제 비용은 개인의 소비 패턴에 따라 달라집니다. 
                                                            그리고 예산안에 맞지 않으면 다시 여행 정보를 입력하는걸 추천드립니다.)`;
    totalCostEl.style.fontWeight = "bold";
    totalCostEl.style.marginLeft = "16px";
    totalCostEl.style.fontSize = "16px";
    totalCostEl.style.color = "#333";
    totalCostEl.style.alignSelf = "center";
  
    btnBox.appendChild(totalCostEl);
  
    // 첫 번째 버튼 자동 클릭
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
      const query = encodeURIComponent(`${name} ${region}`); 
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



  function convertItineraryToFirestoreFormat(rawText, countryCode, displayName, region) {
    const days = [];
    let totalTripCost = 0;
  
    const dayBlocks = [...rawText.matchAll(
      /Day\s*:?[\s]*(\d+):\s*\n([\s\S]*?)(?=\nDay\s*:?[\s]*\d+:|\n\*\*참고|\Z)/g)];
  
    for (const [_, dayStr, content] of dayBlocks) {
      const places = [];
      const lines = content.trim().split('\n');
      let dailyCost = 0;
  
      const timeSlotCounter = {};  // 시간대별 등장 횟수
  
      for (const line of lines) {
        const match = line.match(/-\s*(오전|점심|오후|저녁|숙소|공항):\s*(.*?)\s*-\s*(.*?)\s*\(예상 비용:\s*\$([^)]+)\)/);
        if (match) {
          const [, timeSlot, name, description, costStr] = match;
          const cost = parseInt(costStr.replace(/[^0-9]/g, '')) || 0;
  
          timeSlotCounter[timeSlot] = (timeSlotCounter[timeSlot] || 0) + 1;
  
          // ✅ 오전/점심/오후/저녁 중복 허용 처리
          const label = (["오전", "점심", "오후", "저녁"].includes(timeSlot) && timeSlotCounter[timeSlot] > 1)
            ? `${timeSlot}${timeSlotCounter[timeSlot]}`
            : timeSlot;
  
          places.push({
            name: name.trim(),
            description: description.trim(),
            type: label,
            cost,
            region
          });
  
          dailyCost += cost;
        }
      }
  
      days.push({
        day: parseInt(dayStr),
        places,
        totalCost: dailyCost
      });
  
      totalTripCost += dailyCost;
    }
  
    return {
      country: countryCode,
      displayName,
      region,
      updatedAt: new Date().toISOString(),
      days,
      totalCost: totalTripCost
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
    const region = document.querySelector('[name="region"]').value; 
  
    if (!displayName) {
      alert("일정 이름은 필수예요!");
      return;
    }
  
    const docData = convertItineraryToFirestoreFormat(rawText, countryCode, displayName, region);
  
    try {
      await addDoc(collection(db, "users", user.uid, "itineraries"), docData);
      alert("✅ 일정이 저장되었어요!");
    } catch (err) {
      console.error("Firestore 저장 오류:", err);
      alert("❌ 일정 저장에 실패했어요.");
    }
  });






  function renderItineraryCards(content) {
    const listBox = document.getElementById("ai-itinerary-list");
    listBox.innerHTML = "";
  
    const lines = content.trim().split('\n');
    lines.forEach(line => {
      const match = line.match(/-\s*(오전|점심|오후|저녁|숙소|공항):\s*(.*?)\s*-\s*(.*?)\s*\(예상 비용:\s*\$([\d.]+)\)/);
  
      if (match) {
        const [, time, name, description, cost] = match;
  
        const card = document.createElement("div");
        card.className = "ai-card";
  
        const title = document.createElement("h4");
        title.textContent = `${time} · ${name}`;
  
        const desc = document.createElement("p");
        desc.textContent = description;
  
        const costElem = document.createElement("div");
        costElem.className = "ai-cost";
        costElem.textContent = `예상 비용: $${cost}`;
  
        card.appendChild(title);
        card.appendChild(desc);
        card.appendChild(costElem);
  
        listBox.appendChild(card);
      } else if (line.startsWith("- 일일 총 비용:")) {
        const total = document.createElement("p");
        total.style.marginTop = "12px";
        total.style.fontWeight = "bold";
        total.textContent = line.replace("- ", "");
        listBox.appendChild(total);
      }
    });
  }




  function showLoading() {
    const overlay = document.getElementById("loading-overlay");
    if (overlay) overlay.style.display = "flex";
  }
  
  function hideLoading() {
    const overlay = document.getElementById("loading-overlay");
    if (overlay) overlay.style.display = "none";
  }
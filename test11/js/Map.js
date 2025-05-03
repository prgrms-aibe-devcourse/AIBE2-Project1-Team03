import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth }        from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

import { capitalKoMap } from './capital-ko-map.js'; 

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

// ----------------- 전역 변수 및 데이터 로딩 -----------------
let lastSelectedId = null;

let map, directionsService, directionsRenderer;
let selectedPlaces = [], currentPlaces = [];
let selectedRestaurants = [], currentRestaurants = [];
let currentHotels = [];
let countryBudgetData = {}, capitalData = {};
let currentAirports = [];
let markers = [];
const googlePlacesKey = 'AIzaSyA5ueda7Qmq4m_agO069YgX82NkEhJCzRY';

// 출발지: 인천공항 지금은 이걸로 고정
const departure = {
  type: '출발',
  name: '인천공항',
  lat: 37.4602,
  lng: 126.4407
};

// ----------------- 초기 데이터 로드 -----------------
Promise.all([
  fetch('../assets/Budget.json').then(r => r.json()),
  fetch('../assets/capital.json').then(r => r.json()),
  fetch('../assets/world-map.svg').then(r => r.text())
])
.then(([budget, capital, svgText]) => {
  countryBudgetData = budget;
  capitalData       = capital;
  document.getElementById('map-container').innerHTML = svgText;
  setupMapClickEvents();

  // URL 파라미터로 넘어온 값으로 강조
  highlightCountriesByBudget(MIN_BUDGET, MAX_BUDGET, DAYS);
  if (SELECTED_COUNTRY) {
    const el = document.getElementById(SELECTED_COUNTRY.toLowerCase());
    if (el) {
      el.style.stroke      = '#FF5722';
      el.style.strokeWidth = '3px';
    }
  }
})
.catch(console.error);

// ----------------- 국가 클릭 이벤트 -----------------
function setupMapClickEvents() {
  const svg = document.querySelector('#map-container svg');
  if (!svg) return;
  svg.querySelectorAll('path').forEach(path => {
    path.addEventListener('click', () => {
      const g = path.closest('g');
      if (!g || !g.id) return;
      lastSelectedId = g.id.toUpperCase();
      close_slide();
      open_slide(lastSelectedId);
      Add_Weather(lastSelectedId);
      display_budget(lastSelectedId);
      loadPlacesForCountry(lastSelectedId);
    });
  });
}

// ----------------- 사이드패널 열기/닫기 -----------------
function open_slide(code) {
  document.getElementById('sidePanel').classList.add('open');

  const countryName = new Intl.DisplayNames(['ko'], { type: 'region' }).of(code);
  const rawCapital = capitalData[code] || '';
  const capitalName = capitalKoMap[rawCapital] || rawCapital;

  document.getElementById('contry_info').innerHTML = `
    <img src="https://flagcdn.com/w80/${code.toLowerCase()}.png" alt="">
    <p>${countryName}${capitalName ? ` - ${capitalName}` : ''}</p>
  `;
}
function close_slide() {
  document.getElementById('sidePanel').classList.remove('open');
  ['contry_info','weather','tourist','Budget'].forEach(id => {
    document.getElementById(id).innerHTML = '';
  });
}
document.getElementById('side-close').addEventListener('click', close_slide);

// ----------------- 날씨 표시 -----------------
function Add_Weather(code) {
  const city = capitalData[code];
  if (!city) return;
  fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city},${code}&appid=79fc9d5f205b88928b916382beacdf68&units=metric&lang=kr`)
    .then(r => r.json())
    .then(d => {
      document.getElementById('weather').innerHTML = `
        <div class="weather-block">
          <div class="weather-row">날씨: <img src="https://openweathermap.org/img/wn/${d.weather[0].icon}@2x.png" alt=""></div>
          <div class="weather-row">현재온도: ${d.main.temp.toFixed(1)}°C</div>
        </div>
      `;
    })
    .catch(console.error);
}

// ----------------- 예산 표시 -----------------
function display_budget(code) {
  const info = countryBudgetData[code];
  if (!info) return;
  // 전역으로 선언된 DAYS 사용
  const days = DAYS;
  const acc = Math.round(info.accommodation * (days - 1));
  const tra = Math.round(info.transport     * days);
  const foo = Math.round(info.food          * days);
  const tot = acc + tra + foo;
  document.getElementById('Budget').innerHTML = `
    <div class="budget-inline-panel">
      <span class="budget-title">${days}일 예산</span>
      <div class="budget-inline-row">
        <div class="icon-box hotel"><span class="price">${acc}$</span></div>
        <div class="icon-box bus"><span class="price">${tra}$</span></div>
        <div class="icon-box food"><span class="price">${foo}$</span></div>
      </div>
      <span class="budget-total-label">항공권 제외</span>
      <span class="budget-total-amount">${tot}$</span>
    </div>
  `;
}

// ----------------- 관광지 / 맛집 / 호텔 불러오기 -----------------
async function loadPlacesForCountry(code) {
  const city = capitalData[code];
  if (!city) {
    document.getElementById('tourist').innerHTML = '<p>수도 정보 없음</p>';
    return;
  }
  const proxy = 'http://localhost:8080/';
  // 관광지
  let res = await fetch(proxy + `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(city + ' 관광지')}&language=ko&key=${googlePlacesKey}`);
  let data = await res.json();
  currentPlaces = data.status === 'OK' ? data.results : [];
  // 맛집
  res = await fetch(proxy + `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(city + ' 맛집')}&language=ko&key=${googlePlacesKey}`);
  data = await res.json();
  currentRestaurants = data.status === 'OK' ? data.results : [];
  // 호텔
  res = await fetch(proxy + `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(city + ' 호텔')}&language=ko&key=${googlePlacesKey}`);
  data = await res.json();
  currentHotels = data.status === 'OK' ? data.results : [];
  // 공항
   res = await fetch(proxy +
    `https://maps.googleapis.com/maps/api/place/textsearch/json?` +
    `query=${encodeURIComponent(city + ' 공항')}` +
    `&language=ko&key=${googlePlacesKey}`
  );
  data = await res.json();
  currentAirports = data.status === 'OK' ? data.results : [];
  
  // 초기 선택 초기화
  selectedPlaces = [];
  selectedRestaurants = [];
  showCategory('tourist');
}

// ----------------- 카테고리 전환 -----------------
['tourist','restaurant'].forEach(cat => {
  const btn = document.getElementById(`btn-${cat}`);
  if (btn) btn.addEventListener('click', () => showCategory(cat));
});
function showCategory(cat) {
  document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById(`btn-${cat}`);
  if (btn) btn.classList.add('active');
  const cont = document.getElementById('tourist');
  cont.innerHTML = '';
  const list = (cat === 'tourist' ? currentPlaces : currentRestaurants).slice(0, 9);
  list.forEach(place => {
    const card = document.createElement('div');
    card.className = 'place-card';
    const imgHtml = place.photos
      ? `<img src="https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${place.photos[0].photo_reference}&key=${googlePlacesKey}" alt="">`
      : '<div class="no-img">이미지 없음</div>';
    card.innerHTML = imgHtml + `
      <div class="place-info">
        <h4>${place.name}</h4>
        <p>${place.formatted_address||place.vicinity||''}</p>
        <p>⭐${place.rating||''}</p>
      </div>
    `;
    card.addEventListener('click', () => toggleSelection(cat, place, card));
    cont.appendChild(card);
  });
}
function toggleSelection(cat, place, card) {
  const arr = cat === 'tourist' ? selectedPlaces : selectedRestaurants;
  const idx = arr.findIndex(p => p.place_id === place.place_id);
  if (idx < 0) {
    arr.push(place);
    card.classList.add('selected');
  } else {
    arr.splice(idx, 1);
    card.classList.remove('selected');
  }
}

// ----------------- 좌측 패널 지도 초기화 -----------------
function initLeftMap(center) {
  map = new google.maps.Map(document.getElementById('left-map-container'), {
    center, zoom: 13
  });
  directionsService = new google.maps.DirectionsService();
  directionsRenderer = new google.maps.DirectionsRenderer({
    map,
    suppressMarkers: true,
    polylineOptions: { strokeColor: '#4285F4', strokeWeight: 5 }
  });
}

// ----------------- 마커 그리기 -----------------
function renderMarkersOnMap(items) {
  // 기존 마커 제거
  markers.forEach(m => m.setMap(null));
  markers = [];

  // 좌표 배열
  const coords = items.map(p =>
    p.geometry?.location ?? { lat: p.lat, lng: p.lng }
  );

  coords.forEach((loc, i) => {
    const num = i + 1;  // 1,2,3,...
    const info = items[i];

    // 1) 마커에 라벨 옵션 추가
    const marker = new google.maps.Marker({
      position: loc,
      map,
      label: {
        text: String(num),
        color: 'white',
        fontWeight: 'bold',
        fontSize: '14px'
      },
      // 원형 배경 아이콘을 쓰고 싶으면 이 방식도 가능
      // icon: {
      //   path: google.maps.SymbolPath.CIRCLE,
      //   scale: 16,
      //   fillColor: '#4285F4',
      //   fillOpacity: 1,
      //   strokeWeight: 0,
      //   labelOrigin: new google.maps.Point(8, 8)
      // }
    });
    markers.push(marker);

    // InfoWindow에도 번호를 넣어주면 더 직관적
    const infowindow = new google.maps.InfoWindow({
      content: `<strong>${num}. ${info.name}</strong><br>${info.address||''}`
    });
    marker.addListener('click', () => infowindow.open(map, marker));
  });

  // 지도 범위 재설정
  const bounds = coords.reduce(
    (b, loc) => b.extend(loc),
    new google.maps.LatLngBounds()
  );
  map.fitBounds(bounds);
}

// ----------------- 일정 생성 -----------------
function createDailyItinerary() {
  // 유저가 선택한 게 없으면 자동 검색된 리스트 사용
  const touristsRaw = selectedPlaces.length ? selectedPlaces : currentPlaces;
  const restaurantsRaw = selectedRestaurants.length ? selectedRestaurants : currentRestaurants;
  const hotel = currentHotels[0] || {};
  const airport = currentAirports[0] || null;
  const days = DAYS;

  // ⚠ geometry 정보 없는 장소 제외
  const tourists = sortByDistance(departure, touristsRaw.filter(p => p.geometry?.location));
  const restaurants = sortByDistance(departure, restaurantsRaw.filter(p => p.geometry?.location));

  if (tourists.length === 0 && restaurants.length === 0) {
    alert("추천 가능한 관광지/식당이 없습니다. 다른 국가를 선택하거나 직접 선택해주세요.");
    return [];
  }

  const itn = [];
  let t = 0, r = 0;

  for (let d = 1; d <= days; d++) {
    const day = [];

    if (d === 1) {
      // 인천 출발
      day.push(departure);

      // 도착지: 현지 공항 또는 호텔 좌표 fallback
      if (airport) {
        day.push({
          type: '도착',
          name: airport.name,
          lat: airport.geometry.location.lat,
          lng: airport.geometry.location.lng
        });
      } else {
        day.push({
          type: '도착',
          name: `${capitalData[lastSelectedId]}공항`,
          lat: hotel.geometry?.location.lat,
          lng: hotel.geometry?.location.lng
        });
      }
    }

    // 오전 식당
    if (restaurants.length) {
      const p = restaurants[r % restaurants.length]; r++;
      day.push(toPlaceObj(p, '식당'));
    }

    // 관광지
    if (tourists.length) {
      const p = tourists[t % tourists.length]; t++;
      day.push(toPlaceObj(p, '관광지'));
    }

    // 오후 식당
    if (restaurants.length) {
      const p = restaurants[r % restaurants.length]; r++;
      day.push(toPlaceObj(p, '식당'));
    }

    // 숙소
    if (hotel.name && d < days) {
      day.push({
        type: '숙소',
        name: hotel.name,
        address: hotel.formatted_address,
        lat: hotel.geometry.location.lat,
        lng: hotel.geometry.location.lng
      });
    }

    // 마지막 날 복귀
    if (d === days) {
      if (airport) {
        day.push({
          type: '공항출발',
          name: airport.name,
          lat: airport.geometry.location.lat,
          lng: airport.geometry.location.lng
        });
      } else {
        day.push({
          type: '공항출발',
          name: `${capitalData[lastSelectedId]}공항`,
          lat: hotel.geometry.location.lat,
          lng: hotel.geometry.location.lng
        });
      }

      day.push({
        type: '도착',
        name: departure.name,
        lat: departure.lat,
        lng: departure.lng
      });
    }

    itn.push({ day: d, places: day });
  }

  return itn;
}

// 🔍 가까운 거리 순 정렬
function sortByDistance(start, list) {
  const result = [];
  let current = { lat: start.lat, lng: start.lng };
  const remaining = [...list];

  while (remaining.length) {
    remaining.sort((a, b) => distance(current, a) - distance(current, b));
    const next = remaining.shift();
    result.push(next);
    current = {
      lat: next.geometry.location.lat,
      lng: next.geometry.location.lng
    };
  }

  return result;
}

// 거리 계산 (유클리드 거리)
function distance(a, b) {
  const dx = a.lat - b.geometry.location.lat;
  const dy = a.lng - b.geometry.location.lng;
  return Math.sqrt(dx * dx + dy * dy);
}

// 목적지 객체 포맷
function toPlaceObj(p, type) {
  return {
    type,
    name: p.name,
    address: p.formatted_address || p.vicinity,
    lat: p.geometry.location.lat,
    lng: p.geometry.location.lng
  };
}


// ----------------- Day 버튼 렌더링 -----------------
function renderDayButtons(itin) {
  let container = document.getElementById('day-buttons');
  if (!container) {
    container = document.createElement('div');
    container.id = 'day-buttons';
    container.style = 'display:flex; gap:6px; padding:8px;';
    const panel = document.getElementById('leftSidePanel');
    panel.insertBefore(container, document.getElementById('left-map-container'));
  }
  container.innerHTML = '';
  itin.forEach(({ day }) => {
    const btn = document.createElement('button');
    btn.textContent = `Day ${day}`;
    btn.onclick = () => showDayMarkers(day - 1);
    container.appendChild(btn);
  });
}





// ----------------- Day별 마커 표시 -----------------
function showDayMarkers(dayIdx) {
  const itin = window.globalItinerary;
  const items = itin[dayIdx].places;

  // 1) 지도 초기화
  initLeftMap({ lat: items[0].lat, lng: items[0].lng });

  // 2) 마커 렌더링
  renderMarkersOnMap(items);

  // 3) 일정 목록 갱신(원한다면)
  renderItinerary([ itin[dayIdx] ]);
}

// ----------------- 일정 생성 버튼 -----------------
document.getElementById('generate-itinerary-btn').addEventListener('click', () => {
  if (!lastSelectedId) {
    alert('먼저 국가를 선택해 주세요!');
    return;
  }
  const itin = createDailyItinerary();
  window.globalItinerary = itin;           // 전역으로 저장
  renderDayButtons(itin);                  // Day 버튼 추가
  // 전체 경로 (숙소/공항 제외)
  openLeftSidePanel();

// Day 1 마커 찍기
showDayMarkers(0);
});




// ----------------- 일정 렌더링 -----------------
function renderItinerary(itn) {
  const div = document.getElementById('itinerary-list');
  div.innerHTML = '<h3>추천 일정</h3><ol>';
  itn.forEach(d => {
    div.innerHTML += `<li><strong>Day ${d.day}</strong><ul>`;
    d.places.forEach(p => {
      div.innerHTML += `<li>${p.type}: ${p.name}${p.address ? ' ('+p.address+')':''}</li>`;
    });
    div.innerHTML += '</ul></li>';
  });
  div.innerHTML += '</ol>';
}

 function openLeftSidePanel() {
     const panel = document.getElementById('leftSidePanel');
     if (panel) panel.classList.add('open');
   }
  
   // (2) 좌측 패널 닫기
   document.getElementById('left-side-close').addEventListener('click', () => {
     const panel = document.getElementById('leftSidePanel');
    if (panel) panel.classList.remove('open');
   });



// ----------------- 예산 하이라이트 -----------------
function highlightCountriesByBudget(min, max, days) {
  for (const code in countryBudgetData) {
    const info = countryBudgetData[code];
    const tot = Math.round(
      info.accommodation * (days - 1) +
      info.transport     * days +
      info.food          * days
    );
    const el = document.getElementById(code.toLowerCase());
    if (!el) continue;

    // 초기화
    el.style.fill = '';
    el.style.stroke = '';
    el.style.strokeWidth = '';

    if (tot >= min && tot <= max) {
      el.style.fill = '#4CAF50';
      el.style.strokeWidth = '2px';
    }
  }
}

// 일정 저장 
document.getElementById('save-itinerary-btn')
  .addEventListener('click', async () => {
    const user = auth.currentUser;
    if (!user) {
      return alert('로그인해야 일정을 저장할 수 있어요.');
    }

    const itinerary = window.globalItinerary;
    if (!Array.isArray(itinerary) || !itinerary.length) {
      return alert('먼저 “일정 생성” 버튼을 눌러주세요.');
    }

    const name = prompt("일정 이름을 입력하세요", "일정 1");
    const displayName = name || `일정 ${today.getMonth() + 1}/${today.getDate()}`;

    try {
      // users/{uid}/itineraries 컬렉션 참조
      const itnColl = collection(db, 'users', user.uid, 'itineraries');

      const q = query(itnColl, where('displayName', '==', displayName));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        return alert('이미 동일한 이름의 일정이 있어요. 다른 이름을 입력해주세요.');
      }
      
      await addDoc(itnColl, {
        displayName,
        country: lastSelectedId,
        days: itinerary,
        updatedAt: serverTimestamp()
      });
      
      alert('✅ 일정이 저장되었습니다!');
    } catch (err) {
      console.error(err);
      alert('❌ 저장 중 오류가 발생했어요.');
    }
  });


  // ----------------- 후기 페이지 이동 -----------------
  document.getElementById("review-btn").addEventListener("click", () => {
    window.location.href = "/review.html"; // 후기 페이지 경로
  });

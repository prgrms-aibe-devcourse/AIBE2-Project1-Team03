// --- 전역 변수 및 데이터 로딩 ---
let lastSelectedId = null;
let input_min_budget = 1000;
let input_max_budget = 2500;
let input_days = 7;
let lasebudget = 0;

let touristData = {};
let countryBudgetData = {};
let capitalData = {};
const contry_id = [];

const apiKey = 'opentrip api';

// 수도 좌표 가져오기 함수
async function getCoordsByCapital(countryId) {
  const countryCode = countryId.toUpperCase();
  const capital = capitalData[countryCode];
  if (!capital) return null;

  const url = `https://api.opentripmap.com/0.1/en/places/geoname?name=${encodeURIComponent(capital)}&country=${countryCode}&apikey=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  if (data && data.lat && data.lon) {
    return { name: capital, lat: data.lat, lon: data.lon };
  }
  return null;
}

// --- 데이터 로드 ---
Promise.all([
  fetch('assets/tourist.json').then(res => res.json()),
  fetch('assets/Budget.json').then(res => res.json()),
  fetch('assets/capital.json').then(res => res.json()),
  fetch('assets/world-map.svg').then(res => res.text())
]).then(([tourist, budget, capital, svgText]) => {
  touristData = tourist;
  countryBudgetData = budget;
  capitalData = capital;
  document.getElementById('map-container').innerHTML = svgText;
  setupMapClickEvents();
  highlightCountriesByBudget(input_min_budget, input_max_budget, input_days);
}).catch(err => {
  console.error('데이터 로드 실패:', err);
});

// --- 지도 클릭 이벤트 연결 ---
function setupMapClickEvents() {
  const svg = document.querySelector('#map-container svg');
  if (!svg) return;
  const paths = svg.querySelectorAll('path');
  paths.forEach(path => {
    path.addEventListener('click', () => {
      const parentGroup = path.closest('g');
      const groupId = parentGroup ? parentGroup.id : null;
      if (!groupId) return;

      lastSelectedId = groupId.toUpperCase();
      close_slide();
      open_slide(groupId);
      Add_Weather(groupId);
      display_budget(groupId);
      renderTouristCardsByCountry(lastSelectedId);
      if (!contry_id.includes(groupId)) contry_id.push(groupId);
    });
  });
}

// --- 사이드패널 열기 ---
function open_slide(id) {
  const sidePanel = document.getElementById('sidePanel');
  sidePanel.classList.add('open');
  const selected = document.getElementById('contry_info');
  selected.innerHTML = '';
  const flagImg = document.createElement('img');
  flagImg.src = `https://flagcdn.com/w80/${id.toLowerCase()}.png`;
  flagImg.alt = `${id} flag`;
  selected.appendChild(flagImg);
  const countryNames = new Intl.DisplayNames(['ko'], { type: 'region' }).of(id.toUpperCase());
  const InputName = document.createElement('p');
  InputName.textContent = countryNames;
  selected.appendChild(InputName);
}

// --- 사이드 패널 닫기 ---
function close_slide() {
  document.getElementById('sidePanel').classList.remove('open');
  document.getElementById('contry_info').innerHTML = '';
  remove_weather();
  document.getElementById('tourist').innerHTML = '';
  document.getElementById('Budget').innerHTML = '';
}
document.getElementById('side-close').addEventListener('click', () => close_slide());

// --- 날씨 표시 ---
function Add_Weather(id){
  const apiKey = "weather-api";
  const countryCode = id.toUpperCase();
  const city = capitalData[countryCode];

  if(!city){
    document.getElementById('weather').innerHTML = '<p>날씨 정보를 찾을 수 없습니다.</p>';
    return;
  }

  const url = `https://api.openweathermap.org/data/2.5/weather?q=${city},${countryCode}&appid=${apiKey}&units=metric&lang=kr`;

  fetch(url)
    .then(response => response.json())
    .then(data => {
      const weather = data.weather[0].description;
      const iconCode = data.weather[0].icon;
      const temp = data.main.temp;
      const iconUrl = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
      const weatherBox = document.getElementById('weather');
      weatherBox.innerHTML = `
        <div class="weather-block">
          <div class="weather-row">날씨: <img src="${iconUrl}" alt="${weather}"></div>
          <div class="weather-row">현재온도: ${temp.toFixed(1)}°C</div>
        </div>
      `;
    })
    .catch(error => {
      document.getElementById('weather').innerHTML = '<p>날씨 정보를 불러올 수 없습니다.</p>';
    });
}

function remove_weather() {
  document.getElementById('weather').innerHTML = '';
}

// --- 예산 표시 ---
function display_budget(id) {
  const budgetBox = document.getElementById('Budget');
  const countryCode = id.toUpperCase();
  if (countryBudgetData[countryCode]) {
    const b = countryBudgetData[countryCode];
    const total_accommodation = Math.round(b.accommodation * (input_days - 1));
    const total_transport = Math.round(b.transport * input_days);
    const total_food = Math.round(b.food * input_days);
    const total_budget = total_accommodation + total_food + total_transport;
    lasebudget = total_budget;
    budgetBox.innerHTML = `
      <div class="budget-inline-panel">
        <span class="budget-title">${input_days}일 예산 :</span>
        <div class="budget-inline-row">
          <div class="icon-box hotel"><span class="icon"></span><span class="price">${total_accommodation.toLocaleString()} $</span></div>
          <div class="icon-box bus"><span class="icon"></span><span class="price">${total_transport.toLocaleString()} $</span></div>
          <div class="icon-box food"><span class="icon"></span><span class="price">${total_food.toLocaleString()} $</span></div>
        </div>
        <span class="budget-total-label">예상 금액</span>
        <span class="budget-total-amount">${total_budget.toLocaleString()} $</span>
      </div>
    `;
  } else {
    budgetBox.innerHTML = `<p>예산 정보가 없습니다.</p>`;
  }
}

// --- 왼쪽 패널 열기 ---
function openLeftSidePanel() {
  document.getElementById('leftSidePanel').classList.add('open');
  document.getElementById('itinerary-list').innerHTML = '';
  document.getElementById('left-map-container').innerHTML = '';
}
document.getElementById('left-side-close').addEventListener('click', () => {
  document.getElementById('leftSidePanel').classList.remove('open');
});

// --- 예산별 국가 강조 완 ---
function highlightCountriesByBudget(min, max, days) {
  for (const code in countryBudgetData) {
    const b = countryBudgetData[code];
    const total = b.accommodation * (days - 1) + b.transport * days + b.food * days;
    const el = document.getElementById(code.toLowerCase());
    if (!el) continue;
    if (total >= min && total <= max) {
      el.style.fill = '#4CAF50';
      el.style.strokeWidth = '2px';
    } else {
      el.style.fill = '';
      el.style.stroke = '';
      el.style.strokeWidth = '';
    }
  }
}

// --- 관광지 카드 렌더링 ---
function renderTouristCardsByCountry(id) {
  const spots = touristData[id.toUpperCase()] || [];
  if (spots.length === 0) {
    document.getElementById('tourist').innerHTML = '<p>여행지 정보가 없습니다.</p>';
    return;
  }
  renderTouristGrid(spots);
}

// --- 관광지 카드 그리드 ---
function renderTouristGrid(spots) {
  const container = document.getElementById('tourist');
  let html = '<div class="tourist-grid">';
  spots.forEach((spot, i) => {
    const img = spot.img || (spot.preview && spot.preview.source) || 'assets/no-image.png';
    const name = spot.name || '이름 없음';
    const desc = spot.desc || '';
    const lat = spot.lat || (spot.point && spot.point.lat) || '';
    const lng = spot.lng || (spot.point && spot.point.lon) || '';

    html += `
      <div class="tourist-card" data-idx="${i}" data-name="${name}" data-lat="${lat}" data-lng="${lng}" data-desc="${desc}">
        <img src="${img}" alt="${name}" />
        <div class="tourist-info">
          <h4>${name}</h4>
          <p>${desc}</p>
        </div>
      </div>
    `;
  });
  html += '</div>';
  container.innerHTML = html;

  const selectedSpots = new Set();
  const cards = container.querySelectorAll('.tourist-card');
  cards.forEach(card => {
    card.addEventListener('click', () => {
      const idx = card.getAttribute('data-idx');
      if (selectedSpots.has(idx)) {
        selectedSpots.delete(idx);
        card.classList.remove('selected');
      } else {
        selectedSpots.add(idx);
        card.classList.add('selected');
      }

      const selectedArray = Array.from(selectedSpots).map(i => {
        const c = cards[i];
        return {
          name: c.getAttribute('data-name'),
          lat: parseFloat(c.getAttribute('data-lat')),
          lng: parseFloat(c.getAttribute('data-lng')),
          desc: c.getAttribute('data-desc')
        };
      });
      renderSelectedMarkers(selectedArray);
    });
  });
}

// 선택된 관광지에서 좌표 반환
function getSelectedSpots() {
  return Array.from(document.querySelectorAll('.tourist-card.selected')).map(card => ({
    name: card.getAttribute('data-name'),
    lat: parseFloat(card.getAttribute('data-lat')),
    lng: parseFloat(card.getAttribute('data-lng')),
    desc: card.getAttribute('data-desc') || ''
  }));
}

// --- 일정 지도 렌더링 ---
let itineraryMap = null;
let itineraryMarkers = [];

function renderItineraryMap(spots, centerLatLng) {
  const mapDiv = document.getElementById('left-map-container');
  mapDiv.innerHTML = '<div id="left-map" style="width:100%;height:400px;"></div>';

  itineraryMap = new google.maps.Map(document.getElementById('left-map'), {
    center: centerLatLng,
    zoom: 7
  });

  itineraryMarkers.forEach(m => m.setMap(null));
  itineraryMarkers = [];

  spots.forEach(spot => {
    const marker = new google.maps.Marker({
      position: { lat: spot.lat, lng: spot.lng },
      map: itineraryMap,
      title: spot.name
    });
    itineraryMarkers.push(marker);
  });
}

// --- 일정 리스트 => 이게 문제 변경중---
function renderItineraryList(spots) {
  const listDiv = document.getElementById('itinerary-list');
  if (!spots || spots.length === 0) {
    listDiv.innerHTML = '<p>선택된 관광지가 없습니다.</p>';
    return;
  }
  let html = '<h3>내 일정</h3><ol>';
  spots.forEach((spot, idx) => {
    html += `<li>${idx + 1}일차: ${spot.name}${spot.desc ? ` - ${spot.desc}` : ''}</li>`;
  });
  html += '</ol>';
  listDiv.innerHTML = html;
}

// --- 일정 생성 버튼 ---!!!!!!!!!!!!!!!!!!!!!!!!
document.getElementById('generate-itinerary-btn').addEventListener('click', async () => {
  openLeftSidePanel();

  setTimeout(async () => {
    const selectedSpots = getSelectedSpots();
    //renderItineraryList(selectedSpots);

    const capitalCoords = await getCoordsByCapital(lastSelectedId);
    const center = capitalCoords ? { lat: capitalCoords.lat, lng: capitalCoords.lon } : (selectedSpots[0] || {});
    renderItineraryMap(selectedSpots, center);

  }, 500);
});
/*
// OpenAI로 일정 생성 함수 테스트 중 ---------------아래 실험중
async function generateItineraryWithOpenAI(spots, days, minBudget, maxBudget) {
  if (!spots || spots.length === 0) {
    return '선택된 관광지가 없습니다.';
  }

  // 관광지 목록 텍스트 생성
  const placesText = spots.map((spot, i) =>
    `${i + 1}. ${spot.name} (${spot.lat.toFixed(4)}, ${spot.lng.toFixed(4)})${spot.desc ? ' - ' + spot.desc : ''}`
  ).join('\n');

  // 프롬프트 작성
  const prompt = `
당신은 여행 일정 전문가입니다.
아래 조건을 참고하여 ${days}일간의 여행 일정을 추천해 주세요.
- 예산: ${minBudget}~${maxBudget} 달러
- 방문 가능한 관광지 목록:
${placesText}

각 날짜별로 방문할 관광지를 추천해 주세요.  
결과는 JSON 배열 형태로 아래 예시처럼 출력해 주세요:

[
  {"day": 1, "places": ["관광지1", "관광지2"]},
  {"day": 2, "places": ["관광지3", "관광지4"]}
]
`;

  // OpenAI API 호출
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}` // 본인 키로 교체
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1000,
      temperature: 0.7,
    })
  });

  const data = await response.json();
  if (data.choices && data.choices.length > 0) {
    return data.choices[0].message.content;
  } else {
    return '일정 생성에 실패했습니다.';
  }
}
// 3. 일정 리스트 렌더링 (AI 결과 파싱)
function renderItineraryListFromOpenAI(resultText) {
  const listDiv = document.getElementById('itinerary-list');
  try {
    const itinerary = JSON.parse(resultText);
    let html = '<h3>추천 일정</h3><ol>';
    itinerary.forEach(dayPlan => {
      html += `<li><strong>Day ${dayPlan.day}</strong><ul>`;
      dayPlan.places.forEach(place => {
        html += `<li>${place}</li>`;
      });
      html += '</ul></li>';
    });
    html += '</ol>';
    listDiv.innerHTML = html;
  } catch (e) {
    listDiv.innerHTML = `<pre>${resultText}</pre>`;
  }
}
*/
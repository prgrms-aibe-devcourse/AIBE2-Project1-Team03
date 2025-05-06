import { koToEnMap } from './capital-ko-map.js';

const apiKey = "AIzaSyA5ueda7Qmq4m_agO069YgX82NkEhJCzRY"; 
document.getElementById('search-btn').addEventListener('click', async () => {
  await loadPlaces();
});

async function loadPlaces() {
  const city = document.getElementById('city-input').value.trim();
  const category = document.getElementById('category-select').value;  // 🔥 추가

  if (!city) {
    showAlert("도시 이름을 입력하세요!");
    return;
  }

  try {
    const places = await searchPlaces(city, category);  // 🔥 category도 넘김
    renderPlaces(places);
  } catch (error) {
    console.error('에러 발생:', error);
  }
}

async function searchPlaces(city, category) {
  const corsProxy = "http://localhost:8080/";
  const query = `${city} ${category}`;
  const apiUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&language=ko&key=${apiKey}`;

  const response = await fetch(corsProxy + apiUrl);
  const data = await response.json();
  if (data.status !== "OK") {
    throw new Error(data.error_message || "장소 검색 실패");
  }

  // 🔥 한글 도시명 → 영어 변환
  const cityEng = koToEnMap[city] || city;
  const cityKo = city;

  const filteredResults = data.results.filter(place => {
  const addr = place.formatted_address || '';
  return addr.includes(cityEng) || addr.includes(cityKo);  // 🔥 둘 다 체크
});

  return filteredResults;
}

function renderPlaces(places) {
  const container = document.getElementById('places-container');
  container.innerHTML = '';

  places.forEach(place => {
    const card = document.createElement('div');
    card.className = 'place-card';

    const imageUrl = place.photos
      ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${place.photos[0].photo_reference}&key=${apiKey}`
      : 'https://via.placeholder.com/300x200?text=No+Image';

    card.innerHTML = `
      <img src="${imageUrl}" alt="${place.name}" class="place-img">
      <h3>${place.name}</h3>
      <p>⭐ ${place.rating || '정보 없음'}</p>
      <p>${place.formatted_address || ''}</p>
    `;

    card.addEventListener('click', () => {
      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}`;
      window.open(mapsUrl, '_blank');
    });

    container.appendChild(card);
  });
}


document.getElementById('city-input').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      loadPlaces();
    }
  });

  /*경고창 모달*/
  function showAlert(message) {
    document.getElementById('alert-modal-message').textContent = message;
    document.getElementById('alert-modal').style.display = 'flex';
  }
  document.getElementById('alert-modal-confirm-btn').addEventListener('click', () => {
    document.getElementById('alert-modal').style.display = 'none';
  });
const apiKey = "AIzaSyA5ueda7Qmq4m_agO069YgX82NkEhJCzRY"; 
document.getElementById('search-btn').addEventListener('click', async () => {
  await loadPlaces();
});

async function loadPlaces() {
  const city = document.getElementById('city-input').value.trim();
  if (!city) {
    alert("도시 이름을 입력하세요!");
    return;
  }

  try {
    const places = await searchPlaces(city);
    renderPlaces(places);
  } catch (error) {
    console.error('에러 발생:', error);
  }
}

async function searchPlaces(city) {
    const corsProxy = "http://localhost:8080/";
    const apiUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(city)} 관광지&language=ko&key=${apiKey}`;
    const response = await fetch(corsProxy + apiUrl);
  const data = await response.json();
  if (data.status !== "OK") {
    throw new Error(data.error_message || "장소 검색 실패");
  }
  return data.results;
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

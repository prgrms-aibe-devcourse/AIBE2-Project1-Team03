const infoPanel = document.getElementById('info-panel');
const svgObject = document.getElementById('world-map');

let selectedBudget = '';
let selectedStyle = '';
let selectedCountry = '';

function getCountryName(id) {
  const countryNames = {
    'KR': '대한민국',
    'JP': '일본',
    'FR': '프랑스'
  }; // 일단 3개 국가만 넣어봄
  return countryNames[id] || 'Unknown';
}

function getRecommendation(countryId, budget, style) {
  return `${getCountryName(countryId)}에서 ${budget} 예산으로 ${style} 여행을 즐겨보세요! 😊`;
}

function openPanel() {
  infoPanel.classList.add('active');
}

function closePanel() {
  infoPanel.classList.remove('active');
  
}

// 🟠 ⭐ 여기 수정된 부분! 모든 ID가 있는 요소 초기화!
function highlightRecommendedCountries(countryIds) {
    const svgDoc = svgObject.contentDocument;
  
    if (!svgDoc) {
      console.error("SVG document not loaded yet!");
      return;
    }
  
    const allCountries = svgDoc.querySelectorAll('[id]');
    allCountries.forEach(el => el.style.fill = '#ffffff')
  
    countryIds.forEach(id => {
      const country = svgDoc.getElementById(id);
      if (country) {
        country.style.fill = '#F8B195';
      } else {
        console.warn(`Country ID not found: ${id}`);
      }
    });
  }

// 🟢 나라 클릭 시 동작
svgObject.addEventListener('load', () => {
  const svgDoc = svgObject.contentDocument;
  const countries = ['KR', 'JP', 'FR'];  // 현재 등록된 나라들
  const paths = svgDoc.querySelectorAll('path');
  paths.forEach(path => {
    path.style.fill = '#ffffff';               // 흰색 채움
    path.style.stroke = '#333333';             // 검정 테두리
    path.style.strokeWidth = '0.5';
  });

  countries.forEach(countryId => {
    const countryElement = svgDoc.getElementById(countryId);
    if (countryElement) {
      countryElement.addEventListener('mouseover', () => {
        countryElement.style.fill = '#aad4c7';
      });
      countryElement.addEventListener('mouseout', () => {
        countryElement.style.fill = '#ffffff';
      });
      countryElement.addEventListener('click', () => {
        selectedCountry = countryId;
        selectedBudget = '';
        selectedStyle = '';
        renderSelectionPanel();
        openPanel();
      });
    }
  });
});

function renderSelectionPanel() {
  infoPanel.innerHTML = `
    <h2>${getCountryName(selectedCountry)}</h2>
    <p>예산을 선택하세요:</p>
    <button class="budget-btn" data-budget="100만원 이하">100만원 이하</button>
    <button class="budget-btn" data-budget="100~300만원">100~300만원</button>
    <button class="budget-btn" data-budget="300만원 이상">300만원 이상</button>

    <p>여행 스타일을 선택하세요:</p>
    <button class="style-btn" data-style="힐링">힐링</button>
    <button class="style-btn" data-style="액티비티">액티비티</button>
    <button class="style-btn" data-style="문화탐방">문화탐방</button>
    <button class="style-btn" data-style="맛집투어">맛집투어</button>

    <div id="recommendation-result"></div>
    <button onclick="closePanel()" style="margin-top:20px; background-color: #F67280; color:white; border:none; padding:8px 16px; border-radius:10px; cursor:pointer;">닫기</button>
  `;

  document.querySelectorAll('.budget-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedBudget = btn.dataset.budget;
      showRecommendation();
    });
  });

  document.querySelectorAll('.style-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedStyle = btn.dataset.style;
      showRecommendation();
    });
  });
}

function showRecommendation() {
  const resultDiv = document.getElementById('recommendation-result');
  if (selectedBudget && selectedStyle) {
    const message = getRecommendation(selectedCountry, selectedBudget, selectedStyle);
    resultDiv.innerHTML = `<p style="margin-top: 20px; color: #5a7d7c;">${message}</p>`;
  }
}

/*
/////////////////////////////
// 🟣 챗봇 추천 기능 (예산 + 스타일 → 추천 국가 색칠)
/////////////////////////////
let chatbotSelectedBudget = '';
let chatbotSelectedStyle = '';

const chatbotRecommendations = {
  low: {
    healing: ['JP'],
    activity: ['KR'],
    culture: ['FR'],
    food: ['JP']
  },
  mid: {
    healing: ['KR'],
    activity: ['FR'],
    culture: ['JP'],
    food: ['FR']
  },
  high: {
    healing: ['FR'],
    activity: ['JP'],
    culture: ['KR'],
    food: ['JP']
  }
};

function checkChatbotRecommendation() {
  if (chatbotSelectedBudget && chatbotSelectedStyle) {
    const result = chatbotRecommendations[chatbotSelectedBudget][chatbotSelectedStyle];
    highlightRecommendedCountries(result);

    const resultText = document.getElementById('recommendation-message');
    resultText.innerHTML = `추천 여행지: ${result.map(getCountryName).join(', ')} ✈️`;
  }
}

document.querySelectorAll('.budget').forEach(btn => {
  btn.addEventListener('click', () => {
    chatbotSelectedBudget = btn.dataset.budget;
    checkChatbotRecommendation();
  });
});

document.querySelectorAll('.style').forEach(btn => {
  btn.addEventListener('click', () => {
    chatbotSelectedStyle = btn.dataset.style;
    checkChatbotRecommendation();
  });
});

/////////////////////////////
// 🟢 챗봇 열기/닫기 기능
/////////////////////////////
const chatbotBtn = document.getElementById('chatbot-btn');
const chatbotWindow = document.getElementById('chatbot-window');

chatbotBtn.addEventListener('click', () => {
  chatbotWindow.classList.toggle('hidden');
});
*/


// DOM이 로드된 후 Litepicker 적용
window.addEventListener('DOMContentLoaded', () => {
  const picker = new Litepicker({
    element: document.getElementById('date-range'),
    singleMode: false,         // 한 개가 아니라 두 날짜를 선택하게
    format: 'YYYY-MM-DD',      // 날짜 포맷
  });
});

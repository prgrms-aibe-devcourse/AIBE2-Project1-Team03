
// ----------------- schedules 기반 최신 통합본 -----------------

// 여러 일정(탭)을 저장하는 객체
const schedules = {};
// 현재 보고 있는 일정 이름
let currentSchedule = "";

// 주요 DOM 요소 연결
const tabsContainer = document.getElementById('tabs-container');
const daysContainer = document.getElementById('days-container');
const daySelect = document.getElementById('day-select');
const destinationInput = document.getElementById('destination-input');
const addButton = document.getElementById('add-button');
const addDayButton = document.getElementById('add-day-button');
const saveButton = document.getElementById('save-button');
const scheduleNameToDocId = {}; // 일정이름 → Firestore 문서 ID 매핑

// Firestore 인스턴스 생성
const db = firebase.firestore();

// Firestore 저장 함수 만들기
async function saveToFirestore(scheduleName) {
  const user = firebase.auth().currentUser;
  if (!user) return;

  const schedule = schedules[scheduleName];
  if (!schedule) return;

  // 🔢 Day 데이터 정리
  const days = schedule.daysOrder.map(day => ({
    day: parseInt(day.replace('Day ', '')),
    places: schedule.daysData[day]
  }));

  // 🔢 총 비용 계산
  const totalCost = schedule.daysOrder.reduce((sum, day) => {
    return sum + schedule.daysData[day].reduce((dSum, place) => dSum + Number(place.cost || 0), 0);
  }, 0);

  const docId = scheduleNameToDocId[scheduleName] || scheduleName;
  const docRef = db.collection("users").doc(user.uid).collection("itineraries").doc(docId);

  const data = {
    displayName: scheduleName,
    days: days,
    totalCost: totalCost, // ✅ 저장!
    region: schedule.region || '도쿄',
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  await docRef.set(data, { merge: true });
}

// 로그인 시 일정 로드
firebase.auth().onAuthStateChanged(user => {
  if (!user) {
    window.location.replace("login.html");
  } else {
    document.body.hidden = false;
    loadItinerary(user.uid);
  }
});

// Firestore에서 일정 불러오기
async function loadItinerary(uid) {
  try {
    const snapshot = await db
      .collection("users")
      .doc(uid)
      .collection("itineraries")
      .orderBy("updatedAt", "asc")
      .get();
    if (snapshot.empty) {
      // 기본 일정 생성
      schedules["일정 1"] = {
        daysData: { "Day 1": [] },
        daysOrder: ["Day 1"],
        dayCount: 1
      };
      currentSchedule = "일정 1";
    } else {
      let count = 1;

      snapshot.forEach(doc => {
        const data = doc.data();
        const displayName = data.displayName || `일정 ${count++}`;
        scheduleNameToDocId[displayName] = doc.id;

        const days = {};
        const order = [];

        if (data.days) {
          data.days.forEach(dayObj => {
            const dayName = `Day ${dayObj.day}`;
            order.push(dayName);
            days[dayName] = dayObj.places || [];
          });

          schedules[displayName] = {
            daysData: days,
            daysOrder: order,
            dayCount: order.length,
            region: data.region || '도쿄' // ✅ region도 저장
          };
          
          currentSchedule = displayName;
        }
      });
    }

    renderTabs();
    renderDays();

  } catch (error) {
    console.error("일정 불러오기 오류:", error);
    alert("일정을 불러오는 중 오류가 발생했습니다.");
  }
}

// 드래그 기능에서 사용되는 전역 변수
let draggedItem = null;
let draggedSourceDay = null;

// -------------- 탭 렌더링 -------------
// 일정 목록 탭 UI를 다시 그림
function renderTabs() {
  tabsContainer.innerHTML = '';

  const tabNames = Object.keys(schedules).filter(name => name !== "나의 일정");
  tabNames.forEach(scheduleName => {
    const tab = document.createElement('button');
    tab.className = 'tab';

    const nameSpan = document.createElement('span');
    nameSpan.textContent = scheduleName;
    nameSpan.style.flexGrow = '1';

    // 일정 탭 전환
    nameSpan.onclick = () => switchTab(scheduleName);

    const closeBtn = document.createElement('span');
    closeBtn.className = 'tab-close';
    closeBtn.textContent = '✖';
    closeBtn.onclick = async (e) => {
      e.stopPropagation();
      if (confirm(`'${scheduleName}' 일정을 삭제할까요?`)) {
        delete schedules[scheduleName];

        const user = firebase.auth().currentUser;
        if (user) {
          const docId = scheduleNameToDocId[scheduleName] || scheduleName;
          await db.collection("users")
                  .doc(user.uid)
                  .collection("itineraries")
                  .doc(docId)
                  .delete();
        }

        const remaining = Object.keys(schedules).filter(n => n !== "나의 일정");
        currentSchedule = remaining.length > 0 ? remaining[0] : "";
        renderTabs();
        renderDays();
      }
    };

    tab.appendChild(nameSpan);
    tab.appendChild(closeBtn);

    if (scheduleName === currentSchedule) {
      tab.classList.add('active');
    }

    tabsContainer.appendChild(tab);
  });

  // ➤ 오른쪽 끝 탭 묶음
  const rightGroup = document.createElement('div');
  rightGroup.className = 'tab-group-right';

  // '일정 추가' 탭 버튼
  const addTab = document.createElement('button');
  addTab.className = 'tab add-tab';
  addTab.textContent = '일정 추가';
  addTab.onclick = addNewSchedule;

  // 나의 일정 탭 (삭제 불가)
  const myTab = document.createElement('button');
  myTab.className = 'tab my-schedule-tab';
  myTab.textContent = '나의 일정';
  myTab.onclick = async () => {
    const user = firebase.auth().currentUser;
    const ref = db.collection("users").doc(user.uid).collection("itineraries").doc("나의 일정");
    const snap = await ref.get();
    if (!snap.exists) {
      alert("'나의 일정'이 존재하지 않습니다. 먼저 저장해주세요.");
      return;
    }
    switchTab("나의 일정");
  };

  if (currentSchedule === "나의 일정") {
    myTab.classList.add('active');
  }

  rightGroup.appendChild(addTab);
  rightGroup.appendChild(myTab);
  tabsContainer.appendChild(rightGroup);
}

// '?schedule=나의 일정'이 포함되어 있으면 "나의 일정" 탭을 자동으로 선택
function getURLScheduleParam() {
  const params = new URLSearchParams(window.location.search);
  return params.get('schedule');
}

const urlSchedule = getURLScheduleParam();
if (urlSchedule && schedules[urlSchedule]) {
  currentSchedule = urlSchedule;
}

// -------------- 탭 전환 -------------
// 특정 탭으로 이동
function switchTab(scheduleName) {
  currentSchedule = scheduleName;
  renderTabs();
  renderDays();
  const region = schedules[scheduleName]?.region || '도쿄'; // ✅ 선택된 일정의 region
  const allPlaces = Object.values(schedules[scheduleName]?.daysData || {}).flat();

  if (scheduleName === "나의 일정") {
    const { daysData } = schedules["나의 일정"];
    const allPlaces = Object.values(daysData).flat();
    document.getElementById("my-schedule-map").style.display = "block";
  
    getCoordinatesFromPlaces(allPlaces, region).then(coords => {
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
    
      const center = regionCenterMap[region] || { lat: 35.6895, lng: 139.6917 }; // fallback
      initMyMap(center);  // ✅ 지도 중심을 region에 맞게
      renderMyMarkers(coords);
    });
  } else {
    document.getElementById("my-schedule-map").style.display = "none";
  }
}

// -------------- 일정 추가 -------------
// 새 일정(탭) 생성
async function addNewSchedule() {
  let newName = prompt("새 일정 이름을 입력하세요:");
  if (!newName) return;

  while (schedules[newName]) {
    newName = prompt(`"${newName}"은 이미 존재합니다. 다른 이름을 입력하세요:`);
    if (!newName) return;
  }

  schedules[newName] = {
    daysData: { "Day 1": [] },
    daysOrder: ["Day 1"],
    dayCount: 1
  };

  const user = firebase.auth().currentUser;
  if (user) {
    const docRef = db.collection("users").doc(user.uid).collection("itineraries").doc(); // 자동 ID
    await docRef.set({
      displayName: newName,
      days: [],
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    // 🔁 저장 직후 updatedAt 포함 여부를 확인하려면 get()을 한 번 더!
    const savedDoc = await docRef.get();
    const savedData = savedDoc.data();
    if (!savedData.updatedAt) {
      console.warn(`updatedAt 서버 적용 전 상태. 서버 반영까지 약간 지연될 수 있음.`);
    }

    scheduleNameToDocId[newName] = docRef.id;
  }

  // ⏱ set() 완료 후에 탭 전환
  switchTab(newName);
}

// -------------- Day 목록 렌더링 -------------
// 현재 일정의 Day들을 화면에 출력
function renderDays() {
  const { daysData, daysOrder } = schedules[currentSchedule];
  daysContainer.innerHTML = '';
  daySelect.innerHTML = '';
  // 🔽 총 비용 표시 부분 추가
  const total = getTotalCost();
  const totalDiv = document.createElement('div');
  totalDiv.className = 'total-cost-display';
  totalDiv.textContent = `💰 총 예상 비용: $${total.toLocaleString()}`;
  daysContainer.appendChild(totalDiv);

  daysOrder.forEach(day => {
    const dayDiv = createDayElement(day);
    daysContainer.appendChild(dayDiv);

    // select option에도 추가
    const option = document.createElement('option');
    option.value = day;
    option.textContent = day;
    daySelect.appendChild(option);
  });
}


function getTotalCost() {
  const schedule = schedules[currentSchedule];
  return schedule.daysOrder.reduce((sum, day) => {
    return sum + schedule.daysData[day].reduce((dSum, p) => dSum + Number(p.cost || 0), 0);
  }, 0);
}


// -------------- Day 박스 구성 -------------
// Day 하나를 구성하는 블럭 생성
function createDayElement(day) {
  const dayDiv = document.createElement('div');
  dayDiv.className = 'day';

  const dayHeader = document.createElement('div');
  dayHeader.className = 'day-header';

  const leftSide = document.createElement('div');
  leftSide.style.display = 'flex';
  leftSide.style.alignItems = 'center';

  const dayHandle = document.createElement('div');
  dayHandle.className = 'day-handle';
  dayHandle.textContent = '•';
  dayHandle.draggable = true;
  dayHandle.addEventListener('dragstart', () => { draggedItem = dayDiv; });

  const dayTitle = document.createElement('h2');
  dayTitle.textContent = day;
  dayTitle.textContent = `${day} (일일 예상 비용: $${getDayTotalCost(day)})`;

  leftSide.appendChild(dayHandle);
  leftSide.appendChild(dayTitle);

  const dayButtons = createDayButtons(day);

  // 지도 버튼 추가
  const mapBtn = document.createElement('button');
  mapBtn.textContent = '지도 보기';
  mapBtn.className = 'map-button';
  mapBtn.style.marginLeft = '12px';
  mapBtn.onclick = () => showMapForDay(day);

  dayButtons.appendChild(mapBtn);

  dayHeader.appendChild(leftSide);
  dayHeader.appendChild(dayButtons);
  dayDiv.appendChild(dayHeader);

  // 목적지들 렌더링
  const { daysData } = schedules[currentSchedule];
  daysData[day].forEach(dest => {
    const destDiv = createDestinationElement(day, dest);
    dayDiv.appendChild(destDiv);
  });

  return dayDiv;
}


function getDayTotalCost(day) {
  const places = schedules[currentSchedule].daysData[day];
  return places.reduce((sum, d) => {
    const cost = Number(d.cost);
    return sum + (isNaN(cost) ? 0 : cost);
  }, 0);
}




// -------------- Day 수정/삭제 버튼 -------------
function createDayButtons(day) {
  const container = document.createElement('div');
  container.className = 'day-buttons';

  const editBtn = createButton('수정', 'edit', () => editDayName(day));
  const deleteBtn = createButton('삭제', 'delete', () => deleteDay(day));

  container.appendChild(editBtn);
  container.appendChild(deleteBtn);
  return container;
}

// -------------- 목적지 박스 생성 -------------
// 한 목적지 항목 UI 구성
function createDestinationElement(day, dest) {
  const destDiv = document.createElement('div');
  destDiv.className = 'destination';

  const handle = document.createElement('div');
  handle.className = 'drag-handle';
  handle.textContent = '☰';
  handle.draggable = true;
  handle.addEventListener('dragstart', (e) => {
    draggedItem = destDiv;
    draggedSourceDay = destDiv.closest('.day')?.querySelector('h2')?.textContent?.split(' (')[0];
    destDiv.dataset.name = dest.name;
  });

  const contentWrapper = document.createElement('div');
  contentWrapper.className = 'destination-info';

  const nameRow = document.createElement('div');
  nameRow.className = 'destination-name-row';

  const contentDiv = document.createElement('div');
  contentDiv.className = 'destination-content';

  const nameDiv = document.createElement('div');
  nameDiv.className = 'destination-name';

  const costDiv = document.createElement('div');
  costDiv.className = 'destination-cost';
  const cost = isNaN(Number(dest.cost)) ? 0 : Number(dest.cost);
  costDiv.textContent = `예상비용: $${cost.toLocaleString()}`;
contentWrapper.appendChild(costDiv);

  if (dest.type) {
    const tagBadge = document.createElement('span');
    tagBadge.className = `type-badge ${getTypeClass(dest.type)}`;
    tagBadge.textContent = dest.type;
    nameDiv.appendChild(tagBadge);
  }

  function getTypeClass(type) {
    switch (type) {
      case "오전": return "type-morning";
      case "점심": return "type-lunch";
      case "오후": return "type-afternoon";
      case "저녁": return "type-evening";
      case "숙소": return "type-hotel";
      case "공항": return "type-airport";
      default: return "";
    }
  }

  const nameText = document.createElement('span');
  nameText.textContent = dest.name;
  nameDiv.appendChild(nameText);

  nameRow.appendChild(nameDiv);

  const addressDiv = document.createElement('small');
  addressDiv.className = 'destination-address';
  addressDiv.textContent = dest.address || '';

  contentWrapper.appendChild(nameRow);

  const descDiv = document.createElement('div');
  descDiv.className = 'destination-description';
  descDiv.textContent = dest.description || '';
  contentWrapper.appendChild(descDiv);

  contentWrapper.appendChild(addressDiv);

  const buttonsDiv = createDestinationButtons(day, dest);

  destDiv.appendChild(handle);
  destDiv.appendChild(contentWrapper);
  destDiv.appendChild(buttonsDiv);

  return destDiv;
}

// -------------- 목적지 수정/삭제 버튼 -------------
function createDestinationButtons(day, dest) {
  const container = document.createElement('div');
  container.className = 'destination-buttons';

  const menuWrapper = document.createElement('div');
  menuWrapper.className = 'dropdown-menu-wrapper';

  const menuToggle = document.createElement('button');
  menuToggle.className = 'menu-toggle';
  menuToggle.textContent = '︙';

  const dropdown = document.createElement('div');
  dropdown.className = 'dropdown-menu';
  dropdown.innerHTML = `
    <div class="menu-item">수정</div>
    <div class="menu-item">삭제</div>
  `;

  // 클릭 이벤트 등록
  dropdown.querySelector('.menu-item:nth-child(1)').onclick = () => editDestination(day, dest);
  dropdown.querySelector('.menu-item:nth-child(2)').onclick = () => deleteDestination(day, dest);

  // 열고 닫기
  menuToggle.onclick = (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('open');
  };

  // 외부 클릭 시 닫기
  document.addEventListener('click', () => {
    dropdown.classList.remove('open');
  });

  menuWrapper.appendChild(menuToggle);
  menuWrapper.appendChild(dropdown);
  container.appendChild(menuWrapper);
  return container;
}

// -------------- 버튼 생성 도우미 -------------
function createButton(text, className, onClick) {
  const btn = document.createElement('button');
  btn.textContent = text;
  btn.className = className;
  btn.onclick = onClick;
  return btn;
}

// -------------- 추가/수정/삭제 -------------
// 목적지 추가
function addDestination() {
  const day = daySelect.value;
  const name = destinationInput.value.trim();
  if (!name) return;

  const type = prompt('시간대 태그를 입력하세요 (오전, 점심, 오후, 저녁, 숙소, 공항):', '') || '';
  const description = prompt('장소에 대한 설명을 입력하세요:', '') || '';
  const cost = prompt('비용을 입력하세요 (숫자만):', '') || '';
  schedules[currentSchedule].daysData[day].push({ name, type, description, cost });
  destinationInput.value = '';
  renderDays();
  saveToFirestore(currentSchedule);
}

// Day 추가
function addDay() {
  const schedule = schedules[currentSchedule];

/*  schedule.dayCount++;
  const newDay = `Day ${schedule.dayCount}`;
  schedule.daysData[newDay] = [];
  schedule.daysOrder.push(newDay);
  renderDays(); */
  
  // 이미 존재하는 Day 이름들을 숫자로 추출
  const usedNumbers = schedule.daysOrder
    .map(name => parseInt(name.replace('Day ', '')))
    .filter(n => !isNaN(n))
    .sort((a, b) => a - b);

  // 비어 있는 번호 찾기
  let nextNumber = 1;
  for (let i = 0; i < usedNumbers.length; i++) {
    if (usedNumbers[i] !== nextNumber) break;
    nextNumber++;
  }

  const newDay = `Day ${nextNumber}`;
  schedule.daysData[newDay] = [];
  schedule.daysOrder.push(newDay);
  renderDays();

}

// Day 이름 수정
function editDayName(oldName) {
  const newName = prompt('Day 이름 수정:', oldName);
  if (newName && newName !== oldName) {
    const schedule = schedules[currentSchedule];
    schedule.daysData[newName] = schedule.daysData[oldName];
    delete schedule.daysData[oldName];
    const idx = schedule.daysOrder.indexOf(oldName);
    if (idx !== -1) schedule.daysOrder[idx] = newName;
    renderDays();
  }
}

// Day 삭제
function deleteDay(day) {
  if (confirm(`${day}을 삭제할까요?`)) {
    const schedule = schedules[currentSchedule];
    delete schedule.daysData[day];
    schedule.daysOrder = schedule.daysOrder.filter(d => d !== day);
    renderDays();
  }
}

// 목적지 수정
function editDestination(day, dest) {
  const newName = prompt('장소 이름 수정:', dest.name);
  if (newName) dest.name = newName;

  const newTag = prompt('시간대 태그 수정 (오전, 점심, 오후, 저녁, 숙소, 공항):', dest.type);
  if (newTag) dest.type = newTag;

  const newDesc = prompt('설명 수정:', dest.description || '');
  if (newDesc !== null) dest.description = newDesc;

  const newCost = prompt('비용 수정 ($):', dest.cost || '0');
  if (newCost !== null && !isNaN(Number(newCost))) {
    dest.cost = Number(newCost);
  }

  updateTotalCostForDay(day);

  renderDays();
  saveToFirestore(currentSchedule);
}

// 총 예상 비용 합계 계산
function updateTotalCostForDay(day) {
  const schedule = schedules[currentSchedule];
  const total = schedule.daysData[day].reduce((sum, d) => {
    const cost = Number(d.cost);
    return sum + (isNaN(cost) ? 0 : cost);
  }, 0);
  schedule.daysData[day].totalCost = total; // UI용
}



// 목적지 삭제
function deleteDestination(day, dest) {
  const schedule = schedules[currentSchedule];
  const idx = schedule.daysData[day].indexOf(dest);
  if (idx > -1) {
    schedule.daysData[day].splice(idx, 1);
    renderDays();
  }
}

// -------------- 드래그 앤 드롭 기능 -------------
document.addEventListener('dragover', e => e.preventDefault());
document.addEventListener('drop', e => {
  e.preventDefault();
  if (!draggedItem) return;

  const targetDayDiv = e.target.closest('.day');
  const targetDestDiv = e.target.closest('.destination');

  if (draggedItem.classList.contains('day') && targetDayDiv) {
    moveDay(draggedItem.querySelector('h2').textContent, targetDayDiv.querySelector('h2').textContent);
  } else if (draggedItem.classList.contains('destination')) {
    moveDestination(targetDestDiv, targetDayDiv);
  }

  draggedItem = null;
  draggedSourceDay = null;
});

// Day 순서 변경
function moveDay(fromDay, toDay) {
  const schedule = schedules[currentSchedule];
  const fromIdx = schedule.daysOrder.indexOf(fromDay);
  const toIdx = schedule.daysOrder.indexOf(toDay);
  if (fromIdx !== -1 && toIdx !== -1) {
    schedule.daysOrder.splice(fromIdx, 1);
    schedule.daysOrder.splice(toIdx + 1, 0, fromDay);
    renderDays();
  }
}

// 목적지 순서 변경
function moveDestination(targetDestDiv, targetDayDiv) {
  if (!draggedItem || !draggedSourceDay) return;

  const schedule = schedules[currentSchedule];
  const sourceList = schedule.daysData[draggedSourceDay];
  if (!sourceList) return;

  const draggedName = draggedItem.dataset.name;
  const draggedData = sourceList.find(d => d.name === draggedName);
  if (!draggedData) return;

  const draggedIndex = sourceList.indexOf(draggedData);
  if (draggedIndex > -1) sourceList.splice(draggedIndex, 1);

  let targetDay = targetDayDiv?.querySelector('h2')?.textContent?.split(' (')[0] || draggedSourceDay;
  if (!schedule.daysData[targetDay]) {
    schedule.daysData[targetDay] = [];
  }

  const targetList = schedule.daysData[targetDay];

  if (targetDestDiv) {
    const targetDataName = targetDestDiv.querySelector('.destination-name span')?.textContent;
    const targetData = targetList.find(d => d.name === targetDataName);
    const targetIndex = targetList.indexOf(targetData);
    targetList.splice((targetIndex > -1 ? targetIndex + 1 : targetList.length), 0, draggedData);
  } else {
    targetList.push(draggedData);
  }

  renderDays();

  // ✅ 여기 추가!
  saveToFirestore(currentSchedule);
}
// 드래그 시작
document.addEventListener('dragstart', (e) => {
  const item = e.target.closest('.destination, .day');
  if (!item) return;

  draggedItem = item;
  draggedItem.classList.add('dragging');

  if (item.classList.contains('destination')) {
    draggedSourceDay = item.closest('.day')?.querySelector('h2')?.textContent?.split(' (')[0];
  }
});


// 드래그 끝났을 때
document.addEventListener('dragend', (e) => {
  if (draggedItem) {
    draggedItem.classList.remove('dragging');
    draggedItem = null;
    draggedSourceDay = null;
  }
});

// 드래그 오버할 때 (드롭 가능한 곳 표시)
document.addEventListener('dragover', (e) => {
  e.preventDefault();
  const item = e.target.closest('.destination, .day');
  if (item) {
    item.classList.add('drag-over');
  }
});

// 드래그가 끝나면 드래그 오버 효과 제거
document.addEventListener('dragleave', (e) => {
  const item = e.target.closest('.destination, .day');
  if (item) {
    item.classList.remove('drag-over');
  }
});

// 드랍했을 때
document.addEventListener('drop', (e) => {
  e.preventDefault();
  const targetDayDiv = e.target.closest('.day');
  const targetDestDiv = e.target.closest('.destination');

  if (draggedItem && draggedItem.classList.contains('day') && targetDayDiv) {
    moveDay(draggedItem.querySelector('h2').textContent, targetDayDiv.querySelector('h2').textContent);
  } else if (draggedItem && draggedItem.classList.contains('destination')) {
    moveDestination(targetDestDiv, targetDayDiv);
  }

  const allDragOver = document.querySelectorAll('.drag-over');
  allDragOver.forEach(el => el.classList.remove('drag-over'));

  if (draggedItem) {
    draggedItem.classList.remove('dragging');
    draggedItem = null;
    draggedSourceDay = null;
  }
});

// -------------- 저장 -------------
saveButton.addEventListener('click', saveSchedule);

// 저장: LocalStorage에 전체 일정 저장
function saveSchedule() {
  // 현재 일정 복사해서 나의 일정에 저장
  if (!currentSchedule) return;

  // Firestore에 저장
  saveToFirestore(currentSchedule);

  alert("현재 일정이 저장되었습니다.");
  renderTabs();
}

// 나의 일정 지정 로직 추가
document.getElementById('assign-my-schedule').addEventListener('click', async () => {
  if (!currentSchedule) return;

  const currentData = JSON.parse(JSON.stringify(schedules[currentSchedule]));
  schedules["나의 일정"] = currentData;

  await saveToFirestore("나의 일정");

  alert(`"${currentSchedule}" 일정이 '나의 일정'에 복사되었습니다.`);
  renderTabs();
});

// '나의 일정' 클릭 시 Firestore에 없으면 alert
const myTab = document.createElement('button');
myTab.className = 'tab my-schedule-tab';
myTab.textContent = '나의 일정';
myTab.onclick = async () => {
  const user = firebase.auth().currentUser;
  const ref = db.collection("users").doc(user.uid).collection("itineraries").doc("나의 일정");
  const snap = await ref.get();
  if (!snap.exists) {
    alert("'나의 일정'이 존재하지 않습니다. 먼저 지정해주세요.");
    return;
  }

  switchTab("나의 일정");
};

// -------------- 초기화 -------------
function initialize() {
  schedules["일정 1"] = { daysData: { "Day 1": [], "Day 2": [] }, daysOrder: ["Day 1", "Day 2"], dayCount: 2 };
  currentSchedule = "일정 1";
  renderTabs();
  renderDays();
}

addButton.addEventListener('click', addDestination);
addDayButton.addEventListener('click', addDay);














let myScheduleMap;

function initMyMap(center = { lat: 34.0522, lng: -118.2437 }) {
  myScheduleMap = new google.maps.Map(document.getElementById("my-schedule-map"), {
    center,
    zoom: 12
  });
}

function renderMyMarkers(places) {
  if (!myScheduleMap) initMyMap();

  const bounds = new google.maps.LatLngBounds();

  places.forEach((place, index) => {
    const marker = new google.maps.Marker({
      position: { lat: place.lat, lng: place.lng },
      map: myScheduleMap,
      label: `${index + 1}`,
      title: place.name
    });

    const infoWindow = new google.maps.InfoWindow({
      content: `<strong>${index + 1}. ${place.name}</strong>`
    });

    marker.addListener('click', () => {
      infoWindow.open(myScheduleMap, marker);
    });

    bounds.extend(marker.getPosition());
  });

  myScheduleMap.fitBounds(bounds);
}

async function getCoordinatesFromPlaces(allDays, region = '도쿄') {
  const proxy = 'http://localhost:8080/';
  const key = 'AIzaSyA5ueda7Qmq4m_agO069YgX82NkEhJCzRY';
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

  const center = regionCenterMap[region] || { lat: 35.6895, lng: 139.6917 }; // ✅ 지역 중심
  const coords = [];

  for (const day of allDays) {
    for (const place of day) {
      const query = encodeURIComponent(place.name);
      const url = `${proxy}https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&location=${center.lat},${center.lng}&radius=20000&key=${key}&language=ko`;

      try {
        const res = await fetch(url);
        const data = await res.json();
        if (data.status === 'OK' && data.results.length > 0) {
          const loc = data.results[0].geometry.location;
          coords.push({ name: place.name, lat: loc.lat, lng: loc.lng });
        }
      } catch (err) {
        console.warn("좌표 가져오기 실패:", place.name);
      }
    }
  }

  return coords;
}




async function showMapForDay(day) {
  const schedule = schedules[currentSchedule];
  const places = schedule.daysData[day];
  if (!places || places.length === 0) {
    alert("해당 Day에 장소가 없습니다.");
    return;
  }

  // 기존에 있던 지도 div 제거
  const existingMap = document.getElementById(`map-${day}`);
  if (existingMap) {
    existingMap.remove();
  }

  // Day 블록 안에 새 div 추가
  const dayDiv = Array.from(document.querySelectorAll('.day')).find(d =>
    d.querySelector('h2')?.textContent.startsWith(day)
  );
  const mapDiv = document.createElement('div');
  mapDiv.id = `map-${day}`;
  mapDiv.style.height = '300px';
  mapDiv.style.marginTop = '1rem';
  mapDiv.style.borderRadius = '10px';
  mapDiv.style.overflow = 'hidden';

  dayDiv.appendChild(mapDiv);

  // 지도 초기화
  const map = new google.maps.Map(mapDiv, {
    zoom: 13,
    center: { lat: 34.0522, lng: -118.2437 } // 기본값: LA 중심
  });

  const region = schedules[currentSchedule]?.region || '도쿄';
  const coords = await getPlaceCoordinates(places.map(p => p.name), region);
  const bounds = new google.maps.LatLngBounds();

  coords.forEach((place, index) => {
    const marker = new google.maps.Marker({
      position: { lat: place.lat, lng: place.lng },
      map,
      label: `${index + 1}`,
      title: place.name
    });
  
marker.addListener('click', async () => {
  let content = `
    <div style="padding: 10px; max-width: 300px;">
      <div style="font-weight: bold; font-size: 14px; margin-bottom: 8px;">
        ${index + 1}. ${place.name}
      </div>
  `;

  if (place.place_id) {
    try {
      const detailUrl = `http://localhost:8080/https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=photo&key=AIzaSyA5ueda7Qmq4m_agO069YgX82NkEhJCzRY`;
      const res = await fetch(detailUrl);
      const data = await res.json();
      const photoRef = data.result?.photos?.[0]?.photo_reference;

      if (photoRef) {
        const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photoRef}&key=AIzaSyA5ueda7Qmq4m_agO069YgX82NkEhJCzRY`;

        content += `
          <img 
            src="${photoUrl}" 
            style="
              width: 100%;
              max-height: 180px;
              object-fit: cover;
              border-radius: 10px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            "
          />
        `;
      }
    } catch (err) {
      console.warn("사진 불러오기 실패:", err);
    }
  }

  content += `</div>`;

  const infoWindow = new google.maps.InfoWindow({ content });
  infoWindow.open(map, marker);
});
  
    bounds.extend(marker.getPosition());
  });

  map.fitBounds(bounds);
}




async function getPlaceCoordinates(placeNames, region = '') {
  const proxy = 'http://localhost:8080/';
  const key = 'AIzaSyA5ueda7Qmq4m_agO069YgX82NkEhJCzRY';
  const results = [];

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

  const center = regionCenterMap[region] || { lat: 35.6895, lng: 139.6917 };

  for (const name of placeNames) {
    const query = encodeURIComponent(`${name} ${region}`);
    const url = `${proxy}https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&location=${center.lat},${center.lng}&radius=20000&key=${key}&language=ko`;

    try {
      const res = await fetch(url);
      const data = await res.json();
      if (data.status === 'OK' && data.results.length > 0) {
        const loc = data.results[0].geometry.location;
        results.push({ name, lat: loc.lat, lng: loc.lng, place_id: data.results[0].place_id  });
      }
    } catch (err) {
      console.warn('Place fetch error for:', name, err);
    }
  }

  return results;
}


let myMap;
function initMyMap(center = { lat: 35.6895, lng: 139.6917 }) {
  if (!window.google || !google.maps) {
    console.error("❌ Google Maps API 로드되지 않음!");
    return;
  }

  myMap = new google.maps.Map(document.getElementById("map"), {
    center,
    zoom: 12
  });
}


function renderAiMarkers(places) {
  if (!myMap) return;
  const bounds = new google.maps.LatLngBounds();

  places.forEach((place, index) => {
    const marker = new google.maps.Marker({
      position: { lat: place.lat, lng: place.lng },
      map: myMap,
      label: `${index + 1}`,
      title: place.name
    });

    const infoWindow = new google.maps.InfoWindow({
      content: `<strong>${index + 1}. ${place.name}</strong>`
    });

    marker.addListener('click', () => {
      infoWindow.open(myMap, marker);
    });

    bounds.extend(marker.getPosition());
  });

  myMap.fitBounds(bounds);
}
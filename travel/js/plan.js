
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

  // Firestore로 보낼 형식으로 재구성
  const days = schedule.daysOrder.map(day => ({
    day: parseInt(day.replace('Day ', '')),
    places: schedule.daysData[day]
  }));

  const docId = scheduleNameToDocId[scheduleName] || scheduleName;
  const docRef = db.collection("users").doc(user.uid).collection("itineraries").doc(docId);

  const existing = await docRef.get();
  const data = {
    displayName: scheduleName,
    days: days,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  // 🔐 updatedAt은 처음 저장할 때만
  if (!existing.exists) {
    data.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
  }

  await docRef.set(data, { merge: true }); // merge 옵션 추가!
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
            dayCount: order.length
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

  leftSide.appendChild(dayHandle);
  leftSide.appendChild(dayTitle);

  const dayButtons = createDayButtons(day);

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
    draggedSourceDay = destDiv.closest('.day')?.querySelector('h2')?.textContent;
    draggedItem.dataset.name = dest.name;
  });

  const contentWrapper = document.createElement('div');
  contentWrapper.className = 'destination-info';

  const nameRow = document.createElement('div');
  nameRow.className = 'destination-name-row';

  const contentDiv = document.createElement('div');
  contentDiv.className = 'destination-content';

  const nameDiv = document.createElement('div');
  nameDiv.className = 'destination-name';

  if (dest.type) {
    const tagBadge = document.createElement('span');
    tagBadge.className = `type-badge ${getTypeClass(dest.type)}`;
    tagBadge.textContent = dest.type;
    nameDiv.appendChild(tagBadge);
  }

  function getTypeClass(type) {
    switch (type) {
      case "출발": return "type-start";
      case "도착": return "type-end";
      case "식당": return "type-restaurant";
      case "관광지": return "type-attraction";
      case "숙소": return "type-hotel";
      default: return ""; // 지정되지 않은 타입
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

  const editBtn = createButton('수정', 'edit', () => editDestination(day, dest));
  const deleteBtn = createButton('삭제', 'delete', () => deleteDestination(day, dest));

  container.appendChild(editBtn);
  container.appendChild(deleteBtn);
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
  const type = prompt('태그를 입력하세요 (출발, 도착, 관광지, 식당, 숙소):', '') || '';
  const address = prompt('주소를 입력하세요:', '') || '';
  schedules[currentSchedule].daysData[day].push({ name, type, address });
  destinationInput.value = '';
  renderDays();

  // Firestore에도 저장
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
  const newName = prompt('목적지 이름 수정:', dest.name);
  if (newName) dest.name = newName;
  const newTag = prompt('태그 수정:', dest.type);
  if (newTag) dest.type = newTag;
  const newAddress = prompt('주소 수정:', dest.address || '');
  if (newAddress !== null) dest.address = newAddress;
  renderDays();
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
  const dests = schedule.daysData[draggedSourceDay];
  const draggedName = draggedItem.dataset.name;
  const draggedData = dests.find(d => d.name === draggedName);
  if (!draggedData) return;
  const draggedIndex = dests.indexOf(draggedData);
  if (draggedIndex > -1) dests.splice(draggedIndex, 1);

  const targetDay = targetDayDiv?.querySelector('h2')?.textContent || draggedSourceDay;
  if (targetDestDiv) {
    const targetDataName = targetDestDiv.querySelector('.destination-name span')?.textContent;
    const targetData = schedule.daysData[targetDay].find(d => d.name === targetDataName);
    const targetIndex = schedule.daysData[targetDay].indexOf(targetData);
    schedule.daysData[targetDay].splice(targetIndex + 1, 0, draggedData);
  } else {
    schedule.daysData[targetDay].push(draggedData);
  }
  renderDays();
}

// 드래그 시작
document.addEventListener('dragstart', (e) => {
  const item = e.target.closest('.destination, .day');
  if (!item) return;

  draggedItem = item;
  draggedItem.classList.add('dragging');

  if (item.classList.contains('destination')) {
    draggedSourceDay = item.closest('.day')?.querySelector('h2')?.textContent;
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

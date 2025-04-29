
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
const loadButton = document.getElementById('load-button');

// 드래그 기능에서 사용되는 전역 변수
let draggedItem = null;
let draggedSourceDay = null;

// -------------- 탭 렌더링 -------------
// 일정 목록 탭 UI를 다시 그림
function renderTabs() {
  tabsContainer.innerHTML = '';

  // 각 일정 이름마다 탭 생성
  Object.keys(schedules).forEach(scheduleName => {
    const tab = document.createElement('button');
    tab.className = 'tab';

    const nameSpan = document.createElement('span');
    nameSpan.textContent = scheduleName;
    nameSpan.style.flexGrow = '1';
    nameSpan.onclick = () => switchTab(scheduleName);
    
    const closeBtn = document.createElement('span');
    closeBtn.className = 'tab-close';
    closeBtn.textContent = '✖';
    closeBtn.onclick = (e) => {
      e.stopPropagation();
      if (confirm(`'${scheduleName}' 일정을 삭제할까요?`)) {
        delete schedules[scheduleName];
        const remaining = Object.keys(schedules);
        currentSchedule = remaining.length > 0 ? remaining[0] : "";
        renderTabs();
        renderDays();
      }
    };

    tab.appendChild(nameSpan);
    tab.appendChild(closeBtn);

    if (scheduleName === currentSchedule) {
      tab.style.backgroundColor = "#ccc";
    }

    tabsContainer.appendChild(tab);

  });

  // '일정 추가' 탭 버튼
  const addTab = document.createElement('button');
  addTab.className = 'tab add-tab';
  addTab.textContent = '일정 추가';
  addTab.onclick = addNewSchedule;
  tabsContainer.appendChild(addTab);
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
function addNewSchedule() {
  const newScheduleName = `일정 ${Object.keys(schedules).length + 1}`;
  schedules[newScheduleName] = { daysData: { "Day 1": [] }, daysOrder: ["Day 1"], dayCount: 1 };
  switchTab(newScheduleName);
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

  if (dest.tag) {
    const tagBadge = document.createElement('span');
    tagBadge.className = 'tag-badge';
    tagBadge.textContent = dest.tag;
    nameDiv.appendChild(tagBadge);
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
  const tag = prompt('태그를 입력하세요 (예: 맛집, 명소 등):', '') || '';
  const address = prompt('주소를 입력하세요:', '') || '';
  schedules[currentSchedule].daysData[day].push({ name, tag, address });
  destinationInput.value = '';
  renderDays();
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
  const newTag = prompt('태그 수정:', dest.tag);
  if (newTag) dest.tag = newTag;
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

// -------------- 저장 / 불러오기 -------------
saveButton.addEventListener('click', saveSchedule);
loadButton.addEventListener('click', loadSchedule);

// 저장: LocalStorage에 전체 일정 저장
function saveSchedule() {
  localStorage.setItem('travelSchedules', JSON.stringify(schedules));
  alert('저장 완료!');
}

// 불러오기: LocalStorage 에서 로드
function loadSchedule() {
  const saved = localStorage.getItem('travelSchedules');
  if (saved) {
    const loadedSchedules = JSON.parse(saved);
    Object.assign(schedules, loadedSchedules);
    const keys = Object.keys(schedules);
    currentSchedule = keys.length > 0 ? keys[0] : "일정 1";
    renderTabs();
    renderDays();
    alert('불러오기 완료!');
  } else {
    alert('저장된 일정이 없습니다.');
  }
}

// -------------- 초기화 -------------
function initialize() {
  schedules["일정 1"] = { daysData: { "Day 1": [], "Day 2": [] }, daysOrder: ["Day 1", "Day 2"], dayCount: 2 };
  currentSchedule = "일정 1";
  renderTabs();
  renderDays();
}

addButton.addEventListener('click', addDestination);
addDayButton.addEventListener('click', addDay);

initialize();

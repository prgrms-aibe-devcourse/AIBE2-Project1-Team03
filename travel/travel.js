let lastSelectedId = null;//마지막에 클릭된 국가 id 저장

fetch('assets/world-map.svg')
  .then(res => res.text())
  .then(svgText => {
    const container = document.getElementById('map-container');
    container.innerHTML = svgText;

    const svg = container.querySelector('svg');
    const paths = svg.querySelectorAll('path');

    paths.forEach(path => {
      path.addEventListener('click', () => {
        const parentGroup = path.closest('g');
        const groupId = parentGroup ? parentGroup.id : 'no-group-id';
        
        lastSelectedId = groupId;

        close_slide(groupId);
        open_slide(groupId);

        // 중복된 id가 없을 때만 배열에 추가
        if (!contry_id.includes(groupId)) {
          contry_id.push(groupId);
        }

        console.log(`클릭한 나라의 g id: ${groupId}`);
      });
    });
  });

  function open_slide(id){
    //사이드패널 열기
    const sidePanel = document.getElementById('sidePanel');
     sidePanel.classList.toggle('open');
    const selected = document.getElementById('contry_info');
        
     //사이드 패널 상단에 국기 넣기
    const flagImg = document.createElement('img');
     flagImg.src = `https://flagcdn.com/w80/${id.toLowerCase()}.png`;
     flagImg.alt = `${id} flag`;
     flagImg.style.width = '300px';
     flagImg.style.marginTop = '0px';
     selected.appendChild(flagImg);
    // 국기아래 국가 id 적음(테스트용)
    const p = document.createElement('p')
      p.textContent = id;
      selected.appendChild(p);
  }

  function close_slide(id){
    //사이드패널 우측(화면 밖 이동)
    const sidePanel = document.getElementById('sidePanel');
        sidePanel.classList.remove('open');
    //contry_info 제거
    const selected = document.getElementById('contry_info');
    selected.innerHTML = '';
  }

  //사이드 패널 열린 상태에서 닫기버튼 누르면 패널 닫기
  document.addEventListener('DOMContentLoaded',()=>{
    document.getElementById('side-close').addEventListener('click', ()=>{
      if(lastSelectedId){
      close_slide(lastSelectedId);
      }
    });
  });
  


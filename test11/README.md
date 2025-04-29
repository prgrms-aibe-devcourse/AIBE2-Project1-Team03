# AIBE2-Project1-Team03

## ⚙️ 개발환경 세팅

여행지 검색 기능 쓰려면 다음과 같은 세팅이 필요합니다.

### 1. Node.js 설치
- [Node.js 공식 사이트](https://nodejs.org/) 에서 Node.js 최신 버전을 설치합니다.

### 2. cors-anywhere 설치
- 프로젝트 폴더에서 터미널을 열고 아래 명령어를 입력하세요:

```bash
npm install cors-anywhere
```

### 3. 프록시 서버 실행
- 프로젝트 폴더에 있는 server.js 파일을 실행하여 프록시 서버를 켭니다:
```bash
node server.js
```
- 터미널에 다음과 같은 메시지가 출력되면 정상적으로 서버가 실행된 것입니다:
```bash
 CORS Anywhere 프록시 서버가 http://localhost:8080 에서 실행 중입니다.
```

- 프록시 서버를 끄면 여행지 검색 기능이 작동하지 않습니다.
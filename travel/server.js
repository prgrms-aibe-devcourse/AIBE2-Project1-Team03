/*
const corsAnywhere = require('cors-anywhere');

const host = 'localhost';
const port = 8080;

corsAnywhere.createServer({
  originWhitelist: [], // 모두 허용
  requireHeader: ['origin', 'x-requested-with'],
  removeHeaders: ['cookie', 'cookie2']
}).listen(port, host, () => {
  console.log(`CORS Anywhere 프록시 서버가 http://${host}:${port} 에서 실행 중입니다.`);
});

*/



const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fetch = require('node-fetch');
const corsAnywhere = require('cors-anywhere');

const app = express();
const port = 3000; // ✅ Express는 3000 포트로 돌리고
const proxyPort = 8080; // ✅ CORS 프록시는 8080 유지

app.use(cors());
app.use(bodyParser.json());

// 🔐 Gemini API 키
const GEMINI_API_KEY = 'AIzaSyAFbykLwRBCI9prKod4n4nyynTEflAP79k';

app.post('/gemini', async (req, res) => {
  const userPrompt = req.body.prompt;

  console.log("🔻 받은 프롬프트:", userPrompt); // ✅ 로그 찍기

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: userPrompt }] }]
      })
    });

    const raw = await response.text();
    console.log("🔻 Gemini 응답:", raw); // ✅ 응답 확인

    const result = JSON.parse(raw);
    res.json(result);
  } catch (error) {
    console.error('Gemini 호출 오류:', error);
    res.status(500).json({ error: 'Gemini 요청 실패' });
  }
});

// ✅ Express 서버 실행
app.listen(port, () => {
  console.log(`Express 서버가 http://localhost:${port} 에서 실행 중입니다`);
});

// ✅ CORS 프록시 별도 포트로 실행
corsAnywhere.createServer({
  originWhitelist: [],
  requireHeader: ['origin', 'x-requested-with'],
  removeHeaders: ['cookie', 'cookie2']
}).listen(proxyPort, () => {
  console.log(`CORS Anywhere 프록시 서버가 http://localhost:${proxyPort} 에서 실행 중입니다`);
});
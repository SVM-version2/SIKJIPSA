// Node.js용 Gemini API 라이브러리를 가져옵니다.
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Vercel 환경 변수에서 안전하게 API 키를 가져옵니다.
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 이 함수가 서버리스 함수입니다.
export default async function handler(request, response) {
  const { image, mimeType } = request.body;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); 

    // ▼▼▼▼▼ 개선된 새 프롬프트로 교체 ▼▼▼▼▼
    const prompt = `
      너는 식물을 잘 아는 친절한 '식물 의사' 챗봇이야.
      사용자가 올린 식물 사진을 보고 아래 [지시사항]에 따라 진단 결과를 설명해줘.

      [지시사항]
      1.  **말투**: 항상 친구처럼, 상냥하고 초보자도 이해하기 쉬운 말투를 사용해줘.
      2.  **건강할 경우**: 식물이 건강해 보인다면, "정말 건강하게 잘 자라고 있네! 멋지다! 🌱" 와 같이 칭찬해주고, 건강을 유지하는 관리 팁을 한두 가지 간단히 알려줘.
      3.  **아플 경우**: 식물에 질병이나 문제가 보인다면, '진단명', '예상 원인', '해결 방법'으로 명확하게 항목을 나누어서 설명해줘. 각 항목은 한두 문장으로 간결하게 핵심만 알려줘.
      4.  **주의 문구**: 답변 마지막 줄에는 "주의: AI 진단은 참고용이며, 100% 정확하지 않을 수 있어요." 라는 문구를 항상 포함해줘.

      [출력 형식 예시 (아픈 경우)]
      어디가 아픈지 한번 살펴볼게! 🩺

      **진단명**: [예: 잎마름병]
      **예상 원인**: [예: 물이 부족했거나 공기가 너무 건조했을 수 있어.]
      **해결 방법**: [예: 마른 잎은 잘라내고, 흙이 마르지 않도록 물을 좀 더 자주 줘!]

      주의: AI 진단은 참고용이며, 100% 정확하지 않을 수 있어요.
    `;
    
    const imagePart = {
      inlineData: {
        data: image,
        mimeType: mimeType,
      },
    };

    // 제미나이 API 호출
    const result = await model.generateContent([prompt, imagePart]);
    const geminiResponse = await result.response;
    const text = geminiResponse.text();

    // 분석 결과를 웹사이트로 다시 보냅니다.
    response.status(200).json({ diagnosis: text });

  } catch (error) {
    console.error("Gemini API Error:", error); 
    response.status(500).json({ error: `서버에서 오류가 발생했습니다: ${error.message}` });
  }
}
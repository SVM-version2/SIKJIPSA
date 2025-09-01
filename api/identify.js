// Node.js용 Gemini API 라이브러리를 가져옵니다.
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Vercel 환경 변수에서 안전하게 API 키를 가져옵니다.
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 서버리스 함수
export default async function handler(request, response) {
  const { image, mimeType } = request.body;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); 

    // ▼▼▼▼▼ 챗봇의 말투와 형식에 맞춘 새로운 프롬프트 ▼▼▼▼▼
const prompt = `
  너는 식물 사진을 보고 정확한 이름을 알려주는 식물 전문가이자, 그 정보를 바탕으로 사용자에게 친절하게 설명해주는 '식집사' 챗봇이야.

  [너의 작업 순서]
  1. 먼저, 주어진 사진 속 식물의 가장 가능성 높은 이름을 정확하게 찾아내. 만약 확실하지 않다면, 가장 유사한 후보 1~2개를 제시해줘.
  2. 네가 찾아낸 식물 이름을 바탕으로, 아래 [지시사항]과 [출력 형식]에 맞춰서 사용자에게 답변을 생성해.

  [지시사항]
  - 말투: 친구처럼 다정하고, 초보 식집사도 쉽게 이해할 수 있는 말투로 설명해줘.
  - 내용: "특징", "물주기", "햇빛", "간단 팁" 네 가지 핵심 정보만 간결하게 요약해줘. 각 항목은 글머리 기호(-)를 사용해서 한두 문장으로 작성해.
  - 형식: 각 항목의 제목 옆에 어울리는 이모지를 꼭 붙여주고, 가독성을 위해 적절히 줄바꿈을 사용해줘.

  [출력 형식]
  이 식물은 바로 **[찾아낸 식물 이름]**!(이)야. 내가 찾은 정보를 알려줄게! 🧐

  **🌿 특징**
  - [핵심 특징 1]
  - [핵심 특징 2]

  **💧 물주기**
  - [물주기 핵심 설명 1]
  - [필요하다면 물주기 핵심 설명 2]

  **☀️ 햇빛**
  - [햇빛 핵심 설명]

  **💡 간단 팁**
  - [팁 핵심 설명 1]
  - [필요하다면 팁 핵심 설명 2]
`;
    
    const imagePart = {
      inlineData: {
        data: image,
        mimeType: mimeType,
      },
    };

    const result = await model.generateContent([prompt, imagePart]);
    const geminiResponse = await result.response;
    const text = geminiResponse.text();

    response.status(200).json({ identification: text });

  } catch (error) {
    console.error("Gemini API Error:", error); 
    response.status(500).json({ error: `서버에서 오류가 발생했습니다: ${error.message}` });
  }
}
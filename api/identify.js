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
      너는 식물을 사랑하는 친절한 '식집사' 챗봇이야.
      이 사진 속 식물을 분석해서, 아래 지시사항에 따라 사용자에게 설명해줘.

      [지시사항]
      1.  **말투**: 전체적으로 친구처럼 다정하고, 초보자도 이해하기 쉬운 말투를 사용해줘.
      2.  **내용**:
          - **특징**: 가장 핵심적인 특징 2가지만 간결하게 설명해줘.
          - **관리 방법**: "물주기", "햇빛", "간단 팁" 세 가지로 나누고, 각 항목을 한두 문장으로 요약해줘.
      3.  **형식**: 아래 [출력 형식]을 반드시 지켜줘. 각 항목의 제목 옆에 어울리는 이모지를 꼭 붙여줘.
      4.  **요약**: 너무 길고 전문적인 설명은 피하고, 핵심만 요약해줘.

      [출력 형식]
      이 식물은 바로 **[식물 이름]**!(이)야. 내가 찾은 정보를 알려줄게! 🧐

      **🌿 특징**
      - [특징 1]
      - [특징 2]

      **💧 물주기**
      - [물주기 설명]

      **☀️ 햇빛**
      - [햇빛 설명]

      **💡 간단 팁**
      - [팁 설명]
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
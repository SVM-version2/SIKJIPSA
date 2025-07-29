// Node.js용 Gemini API 라이브러리를 가져옵니다.
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Vercel 환경 변수에서 안전하게 API 키를 가져옵니다.
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 서버리스 함수
export default async function handler(request, response) {
  // 프론트엔드에서 보낸 이미지 데이터와 MIME 타입을 받습니다.
  const { image, mimeType } = request.body;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); 

    // ▼▼▼ 식물 이름 찾기에 더 적합한 프롬프트로 수정 ▼▼▼
    const prompt = `
      이 사진 속 식물의 이름은 무엇인가요? 
      그리고 이 식물의 주요 특징과 초보자를 위한 관리 방법을 아래 형식에 맞춰 친절하게 설명해주세요.

      **이름**: 
      **특징**: 
      **관리 방법**: 
    `;
    
    const imagePart = {
      inlineData: {
        data: image,
        mimeType: mimeType,
      },
    };

    // Gemini API 호출
    const result = await model.generateContent([prompt, imagePart]);
    const geminiResponse = await result.response;
    const text = geminiResponse.text();

    // 분석 결과를 프론트엔드로 다시 보냅니다.
    // 키 이름을 'identification'으로 변경하여 역할 구분
    response.status(200).json({ identification: text });

  } catch (error) {
    console.error("Gemini API Error:", error); 
    response.status(500).json({ error: `서버에서 오류가 발생했습니다: ${error.message}` });
  }
}
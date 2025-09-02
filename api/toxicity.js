// Node.js용 Gemini API 라이브러리를 가져옵니다.
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Vercel 환경 변수에서 안전하게 API 키를 가져옵니다.
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * 식물 독성 정보를 확인하는 서버리스 함수
 */
export default async function handler(request, response) {
  // POST 요청이 아닌 경우 405 Method Not Allowed 에러 반환
  if (request.method !== 'POST') {
    return response.status(405).json({ error: "POST 요청만 허용됩니다." });
  }

  // 요청 본문에서 식물 이름 추출
  const { plantName } = request.body;

  // 식물 이름이 없는 경우 400 Bad Request 에러 반환
  if (!plantName || typeof plantName !== 'string' || plantName.trim() === '') {
    return response.status(400).json({ error: "확인할 식물 이름을 정확히 보내주세요." });
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // AI에게 전달할 프롬프트 정의
    const prompt = `
      당신은 식물 독성 전문가입니다.
      '${plantName}' 식물이 어린 아이, 강아지, 고양이에게 독성이 있는지 여부를 판단해주세요.

      [지시사항]
      - 반드시 다음 세 가지 중 하나로 답변을 시작해야 합니다: "안전함:", "독성 있음:", "정보 없음:".
      - 답변은 한국어로 작성하고, 1~2 문장 이내의 간결한 요약 설명을 덧붙여주세요.
      - 불필요한 인사나 서론 없이 핵심 정보만 바로 전달해주세요.
    `;
    
    // AI 모델에 프롬프트를 전달하고 결과 생성
    const result = await model.generateContent(prompt);
    const geminiResponse = await result.response;
    const text = geminiResponse.text();

    // 성공적으로 응답을 받으면 클라이언트에 전달
    response.status(200).json({ toxicityInfo: text });

  } catch (error) {
    // API 호출 중 에러 발생 시
    console.error("Gemini API Error:", error);
    response.status(500).json({ error: `서버에서 오류가 발생했습니다: ${error.message}` });
  }
}

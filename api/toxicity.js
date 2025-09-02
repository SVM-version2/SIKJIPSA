// Node.js용 Gemini API 라이브러리를 가져옵니다.
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Vercel 환경 변수에서 안전하게 API 키를 가져옵니다.
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * 식물 독성 정보를 확인하는 서버리스 함수 (개선 버전)
 */
export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: "POST 요청만 허용됩니다." });
  }

  const { plantName } = request.body;

  if (!plantName || typeof plantName !== 'string' || plantName.trim() === '') {
    return response.status(400).json({ error: "확인할 식물 이름을 정확히 보내주세요." });
  }

  // [개선 1] 입력 길이 제한 추가 (너무 긴 텍스트 입력 방지)
  const trimmedPlantName = plantName.trim();
  const MAX_LENGTH = 30;
  if (trimmedPlantName.length > MAX_LENGTH) {
    return response.status(400).json({ error: `식물 이름은 ${MAX_LENGTH}자를 초과할 수 없습니다.` });
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // [개선 2] 프롬프트 개선 (입력값 분석 단계 추가)
    const prompt = `
      당신은 식물 독성 전문가입니다. 다음 두 단계에 따라 작업을 수행해주세요.

      [1단계: 입력값 분석]
      입력된 텍스트인 '${trimmedPlantName}'이(가) 일반적인 식물의 이름인지 먼저 판단합니다.

      [2단계: 분석 결과에 따른 작업]
      - 만약 식물이 맞다면: 어린 아이, 강아지, 고양이에게 독성이 있는지 판단하고, 반드시 "안전함:", "독성 있음:", "정보 없음:" 중 하나로 답변을 시작해주세요. 그 뒤에 1~2 문장으로 간결한 요약 설명을 한국어로 덧붙입니다.
      - 만약 식물이 아니라면: 반드시 "판단 불가:"로 답변을 시작하고, "입력하신 '${trimmedPlantName}'은(는) 식물이 아닌 것 같습니다. 식물의 정확한 이름으로 다시 시도해주세요!!" 라고 답변합니다.

      [규칙]
      - 서론이나 인사 없이, 지시된 시작 단어로 즉시 답변을 시작해야 합니다.
    `;
    
    const result = await model.generateContent(prompt);
    const geminiResponse = await result.response;
    let text = geminiResponse.text();

    // [개선 3] 혹시 모를 AI의 응답 형식 오류에 대한 안전장치
    // AI가 지시된 시작 단어를 사용하지 않았을 경우, '정보 없음'으로 처리
    if (!text.startsWith("안전함:") && !text.startsWith("독성 있음:") && !text.startsWith("정보 없음:") && !text.startsWith("판단 불가:")) {
        text = `정보 없음: '${trimmedPlantName}'에 대한 명확한 독성 정보를 찾기 어렵습니다. 학명이나 다른 이름으로 시도해보세요.`;
    }

    response.status(200).json({ toxicityInfo: text });

  } catch (error) {
    console.error("Gemini API Error:", error);
    response.status(500).json({ error: `서버에서 오류가 발생했습니다: ${error.message}` });
  }
}


// Node.js용 Gemini API 라이브러리를 가져옵니다.
const { GoogleGenerativeAI } = require("@google-generative-ai");

// Vercel 환경 변수에서 안전하게 API 키를 가져옵니다.
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * 식물 독성 정보를 확인하는 서버리스 함수 (고도화 버전)
 */
export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: "POST 요청만 허용됩니다." });
  }

  const { plantName } = request.body;

  if (!plantName || typeof plantName !== 'string' || plantName.trim() === '') {
    return response.status(400).json({ error: "확인할 식물 이름을 정확히 보내주세요." });
  }

  const trimmedPlantName = plantName.trim();
  const MAX_LENGTH = 30;
  if (trimmedPlantName.length > MAX_LENGTH) {
    return response.status(400).json({ error: `식물 이름은 ${MAX_LENGTH}자를 초과할 수 없습니다.` });
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // [개선 1: 프롬프트 고도화] 독성 등급을 나누어 더 구체적인 답변을 유도합니다.
    const prompt = `
      당신은 식물의 유해성 정보를 정확하게 분류하는 식물 독성학자입니다.

      [1단계: 입력값 분석]
      입력된 텍스트인 '${trimmedPlantName}'이(가) 일반적인 식물의 이름인지 먼저 판단합니다. 만약 식물이 아니라면, 2단계 B규칙에 따라 즉시 답변합니다.

      [2단계: 독성 등급 분류 및 설명]
      A. 만약 식물이 맞다면:
      어린 아이, 강아지, 고양이에게 미치는 영향을 기준으로 독성 등급을 다음 4가지 중 하나로 '반드시' 분류하고, 그에 맞는 설명을 1~2 문장으로 간결하게 덧붙여주세요. 단순히 '독성이 있다'는 정보만으로 섣불리 판단하지 말고, 실제 위험도를 기준으로 신중하게 분류해야 합니다.
      - [무독성]: 일반적으로 사람이나 반려동물에게 해가 없는 것으로 알려진 경우.
      - [경미한 독성]: 섭취 시 가벼운 소화불량, 구토, 피부 자극 등을 유발할 수 있는 경우.
      - [보통 독성]: 섭취 시 더 심한 위장 장애나 건강 이상을 초래할 수 있어 주의가 필요한 경우.
      - [치명적]: 소량만 섭취해도 심각한 중독 증상이나 생명의 위협을 줄 수 있는 경우.

      B. 만약 식물이 아니라면:
      "[판단 불가]: 입력하신 '${trimmedPlantName}'은(는) 식물이 아닌 것 같습니다. 식물의 정확한 이름으로 다시 시도해주세요." 라고만 답변합니다.

      [출력 형식]
      - 답변은 반드시 대괄호로 묶인 등급(예: [무독성])으로 시작해야 합니다.
      - 서론이나 인사 없이, 지정된 형식으로만 즉시 답변을 시작해야 합니다.
    `;
    
    const result = await model.generateContent(prompt);
    const geminiResponse = await result.response;
    let text = geminiResponse.text();

    // [개선 2: 안전장치 업데이트] 일관된 출력 형식을 갖도록 검증합니다.
    if (!text.startsWith("[") || !text.includes("]:")) {
        text = `[정보 없음]: '${trimmedPlantName}'에 대한 명확한 독성 정보를 찾기 어렵습니다. 학명이나 다른 이름으로 시도해보세요.`;
    }

    // [개선 3] 프론트엔드에서 사용하기 쉽도록 등급과 설명을 분리하여 응답합니다.
    const parts = text.split("]: ");
    const classification = parts[0].replace("[", "");
    const description = parts.length > 1 ? parts[1] : "";

    response.status(200).json({ 
        toxicityInfo: text,
        classification: classification,
        description: description
    });

  } catch (error) {
    console.error("Gemini API Error:", error);
    response.status(500).json({ error: `서버에서 오류가 발생했습니다: ${error.message}` });
  }
}


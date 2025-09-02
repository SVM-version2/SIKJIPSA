// Node.js용 Gemini API 라이브러리를 가져옵니다.
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Vercel 환경 변수에서 안전하게 API 키를 가져옵니다.
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * 식물 독성 정보를 확인하는 서버리스 함수 (안정성 및 정확도 강화 버전)
 */
export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: "POST 요청만 허용됩니다." });
  }

  const { plantName } = request.body;
  const trimmedPlantName = plantName ? plantName.trim() : "";

  if (!trimmedPlantName) {
    return response.status(400).json({ error: "확인할 식물 이름을 정확히 보내주세요." });
  }

  const MAX_LENGTH = 30;
  if (trimmedPlantName.length > MAX_LENGTH) {
    return response.status(400).json({ error: `식물 이름은 ${MAX_LENGTH}자를 초과할 수 없습니다.` });
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // [개선: Few-Shot 예시 추가] AI가 따라할 수 있는 모범 답안을 제공하여 정확도를 높입니다.
    const prompt = `
      당신은 식물의 유해성 정보를 정확하게 분류하는 식물 독성학자입니다. 주어진 [규칙]과 [모범 예시]를 완벽하게 학습한 후, 마지막의 [실제 요청]에 대해 답변해주세요.

      [규칙]
      1.  입력값이 식물이 맞는지 먼저 판단합니다.
      2.  식물이 맞다면, 어린 아이, 강아지, 고양이에게 미치는 영향을 기준으로 독성 등급을 [무독성], [경미한 독성], [보통 독성], [치명적] 중 하나로 '반드시' 분류합니다.
      3.  분류된 등급 뒤에 1~2 문장으로 간결한 설명을 덧붙입니다.
      4.  입력값이 식물이 아니라면, [판단 불가]로 분류하고 정해진 문구로만 답변합니다.
      5.  답변은 반드시 대괄호로 묶인 등급으로 시작하며, 서론이나 인사 없이 즉시 핵심 답변만 제공합니다.

      [모범 예시]
      - 실제 요청: '몬스테라'
      - 당신의 답변: [경미한 독성]: 몬스테라는 칼슘 옥살레이트 결정을 포함하고 있어, 반려동물이 섭취 시 구강 자극이나 구토 등을 유발할 수 있습니다.
      
      - 실제 요청: '장미'
      - 당신의 답변: [무독성]: 장미는 일반적으로 고양이나 개에게 독성이 없는 것으로 알려져 있으나, 가시는 물리적인 상처를 입힐 수 있으니 주의해야 합니다.

      - 실제 요청: '컴퓨터'
      - 당신의 답변: [판단 불가]: 입력하신 '컴퓨터'은(는) 식물이 아닌 것 같습니다. 식물의 정확한 이름으로 다시 시도해주세요.

      [실제 요청]
      '${trimmedPlantName}'
    `;
    
    const result = await model.generateContent(prompt);
    const geminiResponse = await result.response;
    const text = geminiResponse.text();

    if (typeof text === 'string' && text.startsWith("[") && text.includes("]:")) {
      const parts = text.split("]: ");
      const classification = parts[0].substring(1);
      const description = parts[1] || "";

      return response.status(200).json({ 
        toxicityInfo: text,
        classification: classification,
        description: description
      });
    } else {
      const fallbackText = `[정보 없음]: '${trimmedPlantName}'에 대한 명확한 독성 정보를 찾기 어렵습니다. 학명이나 다른 이름으로 시도해보세요.`;
      return response.status(200).json({
          toxicityInfo: fallbackText,
          classification: "정보 없음",
          description: `'${trimmedPlantName}'에 대한 명확한 독성 정보를 찾기 어렵습니다. 학명이나 다른 이름으로 시도해보세요.`
      });
    }

  } catch (error) {
    console.error("Gemini API Error:", error);
    response.status(500).json({ error: `서버에서 오류가 발생했습니다: ${error.message}` });
  }
}


// Node.js용 Gemini API 라이브러리를 가져옵니다.
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Vercel 환경 변수에서 안전하게 API 키를 가져옵니다.
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 이 함수가 서버리스 함수입니다.
export default async function handler(request, response) {
  // 웹사이트에서 보낸 요청의 본문(body)을 받습니다.
  // 예: { "image": "base64로 인코딩된 이미지 데이터" }
  const { image, mimeType } = request.body;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });

    const prompt = "이 식물 사진을 보고 상태를 진단해주세요. 아픈 곳이 있다면 원인과 해결책을 알려주세요.";
    
    const imagePart = {
      inlineData: {
        data: image,
        mimeType: mimeType, // 예: "image/jpeg" 또는 "image/png"
      },
    };

    // 제미나이 API 호출
    const result = await model.generateContent([prompt, imagePart]);
    const geminiResponse = await result.response;
    const text = geminiResponse.text();

    // 분석 결과를 웹사이트로 다시 보냅니다.
    response.status(200).json({ diagnosis: text });

  } catch (error) {
    console.error(error);
    response.status(500).json({ error: "진단 중 오류가 발생했습니다." });
  }
}
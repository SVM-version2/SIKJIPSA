// /api/payments/verify.js

const axios = require('axios');
const admin = require('firebase-admin');

// Firebase Admin SDK 초기화
// Vercel 환경변수에서 서비스 계정 정보 가져오기
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'), // Vercel에서 줄바꿈 처리
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

  // Vercel의 서버리스 함수 핸들러
module.exports = async (req, res) => {
  // POST 요청이 아니면 에러 처리
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { imp_uid, merchant_uid, user_uid } = req.body;
    const expectedAmount = 100; // 실제 서비스 시 2900으로 변경해야 할 금액

    // 1. 포트원 API 엑세스 토큰 발급받기
    const tokenResponse = await axios({
      url: "https://api.iamport.kr/users/getToken",
      method: "post",
      headers: { "Content-Type": "application/json" },
      data: {
        imp_key: process.env.PORTONE_API_KEY,
        imp_secret: process.env.PORTONE_API_SECRET,
      },
    });
    const { access_token } = tokenResponse.data.response;

    // 2. imp_uid로 포트원에서 결제 정보 조회
    const getPaymentData = await axios({
      url: `https://api.iamport.kr/payments/${imp_uid}`,
      method: "get",
      headers: { "Authorization": access_token },
    });
    const paymentData = getPaymentData.data.response;

    // 3. 결제 정보 검증
    const { amount, status } = paymentData;
    if (status !== 'paid') {
      throw new Error("결제가 완료되지 않았습니다.");
    }
    if (amount !== expectedAmount) {
      // 결제된 금액과 상품 금액이 다르면 위변조 시도일 수 있음
      // TODO: 여기서 결제 취소 API를 호출하는 로직을 추가하면 더 안전합니다.
      throw new Error("결제 금액이 일치하지 않습니다.");
    }

    // 4. 모든 검증 통과 시, Firestore DB 업데이트
    await db.collection('users').doc(user_uid).update({
        proPlan: true,
        subscriptionStatus: 'active',
        // 구독 만료일 등 추가 정보 기록
        subscriptionExpiresAt: admin.firestore.Timestamp.fromDate(new Date(new Date().setMonth(new Date().getMonth() + 1))),
        lastPaymentImpUid: imp_uid
    });
    
    // 5. 프론트엔드로 성공 응답 전송
    res.status(200).json({ status: "success", message: "결제 검증 및 DB 업데이트 성공" });

  } catch (error) {
    console.error("결제 검증 실패:", error);
    res.status(400).json({ status: "failed", message: error.message });
  }
}
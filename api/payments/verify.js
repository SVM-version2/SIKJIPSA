// /api/payments/verify.js

const axios = require('axios');
const admin = require('firebase-admin');

// Firebase Admin SDK 초기화 (기존과 동일)
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { imp_uid, merchant_uid, user_uid } = req.body;
    const expectedAmount = 2900;

    // 1-3. 결제 정보 검증 (기존과 동일)
    // ... (토큰 발급 및 결제 정보 조회/검증 로직)
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
    const getPaymentData = await axios({
      url: `https://api.iamport.kr/payments/${imp_uid}`,
      method: "get",
      headers: { "Authorization": access_token },
    });
    const paymentData = getPaymentData.data.response;
    const { amount, status } = paymentData;
    if (status !== 'paid') {
      throw new Error("결제가 완료되지 않았습니다.");
    }
    if (amount !== expectedAmount) {
      throw new Error("결제 금액이 일치하지 않습니다.");
    }

    // ✨ 4. Firestore DB 업데이트 (필드 추가)
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    await db.collection('users').doc(user_uid).update({
        proPlan: true,
        subscriptionStatus: 'active',
        subscriptionExpiresAt: admin.firestore.Timestamp.fromDate(nextMonth),
        lastPaymentImpUid: imp_uid,
        customer_uid: user_uid, // ✨ 중요: 정기 결제를 위해 빌링키(customer_uid) 저장
        cancelAtPeriodEnd: false, // ✨ 중요: 구독 취소 상태 초기화
    });
    
    // 5. 프론트엔드로 성공 응답 전송 (기존과 동일)
    res.status(200).json({ status: "success", message: "결제 검증 및 DB 업데이트 성공" });

  } catch (error) {
    console.error("결제 검증 실패:", error);
    res.status(400).json({ status: "failed", message: error.message });
  }
}
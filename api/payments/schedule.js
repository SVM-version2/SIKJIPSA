// /api/payments/schedule.js

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

// Vercel Cron Job이 호출할 함수
module.exports = async (req, res) => {
  try {
    // ✨ 1. 재결제가 필요한 사용자 조회 (로직 수정)
    // "만료일이 오늘"이고, "취소 예약을 하지 않은" 활성 사용자만 찾습니다.
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const usersToCharge = await db.collection('users')
      .where('subscriptionStatus', '==', 'active')
      .where('cancelAtPeriodEnd', '!=', true) // ✨ 핵심: 취소 예약 사용자는 제외
      .where('subscriptionExpiresAt', '>=', admin.firestore.Timestamp.fromDate(todayStart))
      .where('subscriptionExpiresAt', '<=', admin.firestore.Timestamp.fromDate(todayEnd))
      .get();

    if (usersToCharge.empty) {
      console.log("재결제 대상 사용자가 없습니다.");
      return res.status(200).json({ status: "success", message: "재결제 대상 사용자가 없습니다." });
    }

    // 2. 포트원 API 엑세스 토큰 발급 (기존과 동일)
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

    // 3. 각 사용자에 대해 재결제 요청 (기존과 동일)
    const chargePromises = usersToCharge.docs.map(async (doc) => {
      const user = doc.data();
      const user_uid = doc.id;
      const expectedAmount = 2900;

      const newMerchantUid = `pro_monthly_${user_uid}_${new Date().getTime()}`;

      try {
        // 4. 아임포트 재결제 API 호출 (기존과 동일)
        await axios({
          url: `https://api.iamport.kr/subscribe/payments/again`,
          method: "post",
          headers: { "Authorization": access_token },
          data: {
            customer_uid: user.customer_uid, // ✨ DB에 저장된 customer_uid 사용
            merchant_uid: newMerchantUid,
            amount: expectedAmount,
            name: "오후의 식물 Pro 월간 구독",
          },
        });

        // 5. 결제 성공 시, DB에 다음 만료일 업데이트 (기존과 동일)
        const currentExpiry = user.subscriptionExpiresAt.toDate();
        const nextMonth = new Date(currentExpiry);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        
        await db.collection('users').doc(user_uid).update({
          subscriptionExpiresAt: admin.firestore.Timestamp.fromDate(nextMonth),
        });
        console.log(`${user_uid} 사용자 재결제 성공`);

      } catch (error) {
        // 6. 결제 실패 시 처리 (기존과 동일)
        console.error(`${user_uid} 사용자 재결제 실패:`, error.response?.data);
        await db.collection('users').doc(user_uid).update({
          subscriptionStatus: 'payment_failed',
        });
      }
    });

    await Promise.all(chargePromises);
    res.status(200).json({ status: "success", message: "스케줄링된 결제가 처리되었습니다." });

  } catch (error) {
    console.error("스케줄링 결제 처리 중 에러 발생:", error);
    res.status(500).json({ status: "failed", message: "서버 내부 오류" });
  }
};
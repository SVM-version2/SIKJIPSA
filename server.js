import dotenv from 'dotenv';
dotenv.config();

// /api/payments/verify
import express from "express";
import fetch from "node-fetch";
const router = express.Router();

const PORTONE_API_KEY = process.env.PORTONE_API_KEY;     // 테스트용
const PORTONE_API_SECRET = process.env.PORTONE_API_SECRET;

async function getAccessToken(){
  const res = await fetch("https://api.iamport.kr/users/getToken",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify({ imp_key: PORTONE_API_KEY, imp_secret: PORTONE_API_SECRET })
  });
  const data = await res.json();
  return data.response.access_token;
}

router.post("/verify", async (req,res)=>{
  const { imp_uid, merchant_uid } = req.body;
  const token = await getAccessToken();

  const payRes = await fetch(`https://api.iamport.kr/payments/${imp_uid}`,{
    headers:{ "Authorization": token }
  });
  const { response } = await payRes.json();

  // 1) 주문번호/금액 매칭
  const amountShouldBe = 2900; // 서버의 가격 소스와 비교
  const isOk = response.merchant_uid === merchant_uid &&
               response.amount === amountShouldBe &&
               response.status === "paid";

  if(isOk){
    // 여기서 Pro 권한 부여(예: Firestore users/{uid}.isPro=true)
    return res.json({ ok:true });
  }
  return res.status(400).json({ ok:false, reason:"verify_failed", response });
});

export default router;

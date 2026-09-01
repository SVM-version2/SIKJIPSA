// 구독 만료 판정에 사용할 "서버 기준 현재 시각"을 반환한다.
// 클라이언트 시계를 조작해 유료 권한을 연장하는 것을 막기 위해,
// 프론트엔드는 new Date() 대신 이 엔드포인트의 값을 받아 비교한다.
export default function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store, max-age=0');
  response.status(200).json({
    epochMs: Date.now(),
    iso: new Date().toISOString(),
  });
}

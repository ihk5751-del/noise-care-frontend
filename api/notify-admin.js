// api/notify-admin.js
// 입주민이 새 소음 기록을 저장하면, 해당 단지 관리사무소(직원 전원)에게 즉시 이메일로 알림을 보냅니다.
// 기존 api/notify-reply.js와 동일하게 Brevo API를 사용합니다. (환경변수 BREVO_API_KEY, SENDER_EMAIL 재사용)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { to, complexName, unitLabel, noiseTypeLabel, dayNight } = req.body || {};

  const recipients = Array.isArray(to) ? to.filter(Boolean) : (to ? [to] : []);
  if (recipients.length === 0) {
    return res.status(400).json({ error: 'to(수신자)가 필요합니다' });
  }

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: { email: process.env.SENDER_EMAIL, name: '층간케어' },
        to: recipients.map((email) => ({ email })),
        subject: `[층간케어] 새 민원이 접수됐어요${complexName ? ' · ' + complexName : ''}`,
        htmlContent: `
          <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 28px 24px; background:#F8F6F1;">
            <div style="font-size:11px; font-weight:700; color:#AD803D; letter-spacing:0.05em;">NOISE-CARE</div>
            <h2 style="color:#1E2A44; font-size:20px; margin:10px 0 4px;">새 민원이 접수됐어요</h2>
            <p style="color:#6b6259; font-size:13px; line-height:1.6; margin:0 0 18px;">
              ${complexName ? `<strong>${complexName}</strong>에 ` : ''}새로운 층간소음 민원이 등록됐습니다. 빠른 확인 부탁드려요.
            </p>
            <table style="width:100%; border-collapse:collapse; background:white; border-radius:10px; overflow:hidden; border:1px solid #E6E1D6;">
              ${unitLabel ? `<tr><td style="padding:10px 14px; color:#8c8375; font-size:11.5px; border-bottom:1px solid #E6E1D6;">동-호수</td><td style="padding:10px 14px; font-size:13px; font-weight:700; color:#23201C; border-bottom:1px solid #E6E1D6;">${unitLabel}</td></tr>` : ''}
              ${noiseTypeLabel ? `<tr><td style="padding:10px 14px; color:#8c8375; font-size:11.5px; border-bottom:1px solid #E6E1D6;">소음 유형</td><td style="padding:10px 14px; font-size:13px; font-weight:700; color:#23201C; border-bottom:1px solid #E6E1D6;">${noiseTypeLabel}</td></tr>` : ''}
              ${dayNight ? `<tr><td style="padding:10px 14px; color:#8c8375; font-size:11.5px;">시간대</td><td style="padding:10px 14px; font-size:13px; font-weight:700; color:#23201C;">${dayNight}</td></tr>` : ''}
            </table>
            <a href="https://noise-care-frontend.vercel.app" style="display:inline-block; margin-top:20px; background:#1E2A44; color:white; text-decoration:none; padding:11px 20px; border-radius:8px; font-size:13px; font-weight:700;">지금 확인하기</a>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Brevo 발송 실패:', errText);
      return res.status(502).json({ error: '메일 발송 실패' });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('관리사무소 알림 발송 오류:', err);
    return res.status(500).json({ error: err.message });
  }
}

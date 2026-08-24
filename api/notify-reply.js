// Vercel 서버리스 함수: 관리사무소 답변 등록 시 입주민에게 이메일 알림 발송
// 필요한 환경변수(Vercel 프로젝트 Settings > Environment Variables):
//   BREVO_API_KEY  - Brevo(구 Sendinblue) API 키
//   SENDER_EMAIL   - 인증된 발신 이메일 (예: noreply@friendsstudio.co.kr)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { to, complexName, unitLabel, replyText, noiseTypeLabel } = req.body || {};

  if (!to || !replyText) {
    res.status(400).json({ error: 'to, replyText는 필수입니다.' });
    return;
  }

  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.SENDER_EMAIL;

  if (!apiKey || !senderEmail) {
    console.error('BREVO_API_KEY 또는 SENDER_EMAIL 환경변수가 설정되어 있지 않습니다.');
    res.status(500).json({ error: '서버 이메일 설정이 완료되지 않았습니다.' });
    return;
  }

  const subject = `[${complexName || '층간케어'}] 소음 민원에 관리사무소 답변이 등록됐어요`;
  const htmlContent = `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #2b2b3a;">
      <h2 style="margin-bottom: 4px;">관리사무소 답변이 등록됐어요</h2>
      <p style="color: #6b6b7b; margin-top: 0;">${complexName || ''} ${unitLabel ? '· ' + unitLabel : ''}</p>
      ${noiseTypeLabel ? `<p style="color:#6b6b7b;">소음 유형: ${noiseTypeLabel}</p>` : ''}
      <div style="background:#f5f4ef; border-radius:12px; padding:16px; margin:16px 0;">
        <p style="margin:0; white-space:pre-wrap;">${replyText}</p>
      </div>
      <p style="color:#9a9aa8; font-size:13px;">앱에 접속하시면 전체 기록과 답변 내역을 확인하실 수 있어요.</p>
    </div>
  `;

  try {
    const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        sender: { email: senderEmail, name: '층간케어' },
        to: [{ email: to }],
        subject,
        htmlContent,
      }),
    });

    if (!brevoRes.ok) {
      const errText = await brevoRes.text();
      console.error('Brevo 발송 실패:', brevoRes.status, errText);
      res.status(502).json({ error: '이메일 발송에 실패했어요.' });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (e) {
    console.error('notify-reply 처리 중 오류:', e);
    res.status(500).json({ error: '서버 오류가 발생했어요.' });
  }
}

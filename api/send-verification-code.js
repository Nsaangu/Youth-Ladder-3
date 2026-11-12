import { Resend } from 'resend';

export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const { targetEmail, verificationCode } = await req.json();
    const resend = new Resend(process.env.RESEND_API_KEY);

    const { data, error } = await resend.emails.send({
      from: 'Youth Ladder Zambia <onboarding@resend.dev>',
      to: [targetEmail],
      subject: 'Your Youth Ladder Zambia Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 2rem auto; padding: 2rem; border-radius: 12px; background: #f0f7ff;">
          <h2 style="color: #1e40af;">Welcome to Youth Ladder Zambia 🇿🇲</h2>
          <p style="font-size: 16px; color: #1f2937;">Your 6-digit account verification code is:</p>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #2563eb; margin: 1.5rem 0; text-align: center; padding: 1rem; background: white; border-radius: 8px;">
            ${verificationCode}
          </div>
          <p style="font-size: 14px; color: #6b7280;">This code will expire in 15 minutes. If you did not request this, you can safely ignore this email.</p>
        </div>
      `,
    });

    if (error) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 400 });
    }
    return new Response(JSON.stringify({ success: true, message: "Verification email sent" }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.toString() }), { status: 500 });
  }
}
 

 

Step 3: Modify your existing  app.js  register flow code
Find the  send-verification-code  click event in your original  app.js , replace the old simulated alert logic with this new code:

document.getElementById("send-verification-code").addEventListener("click", async () => {
    pendingEmailCode = generateRandom6DigitCode();
    pendingRegisterEmail = document.getElementById("register-email").value.trim();
    pendingRegisterPassword = document.getElementById("register-password").value.trim();
    pendingRegisterId = document.getElementById("register-id").value.trim();
    if(!pendingRegisterEmail || !pendingRegisterPassword || !pendingRegisterId) return alert("Please fill all required fields first");
    
    // Call the real Vercel email API
    const sendResult = await fetch("/api/send-verification-code", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
            targetEmail: pendingRegisterEmail,
            verificationCode: pendingEmailCode
        })
    }).then(res => res.json());

    if(sendResult.success) {
        document.getElementById("email-verification-field").classList.remove("hidden");
        alert("6-digit verification code has been sent to your email, please check your inbox (and spam folder)");
    } else {
        alert(`Failed to send email: ${sendResult.error}, you can use the temporary test code: ${pendingEmailCode}`);
    }
})

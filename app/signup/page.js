
'use client'
import { useState, useEffect } from 'react'
import { send10MinuteVerificationCode, verifyUser6DigitCode } from '@/app-logic'
import { supabase } from '@/utils/supabase'

export default function SignUpPage() {
  const [userEmail, setUserEmail] = useState('')
  const [userPassword, setUserPassword] = useState('')
  const [submittedCode, setSubmittedCode] = useState('')
  const [countdownSeconds, setCountdownSeconds] = useState(0)
  const [isCodeSent, setIsCodeSent] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')

  // 10 minute auto countdown timer
  useEffect(() => {
    if (countdownSeconds <= 0) return

    const timer = setInterval(() => {
      setCountdownSeconds(prev => {
        if (prev <= 1) {
          setStatusMessage('⏰ Verification code expired, you can request a new one')
          setIsCodeSent(false)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [countdownSeconds])

  const handleSendCode = async (e) => {
    e.preventDefault()
    setStatusMessage('Sending your verification code...')
    const result = await send10MinuteVerificationCode(userEmail.trim())
    
    if (result.success) {
      setIsCodeSent(true)
      setCountdownSeconds(600) // Start exact 10 minute / 600 second timer
      setStatusMessage('✅ 6-digit code sent to your email, expires in 10 minutes')
    } else {
      setStatusMessage(`❌ Error: ${result.error}`)
    }
  }

  const handleFinalSignup = async (e) => {
    e.preventDefault()
    setStatusMessage('Verifying your code...')

    // First check the 6 digit code is still valid
    const verifyResult = await verifyUser6DigitCode(userEmail.trim(), submittedCode.trim())
    if (!verifyResult.success) {
      setStatusMessage(`❌ ${verifyResult.error}`)
      return
    }

    // Create the actual Supabase auth account after code passes
    const { data, error } = await supabase.auth.signUp({
      email: userEmail.trim(),
      password: userPassword,
    })

    if (error) {
      setStatusMessage(`❌ Account creation failed: ${error.message}`)
      return
    }

    setStatusMessage('🎉 Account created successfully! Redirecting you to the youth blog page...')
    setTimeout(() => window.location.href = '/blog', 2000)
  }

  // Format countdown to MM:SS
  const formatCountdown = () => {
    const mins = Math.floor(countdownSeconds / 60)
    const secs = countdownSeconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-center mb-6 text-blue-700">Join Youth Ladder</h1>

        {!isCodeSent ? (
          <form onSubmit={handleSendCode} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Your Email Address</label>
              <input
                type="email"
                required
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="yourname@example.com"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition"
            >
              Send 6 Digit Verification Code
            </button>
          </form>
        ) : (
          <form onSubmit={handleFinalSignup} className="space-y-4">
            <div className="text-center text-lg font-semibold text-red-600 bg-red-50 py-2 rounded-lg">
              ⏱️ Code expires in: {formatCountdown()}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">6 Digit Verification Code</label>
              <input
                type="text"
                maxLength={6}
                required
                value={submittedCode}
                onChange={(e) => setSubmittedCode(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-center text-2xl tracking-widest"
                placeholder="000000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Set Your Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={userPassword}
                onChange={(e) => setUserPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="At least 6 characters"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium transition"
            >
              Finish Creating Account
            </button>
          </form>
        )}

        {statusMessage && (
          <p className="mt-4 text-center text-sm text-gray-600">{statusMessage}</p>
        )}
      </div>
    </div>
  )
}


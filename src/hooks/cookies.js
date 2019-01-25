import { useState, useEffect } from 'react'
import { ethers } from 'ethers'

import { cookieName } from '../contexts'

export function useInitializeCookie (cookies) {
  const [cookieInitialized, setCookieInitialized] = useState(false)

  function initializeCookie () {
    const wallet = ethers.Wallet.createRandom()
    cookies.set(cookieName, wallet.privateKey, { secure: true, sameSite: 'strict' })
  }

  useEffect(() => {
    if (cookies.get(cookieName)) {
      setCookieInitialized(true)
    } else {
      initializeCookie()
      setCookieInitialized(true)
    }
  }, [])

  function resetCookie () {
    cookies.remove(cookieName)
    initializeCookie()
  }

  return [cookieInitialized, cookies.get(cookieName), resetCookie]
}

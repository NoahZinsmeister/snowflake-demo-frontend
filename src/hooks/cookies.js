import { useReducer, useEffect } from 'react'
import { ethers } from 'ethers'

const cookieName = 'privateKey'

function walletCookieReducer (state, action) {
  switch (action.type) {
    case 'EXISTING_WALLET_COOKIE':
      return { initialized: true, privateKey: action.payload }
    case 'NEW_WALLET_COOKIE':
      return { initialized: true, privateKey: action.payload }
    case 'RESET_WALLET_COOKIE':
      return { initialized: true, privateKey: action.payload }
    default:
      throw Error('No default case.')
  }
}

const initialWalletCookieState = { initialized: false, privateKey: null }

export function useWalletCookie (cookies) {
  const [walletCookie, dispatch] = useReducer(walletCookieReducer, initialWalletCookieState)

  function initializeWalletCookie () {
    const wallet = ethers.Wallet.createRandom()
    cookies.set(cookieName, wallet.privateKey, { secure: true })
    return wallet.privateKey
  }

  useEffect(() => {
    const existingPrivateKey = cookies.get(cookieName)
    if (existingPrivateKey) {
      dispatch({ type: 'EXISTING_WALLET_COOKIE', payload: existingPrivateKey })
    } else {
      const newPrivateKey = initializeWalletCookie()
      dispatch({ type: 'NEW_WALLET_COOKIE', payload: newPrivateKey })
    }
  }, [])

  function resetCookie () {
    const newPrivateKey = initializeWalletCookie()
    dispatch({ type: 'RESET_WALLET_COOKIE', payload: newPrivateKey })
  }

  return [walletCookie.privateKey, resetCookie]
}

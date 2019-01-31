import { useState, useMemo } from 'react'
import { ethers } from 'ethers'

const walletKey = 'SnowMoPrivateKey'

export function useLocalStorage (key) {
  const [item, setItem] = useState(() => window.localStorage.getItem(key))

  function setItemLocalStorage (item) {
    window.localStorage.setItem(key, item)
    setItem(item)
  }

  function removeItemLocalStorage () {
    window.localStorage.removeItem(key)
    setItem(null)
  }

  return [item, setItemLocalStorage, removeItemLocalStorage]
}

export function useLocalWalletManager () {
  const [privateKey, setPrivateKey, removePrivateKey] = useLocalStorage(walletKey)
  return { privateKey, setPrivateKey, removePrivateKey }
}

export function useWallet (privateKey) {
  const wallet = useMemo(() => {
    if (privateKey)
      return new ethers.Wallet(privateKey)
    else
      return null
  }, [privateKey])

  return wallet
}

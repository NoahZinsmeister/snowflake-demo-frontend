import { useState, useCallback, useEffect, useMemo } from 'react'
import { ethers } from 'ethers'
import { useWeb3Context } from 'web3-react'

import contracts from '../contracts'

export function useLocalStorage (key, transformer = value => value) {
  const [item, setItem] = useState(() => {
    const localStorageItem = window.localStorage.getItem(key)
    return localStorageItem ? transformer(localStorageItem) : null
  })

  function setItemLocalStorage (item) {
    window.localStorage.setItem(key, item)
    setItem(transformer(item))
  }

  function removeItemLocalStorage () {
    window.localStorage.removeItem(key)
    setItem(null)
  }

  return [item, setItemLocalStorage, removeItemLocalStorage]
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

export function useEIN (wallet) {
  const [ein, setEIN] = useState()
  const _1484Contract = useContract('1484')

  const fetchEIN = useCallback(() => {
    if (wallet === null) setEIN(null)
    else if (_1484Contract !== null) _1484Contract.functions.getEIN(wallet.address)
      .then(result => setEIN(result.toNumber()))
      .catch(() => setEIN(null))
  }, [wallet, _1484Contract])

  useEffect(() => { fetchEIN() }, [fetchEIN])

  return [ein, fetchEIN]
}

export function useContract(contractName) {
  const context = useWeb3Context()

  const contract = useMemo(() => {
    if (context.library)
      return new ethers.Contract(contracts[contractName].address, contracts[contractName].ABI, context.library)
    else
      return null
  }, [contractName, context.library])

  return contract
}

export function useContractAddress(contractName) {
  return useMemo(() => contracts[contractName].address, [contractName])
}

export function useBlockValue(fetchFunction, depends) {
  const context = useWeb3Context()
  const [value, setValue] = useState()

  function fetchLatest () {
    fetchFunction()
      .then(v => setValue(v))
  }

  useEffect(() => {
    fetchLatest()
  }, depends)

  useEffect(() => {
    context.library.on('block', fetchLatest)
    return () => context.library.removeAllListeners('block')
  }, depends)

  return value
}
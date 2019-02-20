import { useState, useReducer, useCallback, useEffect, useMemo } from 'react'
import { ethers } from 'ethers'
import { useWeb3Context } from 'web3-react'

import { getContract, getContractAddress, getEINAddress, getEINDetails } from '../utilities'

function localStorageReducer(state, action) {
  switch (action.type) {
    case 'SET': {
      return { ...state, ...action.payload }
    }
    case 'UNSET': {
      return {
        ...state,
        ...(action.payload).reduce((accumulator, currentValue) => {
          accumulator[currentValue] = null
          return accumulator
        }, {})
      }
    }
    default: {
      throw Error()
    }
  }
}

function localStorageInit({ key, contentKeys }) {
  const localStorageItem = window.localStorage.getItem(key)
  return localStorageItem ? JSON.parse(localStorageItem) : contentKeys.reduce((accumulator, currentValue) => {
    accumulator[currentValue] = null
    return accumulator
  }, {})
}

export function useLocalStorageObject (key, contentKeys) {
  const [state, dispatch] = useReducer(localStorageReducer, { key, contentKeys }, localStorageInit)

  function setItemLocalStorage (contentKeysAndValues) {
    dispatch({ type: 'SET', payload: contentKeysAndValues })
  }

  function removeItemLocalStorage (contentKeys) {
    dispatch({ type: 'UNSET', payload: contentKeys })
  }

  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(state))
  })

  return [state, setItemLocalStorage, removeItemLocalStorage]
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
      return getContract(context.library, contractName)
    else
      return null
  }, [contractName, context.library])

  return contract
}

export function useContractAddress(contractName) {
  return useMemo(() => getContractAddress(contractName), [contractName])
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

export function useEINDetails(ein) {
  const context = useWeb3Context()

  const [address, setAddress] = useState()
  const [publicKey, setPublicKey] = useState()

  // set recipient address from EIN
  useEffect(() => {
    setPublicKey()
    if (ein) {
      getEINAddress(context.library, ein)
        .then(address => {
          setAddress(address)
          fetchPublicKey(ein, address)
        })
        .catch(() => {
          setAddress()
        })
    }
  }, [ein])

  function fetchPublicKey(ein, address) {
    getEINDetails(context.library, ein, address)
      .then(({ publicKey }) => {
        setPublicKey(publicKey)
      })
      .catch(() => {
        setPublicKey()
      })
  }

  return { address, publicKey }
}

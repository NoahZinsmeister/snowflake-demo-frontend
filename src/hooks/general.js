import { useState, useEffect, useContext, useRef, useMemo } from 'react'
import { ethers } from 'ethers'
import { useWeb3Context } from 'web3-react/hooks'

import { cookieName, CookieContext } from '../contexts'
import contracts from '../contracts'

export function useWallet () {
  const context = useContext(CookieContext)
  // we don't need to worry about re-renders because we keyed the cookie context
  const wallet = useRef(new ethers.Wallet(context[cookieName]))
  return wallet.current
}

export function useContract(contractName) {
  const context = useWeb3Context()
  const contract = useMemo(() =>
    new ethers.Contract(contracts[contractName].address, contracts[contractName].ABI, context.library)
  , [contractName])
  return contract
}

export function useContractAddress(contractName) {
  return useMemo(() => contracts[contractName].address, [contractName])
}

export function useEIN () {
  const wallet = useWallet()
  const _1484Contract = useContract('1484')
  const [ein, setEIN] = useState()

  function fetchEIN () {
    _1484Contract.functions.getEIN(wallet.address)
      .then(result => {
        setEIN(result.toNumber())
      })
      .catch(e => {
        setEIN(null)
      })
  }

  useEffect(() => { fetchEIN() }, [])

  return [ein, fetchEIN]
}

export function useSendingWallet () {
  const context = useWeb3Context()
  // we don't need to worry about re-renders because we keyed the cookie context
  const sendingWallet = useRef(
    new ethers.Wallet('0x0000000000000000000000000000000000000000000000000000000000000123').connect(context.library)
  )

  return sendingWallet.current
}

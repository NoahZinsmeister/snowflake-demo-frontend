import { useState, useEffect, useMemo } from 'react'
import { ethers } from 'ethers'
import { useWeb3Context } from 'web3-react/hooks'

import contracts from '../contracts'

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

export function useLocalEIN (wallet) {
  const _1484Contract = useContract('1484')

  const [ein, setEIN] = useState()

  function fetchEIN () {
    if (wallet === null) setEIN(null)
    if (wallet && _1484Contract)
      _1484Contract.functions.getEIN(wallet.address)
        .then(result => setEIN(result.toNumber()))
        .catch(() => setEIN(null))
  }

  useEffect(() => { fetchEIN() }, [wallet, _1484Contract])

  return [ein, fetchEIN]
}

import { useState, useReducer, useCallback, useEffect, useMemo } from 'react'
import { ethers, utils } from 'ethers'
import { useWeb3Context } from 'web3-react'
import EthCrypto from 'eth-crypto'

import contracts from '../contracts'

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

export function useEINDetails(ein) {
  const snowMoResolver = useContract("SnowMoResolver")
  const _1484 = useContract("1484")
  const snowflakeAddress = useContractAddress("Snowflake")
  const demoHelperAddress = useContractAddress("DemoHelper")
  const context = useWeb3Context()

  const [address, setAddress] = useState()
  const [publicKey, setPublicKey] = useState()

  // set recipient address from EIN
  useEffect(() => {
    setPublicKey()
    if (ein) {
      _1484.functions.getIdentity(ein)
        .then(i => {
          const recoveredAddress = i.associatedAddresses[0]
          setAddress(recoveredAddress)
          fetchPublicKey(ein, recoveredAddress)
        })
        .catch(() => {
          setAddress()
        })
    } else {
      setAddress()
    }
  }, [ein])

  function fetchPublicKey(ein, address) {
    const filter = snowMoResolver.filters['SnowMoSignup'](Number(ein))
    filter.fromBlock = 3749195
    context.library.getLogs(filter)
      .then(log => {
        if (log && log[0] && log[0].transactionHash) {
          context.library.getTransaction(log[0].transactionHash)
            .then(receipt => {
              // decoded args from snow-mo signup
              const decoded = utils.defaultAbiCoder.decode(
                ['address', 'address', 'uint8', 'bytes32', 'bytes32', 'uint256'], `0x${receipt.data.substring(10)}`
              )
              const signature = `${decoded[3]}${decoded[4].substring(2)}${decoded[2] === 27 ? '1b' : '1c'}`
              const hash = utils.solidityKeccak256(
                ['bytes1', 'bytes1', 'address', 'string', 'address', 'address', 'address[]', 'address[]', 'uint256'],
                [
                  '0x19', '0x00', _1484.address, 'I authorize the creation of an Identity on my behalf.',
                  address, address, [snowflakeAddress, demoHelperAddress], [], decoded[5]
                ]
              )

              const prefixedHash = utils.solidityKeccak256(
                ['string', 'bytes32'],
                ['\x19Ethereum Signed Message:\n32', hash]
              )

              const publicKey = EthCrypto.recoverPublicKey(signature, prefixedHash)
              setPublicKey(publicKey)
            })
        }
      })
  }

  return { address, publicKey }
}
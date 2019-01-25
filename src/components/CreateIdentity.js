import React, { useState, useEffect, useRef } from 'react'
import Button from '@material-ui/core/Button'
import { ethers } from 'ethers'
import { useWeb3Context } from 'web3-react/hooks'

import { useWallet, useSendingWallet, useContract, useContractAddress } from '../hooks/general'

// TODO add currency preference to the create identity
export default function CreateIdentity ({ reFetchEIN }) {
  const context = useWeb3Context()
  const [transactionHash, setTransactionHash] = useState()
  const _1484Address = useContractAddress("1484")
  const wallet = useWallet()
  const snowflakeAddress = useContractAddress("Snowflake")
  const demoHelper = useContract("DemoHelper")
  const timestamp = useRef(Math.round(new Date() / 1000) - 120)

  const identityCreationMessage = useRef(ethers.utils.arrayify(ethers.utils.solidityKeccak256(
    ['bytes1', 'bytes1', 'address', 'string', 'address', 'address', 'address[]', 'address[]', 'uint256'],
    [
      '0x19', '0x00', _1484Address, 'I authorize the creation of an Identity on my behalf.',
      wallet.address, wallet.address, [snowflakeAddress, demoHelper.address], [], timestamp.current
    ]
  )))

  const [signature, setSignature] = useState()
  const sendingWallet = useSendingWallet()

  useEffect(() => {
    wallet.signMessage(identityCreationMessage.current)
      .then(signature => setSignature(ethers.utils.splitSignature(signature)))
  }, [])

  function sendTransaction () {
    demoHelper.connect(sendingWallet).functions.createIdentityDelegated(
      wallet.address, "0x0000000000000000000000000000000000000000", signature.v, signature.r, signature.s, timestamp.current
    )
      .then(transaction => setTransactionHash(transaction.hash))
  }

  useEffect(() => {
    if (transactionHash) {
      context.library.on(transactionHash, () => reFetchEIN())
      return () => context.library.removeAllListeners(transactionHash)
    }
  }, [transactionHash])

  return (
    <>
      <Button disabled={!(!!signature)} onClick={sendTransaction}>Create Identity</Button>
      {transactionHash && <p>{transactionHash}</p>}
    </>
  )
}

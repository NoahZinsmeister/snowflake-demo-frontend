import React, { useState, useEffect, useRef } from 'react'
import { ethers } from 'ethers'

import { useContract, useContractAddress } from '../hooks/general'

// TODO add currency preference to the create identity
export default function CreateIdentity ({ wallet, setDemoBegun, setTransactionHash, children: Button, classes }) {
  const _1484Address = useContractAddress("1484")
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

  useEffect(() => {
    wallet.signMessage(identityCreationMessage.current)
      .then(signature => setSignature(ethers.utils.splitSignature(signature)))
  }, [])

  function sendTransaction () {
    setDemoBegun(true)
    const to = demoHelper.address
    const transactionData = demoHelper.interface.functions.createIdentityDelegated.encode([
      wallet.address, "0x0000000000000000000000000000000000000000",
      signature.v, signature.r, signature.s, timestamp.current
    ])

    fetch('/.netlify/functions/provider', { method: 'POST', body: JSON.stringify({ to, transactionData }) })
      .then(response => response.json())
      .then(json => setTransactionHash(json.transactionHash))
      .catch(error => console.error(error))
  }

  return <Button disabled={!(!!signature)} onClick={sendTransaction} />
}

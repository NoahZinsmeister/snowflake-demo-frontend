import { useState, useEffect, useMemo, useRef } from 'react'
import { ethers } from 'ethers'

import { useContract, useContractAddress } from '../hooks/general'

// TODO add currency preference to the create identity
export default function CreateIdentity ({ wallet, onClick, setTransactionHash, children }) {
  const _1484Address = useContractAddress("1484")
  const snowflakeAddress = useContractAddress("Snowflake")
  const demoHelper = useContract("DemoHelper")
  const timestamp = useRef(Math.round(new Date() / 1000) - 120)

  const identityCreationMessage = useMemo(() => {
    if (wallet.address)
      return ethers.utils.arrayify(ethers.utils.solidityKeccak256(
        ['bytes1', 'bytes1', 'address', 'string', 'address', 'address', 'address[]', 'address[]', 'uint256'],
        [
          '0x19', '0x00', _1484Address, 'I authorize the creation of an Identity on my behalf.',
          wallet.address, wallet.address, [snowflakeAddress, demoHelper.address], [], timestamp.current
        ]
      ))
  }, [wallet.address])

  const [signature, setSignature] = useState()

  useEffect(() => {
    if (wallet.address)
      wallet.signMessage(identityCreationMessage)
        .then(signature => setSignature(ethers.utils.splitSignature(signature)))
  }, [wallet.address])

  function sendTransaction () {
    onClick()
    const to = demoHelper.address
    const transactionData = demoHelper.interface.functions.createIdentityDelegated.encode([
      wallet.address, "0x0000000000000000000000000000000000000000",
      signature.v, signature.r, signature.s, timestamp.current
    ])

    // console.log(to, transactionData)
    // setTransactionHash('0xff130ca9228c8f161e533ce31e4bbddcf3de77fe0a0210ae8484e37cac1bf4e5')

    fetch('/.netlify/functions/provider', { method: 'POST', body: JSON.stringify({ to, transactionData }) })
      .then(response => response.json())
      .then(json => setTransactionHash(json.transactionHash))
      .catch(error => console.error(error))
  }

  return children(sendTransaction)
}

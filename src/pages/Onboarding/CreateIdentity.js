import React, { useState, useEffect, useMemo, useRef } from 'react'
import { utils } from 'ethers'

import { useContract, useContractAddress } from '../../hooks'
import TransactionController from '../../components/TransactionController'

// TODO add currency preference to the create identity
export default function CreateIdentity ({ wallet, onClick, onTransactionHash, onReset, children }) {
  const _1484Address = useContractAddress("1484")
  const snowflakeAddress = useContractAddress("Snowflake")
  const demoHelper = useContract("DemoHelper")
  const timestamp = useRef(Math.round(new Date() / 1000) - 120)

  const identityCreationMessage = useMemo(() => {
    if (wallet)
      return utils.arrayify(utils.solidityKeccak256(
        ['bytes1', 'bytes1', 'address', 'string', 'address', 'address', 'address[]', 'address[]', 'uint256'],
        [
          '0x19', '0x00', _1484Address, 'I authorize the creation of an Identity on my behalf.',
          wallet.address, wallet.address, [snowflakeAddress, demoHelper.address], [], timestamp.current
        ]
      ))
  }, [wallet])

  const [signature, setSignature] = useState()

  useEffect(() => {
    if (wallet)
      wallet.signMessage(identityCreationMessage)
        .then(signature => setSignature(utils.splitSignature(signature)))
  }, [wallet, identityCreationMessage])

  async function method () {
    return {
      to: demoHelper.address,
      transactionData: demoHelper.interface.functions.createIdentityDelegated.encode([
        wallet.address, "0x0000000000000000000000000000000000000000",
        signature.v, signature.r, signature.s, timestamp.current
      ])
    }
  }

  return (
    <TransactionController method={method} onClick={onClick} onTransactionHash={onTransactionHash} onReset={onReset}>
      {children}
    </TransactionController>
  )
}

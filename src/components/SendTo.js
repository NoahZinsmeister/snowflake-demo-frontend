import React, { useState, useEffect } from 'react'
import Button from '@material-ui/core/Button'
import TextField from '@material-ui/core/TextField'
import { useWeb3Context, useNetworkEffect } from 'web3-react/hooks'
import { toDecimal, fromDecimal } from 'web3-react/utilities'
import { ethers } from 'ethers'

import { useWallet, useSendingWallet, useContract } from '../hooks/general'

export default function SendTo ({ ein }) {
  const [recipientEIN, setRecipientEIN] = useState({value: '', error: null})
  const [maxEIN, setMaxEIN] = useState()
  const [recipientAmount, setRecipientAmount] = useState({value: '', error: null})
  const [snowflakeBalance, setSnowflakeBalance] = useState()

  const [transactionHash, setTransactionHash] = useState()

  const context = useWeb3Context()

  const wallet = useWallet()
  const sendingWallet = useSendingWallet()
  const snowMoResolver = useContract("SnowMoResolver")
  const _1484 = useContract("1484")
  const snowflake = useContract("Snowflake")

  function updateMaxEIN () {
    _1484.functions.nextEIN()
      .then(latestMaxEIN => {
        if (latestMaxEIN.toNumber() !== maxEIN)
          setMaxEIN(latestMaxEIN.toNumber())
      })
  }

  function updateSnowflakeBalance () {
    snowflake.functions.deposits(ein)
      .then(latestSnowflakeBalance => {
        if (Number(toDecimal(latestSnowflakeBalance.toString(10), 18)) !== snowflakeBalance)
          setSnowflakeBalance(Number(toDecimal(latestSnowflakeBalance.toString(10), 18)))
      })
  }

  // update the maxEIN and snowflakeBalance immediately, and once every block
  useNetworkEffect(() => {
    updateMaxEIN()
    updateSnowflakeBalance()
    context.library.on('block', updateMaxEIN)
    context.library.on('block', updateSnowflakeBalance)
    return () => {
      context.library.removeAllListeners('block')
    }
  })

  // ensure that when the maxEIN updates, the recipientEIN is re-validated
  useEffect(() => {
    validateCurrentRecipientEIN()
  }, [maxEIN])

  // ensure that when the snowflakeBalance updates, the recipientAmount is re-validated
  useEffect(() => {
    validateCurrentRecipientAmount()
  }, [snowflakeBalance])

  useEffect(() => {
    if (transactionHash) {
      context.library.on(transactionHash, () => context.forceAccountReRender())
      return () => context.library.removeAllListeners(transactionHash)
    }
  }, [transactionHash])

  async function getSignedPermission (transactionBytes) {
    const nonce = await snowflake.functions.signatureNonce(ein)

    const allowAndCallMessage = ethers.utils.arrayify(ethers.utils.solidityKeccak256(
      ['bytes1', 'bytes1', 'address', 'string', 'uint256', 'address', 'uint256', 'bytes', 'uint256'],
      [
        '0x19', '0x00', snowflake.address, 'I authorize this allow and call.',
        ein, snowMoResolver.address, fromDecimal(recipientAmount.value, 18), transactionBytes, nonce.toString()
      ]
    ))

    return wallet.signMessage(allowAndCallMessage)
      .then(signature => ethers.utils.splitSignature(signature))
  }

  async function sendTransaction () {
    // encode snowMoResolver.functions.sendTo(ein, recipientEIN.value, recipientAmount.value)
    const functionSelector = ethers.utils.hexDataSlice(ethers.utils.id('sendTo(uint256,uint256,uint256)'), 0, 4)
    const abiEncodedArguments = ethers.utils.defaultAbiCoder.encode(
      ['uint256', 'uint256', 'uint256'], [ein, recipientEIN.value, fromDecimal(recipientAmount.value, 18)]
    )
    const transactionBytes = `${functionSelector}${abiEncodedArguments.substring(2)}`

    const permission = await getSignedPermission(transactionBytes)

    snowflake.connect(sendingWallet).functions.allowAndCallDelegated(
      snowMoResolver.address, fromDecimal(recipientAmount.value, 18), transactionBytes, wallet.address,
      permission.v, permission.r, permission.s
    )
      .then(transaction => setTransactionHash(transaction.hash))
  }

  function validateCurrentRecipientEIN () {
    if (recipientEIN.value >= maxEIN)
      setRecipientEIN({ ...recipientEIN, error: 'Please specify a valid EIN.'})
  }

  function updateRecipientEIN (event) {
    if (event.target.value === '' || /^[1-9]+[0-9]*$/.test(event.target.value)) {
      const errorMessage = (!maxEIN || Number(event.target.value) < maxEIN) ? null : 'Please specify a valid EIN.'
      setRecipientEIN({ value: event.target.value, error: errorMessage })
    }
  }

  function validateCurrentRecipientAmount () {
    if (recipientAmount.value >= snowflakeBalance)
      setRecipientAmount({ ...recipientEIN, error: 'Cannot send more than your current balance.'})
  }

  function updateRecipientAmount (event) {
    if (event.target.value === '' || /^[1-9]+[0-9]*$/.test(event.target.value)) {
      const errorMessage = (!maxEIN || Number(event.target.value) < snowflakeBalance) ?
        null : 'Cannot send more than your current balance.'
      setRecipientAmount({ value: event.target.value, error: errorMessage })
    }
  }

  return (
    <form>
      <TextField
        label="Recipient EIN"
        helperText={recipientEIN.error ? recipientEIN.error : "The EIN you wish to send funds to."}
        error={!!recipientEIN.error}
        value={recipientEIN.value}
        onChange={updateRecipientEIN}
        fullWidth
      />
      <TextField
        label="Amount"
        helperText={recipientAmount.error ? recipientAmount.error : "The number of HYDRO tokens you wish to send."}
        error={!!recipientAmount.error}
        value={recipientAmount.value}
        onChange={updateRecipientAmount}
        fullWidth
      />
      <Button onClick={sendTransaction}>Send</Button>
      {transactionHash && <p>{transactionHash}</p>}
    </form>
  )
}

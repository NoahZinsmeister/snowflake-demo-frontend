import React, { useState, useEffect } from 'react'
import Button from '@material-ui/core/Button'
import TextField from '@material-ui/core/TextField'
import Snackbar from '@material-ui/core/Snackbar';
import Typography from '@material-ui/core/Typography';
import { makeStyles } from '@material-ui/styles';
import { useWeb3Context } from 'web3-react/hooks'
import { fromDecimal } from 'web3-react/utilities'
import { ethers } from 'ethers'
import { getEtherscanLink } from 'web3-react/utilities'

import { useContract } from '../hooks/general'

const useStyles = makeStyles({
  inputWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  input: {
    flex: '1 1 auto',
    margin: '1em !important',
  },
  button: {
    flex: '0 1 auto',
    margin: '1em !important',
  }
})

export default function SendTo ({ wallet, ein, maxEIN, snowflakeBalance }) {
  const classes = useStyles()
  const [recipientEIN, setRecipientEIN] = useState({value: '', error: null})
  const [recipientAmount, setRecipientAmount] = useState({value: '', error: null})

  const canSend = (
    recipientEIN.error === null && recipientAmount.error === null &&
    recipientEIN.value !== '' && recipientAmount.value !== '' &&
    Number(recipientEIN.value) !== ein
  )

  const [transactionHash, setTransactionHash] = useState()

  const context = useWeb3Context()
  const _1484 = useContract("1484")
  const DAI = useContract("DAI")
  const snowMoResolver = useContract("SnowMoResolver")
  const snowflake = useContract("Snowflake")

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
      context.library.once(transactionHash, () => {
        setRecipientEIN({ value: '', error: null })
        setRecipientAmount({ value: '', error: null })
        context.forceAccountReRender()
        setTransactionState('unsent')
        setTransactionHash(null)
      })
      return () => context.library.removeAllListeners(transactionHash)
    }
  }, [transactionHash])

  function resetTransactionState () {
    setTransactionState('unsent')
  }

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

  const [transactionState, setTransactionState] = useState('unsent')

  async function sendTransaction () {
    setTransactionState('waiting')

    async function getEncodedSendTo () {
      // encode snowMoResolver.functions.sendTo
      const functionSelector = ethers.utils.hexDataSlice(
        ethers.utils.id('sendTo(uint256,uint256,uint256,string)'), 0, 4
      )
      const abiEncodedArguments = ethers.utils.defaultAbiCoder.encode(
        ['uint256', 'uint256', 'uint256', 'string'],
        [ein, recipientEIN.value, fromDecimal(recipientAmount.value, 18), '']
      )
      const transactionBytes = `${functionSelector}${abiEncodedArguments.substring(2)}`

      return transactionBytes
    }

    async function getEncodedForceWithdrawToVia () {
      // encode snowMoResolver.functions.forceWithdrawToVia
      const functionSelector = ethers.utils.hexDataSlice(
        ethers.utils.id('forceWithdrawToVia(uint256,address,uint256,address,string)'), 0, 4
      )

      const recipientIdentity = await _1484.functions.getIdentity(recipientEIN.value)
      const addressTo = recipientIdentity.associatedAddresses[0]

      const abiEncodedArguments = ethers.utils.defaultAbiCoder.encode(
        ['uint256', 'address', 'uint256', 'address', 'string'],
        [ein, addressTo, fromDecimal(recipientAmount.value, 18), DAI.address, '']
      )
      const transactionBytes = `${functionSelector}${abiEncodedArguments.substring(2)}`

      return transactionBytes
    }

    const defaultIsHYDRO = (await snowMoResolver.functions.tokenPreferences(ein)) === ethers.constants.AddressZero

    const transactionBytes = await (defaultIsHYDRO ? getEncodedSendTo() : getEncodedForceWithdrawToVia())

    const permission = await getSignedPermission(transactionBytes)

    const to = snowflake.address
    const transactionData = snowflake.interface.functions.allowAndCallDelegated.encode([
      snowMoResolver.address, fromDecimal(recipientAmount.value, 18), transactionBytes, wallet.address,
      permission.v, permission.r, permission.s
    ])

    fetch('/.netlify/functions/provider', { method: 'POST', body: JSON.stringify({ to, transactionData }) })
      .then(async response => {
        const json = await response.json()
        if (response.status !== 200) throw Error(json.message)
        return json
      })
      .then(json => setTransactionHash(json.transactionHash))
      .catch(error => {
        console.error(error)
        setTransactionState('error')
      })
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
      const errorMessage = (!maxEIN || Number(event.target.value) <= snowflakeBalance) ?
        null : 'Cannot send more than your current balance.'
      setRecipientAmount({ value: event.target.value, error: errorMessage })
    }
  }

  return (
    <>
      <Typography variant='h5' align='center' >
        Send HYDRO
      </Typography>

      <form>
        <div className={classes.inputWrapper}>
          <TextField
            disabled={transactionState === 'waiting'}
            className={classes.input}
            label="To"
            helperText={recipientEIN.error ? recipientEIN.error : "The EIN you want to send tokens to."}
            error={!!recipientEIN.error}
            value={recipientEIN.value}
            onChange={updateRecipientEIN}
          />
          <TextField
            disabled={transactionState === 'waiting'}
            className={classes.input}
            label="Amount"
            helperText={recipientAmount.error ? recipientAmount.error : "The number of tokens you want to send."}
            error={!!recipientAmount.error}
            value={recipientAmount.value}
            onChange={updateRecipientAmount}
          />
          <div className={classes.button}>
            <Button
              disabled={!canSend || transactionState === 'waiting'} variant='contained' color='secondary'
              onClick={transactionState === 'unsent' ? sendTransaction : resetTransactionState}
            >
              {transactionState === 'error' && 'Error. Try Again?'}
              {transactionState === 'unsent' && 'Send'}
              {transactionState === 'waiting' && 'Waiting on Confirmation...'}
            </Button>
          </div>
        </div>
      </form>
      <div>
        <Snackbar
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
          open={!!transactionHash}
          message={<span>Waiting on Transaction...</span>}
          action={[
            <Button
              component='a' target='_blank' href={getEtherscanLink(context.networkId, 'transaction', transactionHash)}
              key="etherscan" size="small" color='secondary'
            >
              Link
            </Button>
          ]}
        />
      </div>
    </>
  )
}

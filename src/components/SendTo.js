import React, { useState, useEffect } from 'react'
import Button from '@material-ui/core/Button'
import TextField from '@material-ui/core/TextField'
import Typography from '@material-ui/core/Typography';
import { makeStyles } from '@material-ui/styles';
import { ethers } from 'ethers'

import TransactionController from './TransactionController'
import { useContract } from '../hooks'

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
  },
  title: {
    marginTop: '2em'
  }
})

export default function SendTo ({
  wallet, ein, maxEIN, snowflakeBalance,
  currentTransactionHash, setCurrentTransactionHash
}) {
  const classes = useStyles()
  const [recipientEIN, setRecipientEIN] = useState({value: '', error: null})
  const [recipientAmount, setRecipientAmount] = useState({value: '', error: null})

  const canSend = (
    !currentTransactionHash && 
    recipientEIN.error === null && recipientAmount.error === null &&
    recipientEIN.value !== '' && recipientAmount.value !== '' &&
    Number(recipientEIN.value) !== ein
  )

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

  function addTransactionHash(transactionHash) {
    setCurrentTransactionHash(transactionHash)
  }

  function resetForm () {
    setRecipientEIN({ value: '', error: null })
    setRecipientAmount({ value: '', error: null })
  }

  async function getSignedPermission (transactionBytes) {
    const nonce = await snowflake.functions.signatureNonce(ein)

    const allowAndCallMessage = ethers.utils.arrayify(ethers.utils.solidityKeccak256(
      ['bytes1', 'bytes1', 'address', 'string', 'uint256', 'address', 'uint256', 'bytes', 'uint256'],
      [
        '0x19', '0x00', snowflake.address, 'I authorize this allow and call.',
        ein, snowMoResolver.address, ethers.utils.parseUnits(recipientAmount.value, 18), transactionBytes, nonce.toString()
      ]
    ))

    return wallet.signMessage(allowAndCallMessage)
      .then(signature => ethers.utils.splitSignature(signature))
  }

  async function method () {
    // encode snowMoResolver.functions.sendTo
    const functionSelector = ethers.utils.hexDataSlice(
      ethers.utils.id('sendTo(uint256,uint256,uint256,string)'), 0, 4
    )
    const abiEncodedArguments = ethers.utils.defaultAbiCoder.encode(
      ['uint256', 'uint256', 'uint256', 'string'],
      [ein, recipientEIN.value, ethers.utils.parseUnits(recipientAmount.value, 18), '']
    )
    const transactionBytes = `${functionSelector}${abiEncodedArguments.substring(2)}`

    const permission = await getSignedPermission(transactionBytes)

    const to = snowflake.address
    const transactionData = snowflake.interface.functions.allowAndCallDelegated.encode([
      snowMoResolver.address, ethers.utils.parseUnits(recipientAmount.value, 18), transactionBytes, wallet.address,
      permission.v, permission.r, permission.s
    ])

    return { to, transactionData }
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
      <div className={classes.title}>
        <Typography variant='h5' align='center' >
          Send Hydro
        </Typography>
      </div>

      <form>
        <div className={classes.inputWrapper}>
          <TransactionController
            method={method}
            onTransactionHash={addTransactionHash}
            onReset={resetForm}
          >
            {(transactionState, transactionControllers) => {
              function getButton () {
                switch (transactionState) {
                  case 'unsent': {
                    return (
                      <Button
                        disabled={!canSend}
                        variant='contained' color='secondary'
                        onClick={transactionControllers.sendTransaction}
                      >
                        Send
                      </Button>
                    )
                  }
                  case 'waitingOnTransactionHash':
                  case 'waitingOnConfirmation': {
                    return (
                      <Button
                        disabled={true}
                        variant='contained' color='secondary'
                      >
                        Waiting on Confirmation...
                      </Button>
                    )
                  }
                  case 'receipt': {
                    return (
                      <Button
                        variant='contained' color='secondary'
                        onClick={transactionControllers.resetTransaction}
                      >
                        Success! Send again?
                      </Button>
                    )
                  }
                  case 'error': {
                    return (
                      <Button
                        variant='contained' color='secondary'
                        onClick={transactionControllers.resetTransaction}
                      >
                        Error. Try again?
                      </Button>
                    )
                  }
                  default:
                    return null
                }
              }

              return (
                <>
                  <TextField
                    disabled={transactionState !== 'unsent'}
                    className={classes.input}
                    label="To"
                    helperText={recipientEIN.error ? recipientEIN.error : "The EIN you want to send tokens to."}
                    error={!!recipientEIN.error}
                    value={recipientEIN.value}
                    onChange={updateRecipientEIN}
                  />
                  <TextField
                    disabled={transactionState !== 'unsent'}
                    className={classes.input}
                    label="Amount"
                    helperText={recipientAmount.error ? recipientAmount.error : "The number of tokens you want to send."}
                    error={!!recipientAmount.error}
                    value={recipientAmount.value}
                    onChange={updateRecipientAmount}
                  />
                  <div className={classes.button}>
                    {getButton()}
                  </div>
                </>
              )
            }}
          </TransactionController>
        </div>
      </form>
    </>
  )
}

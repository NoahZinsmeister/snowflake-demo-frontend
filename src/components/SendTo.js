import React, { useRef, useState, useEffect } from 'react'
import Button from '@material-ui/core/Button'
import TextField from '@material-ui/core/TextField'
import Typography from '@material-ui/core/Typography';
import InputAdornment from '@material-ui/core/InputAdornment'
import AccountCircle from '@material-ui/icons/AccountCircle'
import { makeStyles } from '@material-ui/styles';
import { ethers } from 'ethers'

import TransactionController from './TransactionController'
import { useContract, useEINDetails, useDebounced } from '../hooks'
import { encryptMessage } from '../utilities'

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
  },
  identiconCardContent: {
    width: '25px',
    height: '25px',
    marginLeft: '-1px',
    marginRight: '-1px'
  }  
})

export default function SendTo ({
  wallet, ein, maxEIN, snowflakeBalance,
  currentTransactionHash, setCurrentTransactionHash
}) {
  const classes = useStyles()

  const snowMoResolver = useContract("SnowMoResolver")
  const snowflake = useContract("Snowflake")

  const [recipientEIN, setRecipientEIN] = useState({value: '', error: null})
  const debouncedEIN = useDebounced(recipientEIN.error ? undefined : recipientEIN.value, 200)
  const [recipientAmount, setRecipientAmount] = useState({value: '', error: null})
  const [plaintextMessage, setPlaintextMessage] = useState({value: '', error: null})

  const { address: recipientEINAddress, publicKey: recipientPublicKey } = useEINDetails(debouncedEIN)

  const canSend = (
    !currentTransactionHash && 
    recipientEIN.error === null && recipientAmount.error === null &&
    debouncedEIN !== '' && recipientAmount.value !== '' &&
    !!(plaintextMessage.value === '' || plaintextMessage.error === null)
  )

  // set the recipient EIN identicon ref
  const identiconRef = useRef()
  useEffect(() => {
    if (identiconRef.current) {
      if (recipientEINAddress) {
        identiconRef.current.innerHTML = ''
        identiconRef.current.appendChild(window.hydroIdenticon.create({
          seed: recipientEINAddress,
          size: 25
        }))
      } else {
        identiconRef.current.innerHTML = ''
      }
    }
  }, [recipientEINAddress, identiconRef.current])

  function addTransactionHash(transactionHash) {
    setCurrentTransactionHash(transactionHash)
  }

  function resetForm () {
    setRecipientEIN({ value: '', error: null })
    setRecipientAmount({ value: '', error: null })
    setPlaintextMessage({ value: '', error: null })
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

    const ciphertext = plaintextMessage.value === ''
      ? ''
      : encryptMessage(plaintextMessage.value, wallet.privateKey, recipientPublicKey)

    const abiEncodedArguments = ethers.utils.defaultAbiCoder.encode(
      ['uint256', 'uint256', 'uint256', 'string'],
      [
        ein, recipientEIN.value, ethers.utils.parseUnits(recipientAmount.value, 18),
        ciphertext
      ]
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

  // ensure that when the maxEIN updates, the recipientEIN is re-validated
  useEffect(() => {
    validateCurrentRecipientEIN()
  }, [maxEIN, debouncedEIN])

  function validateCurrentRecipientEIN () {
    if (recipientEIN.value >= maxEIN)
      setRecipientEIN({ ...recipientEIN, error: 'Please specify a valid EIN.'})
    if (Number(recipientEIN.value) === Number(ein))
      setRecipientEIN({ ...recipientEIN, error: 'Cannot send to your own EIN.' })
  }

  function updateRecipientEIN (event) {
    if (event.target.value === '' || /^[1-9]+[0-9]*$/.test(event.target.value)) {
      const errorMessage = (!maxEIN || Number(event.target.value) < maxEIN) ? null : 'Please specify a valid EIN.'
      setRecipientEIN({ value: event.target.value, error: errorMessage })
    }
  }

  // ensure that when the snowflakeBalance updates, the recipientAmount is re-validated
  useEffect(() => {
    validateCurrentRecipientAmount()
  }, [snowflakeBalance])

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
  
  useEffect(() => {
    if (debouncedEIN && recipientEINAddress && recipientPublicKey === null) {
      setPlaintextMessage({ value: '', error: 'Cannot send secret messages to this EIN.' })
    } else {
      setPlaintextMessage({ value: '', error: null })
    }
  }, [debouncedEIN, recipientEINAddress, recipientPublicKey])

  function updatePlaintextMessage (event) {
    if (recipientPublicKey && event.target.value.length <= 200) {
      setPlaintextMessage({ value: event.target.value, error: null })      
    }

    if (!recipientPublicKey) {
      setPlaintextMessage({ value: '', error: 'Cannot send secret messages to this EIN.' })
    }

    if (event.target.value.length > 200) {
      setPlaintextMessage(state => ({ value: state.value, error: 'Message length exceeded.' }))
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
                    required
                    helperText={recipientEIN.error ? recipientEIN.error : "The EIN you want to send tokens to."}
                    error={!!recipientEIN.error}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          {recipientEINAddress
                            ? <div className={classes.identiconCardContent} ref={identiconRef} />
                            : <AccountCircle />
                          }
                        </InputAdornment>
                      ),
                    }}
                    value={recipientEIN.value}
                    onChange={updateRecipientEIN}
                  />
                  <TextField
                    disabled={transactionState !== 'unsent'}
                    className={classes.input}
                    label="Amount"
                    required
                    helperText={recipientAmount.error ? recipientAmount.error : "The number of tokens you want to send."}
                    error={!!recipientAmount.error}
                    value={recipientAmount.value}
                    onChange={updateRecipientAmount}
                  />
                  <TextField
                    disabled={transactionState !== 'unsent' || plaintextMessage.error !== null || !recipientPublicKey}
                    className={classes.input}
                    label="Secret Message"
                    helperText={plaintextMessage.error === null
                      ? "An optional message that can only be read by the recipient."
                      : plaintextMessage.error
                    }
                    error={
                      plaintextMessage.error !== null &&
                      plaintextMessage.error !== 'Cannot send secret messages to this EIN.'
                    }
                    value={plaintextMessage.value}
                    onChange={updatePlaintextMessage}
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

import React, { useState, useEffect } from 'react'
import DialogTitle from '@material-ui/core/DialogTitle';
import Dialog from '@material-ui/core/Dialog';
import Button from '@material-ui/core/Button';
import Typography from '@material-ui/core/Typography';
import { makeStyles } from '@material-ui/styles';
import FormGroup from '@material-ui/core/FormGroup';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Switch from '@material-ui/core/Switch';
import { getEtherscanLink } from 'web3-react/utilities'
import { ethers } from 'ethers'
import { useWeb3Context } from 'web3-react/hooks'

import { useContract } from '../hooks/general'

const useStyles = makeStyles({
  centered: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    margin: '1em'
  },
  spacer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    margin: '1em'
  },
  DAI: {
    color: '#ffce45 !important'
  },
  HYDRO: {
    color: '#0971F5 !important'
  }
})

export default function SettingsModal ({ ein, wallet, log, currencyPreference, open, onClose, removePrivateKey }) {
  const classes = useStyles()

  const context = useWeb3Context()
  const DAI = useContract("DAI")
  const snowflake = useContract("Snowflake")
  const snowMoResolver = useContract("SnowMoResolver")
  const [showPrivateKey, setShowPrivateKey] = useState(false)
  const [defaultCurrencyCurrent, setDefaultCurrencyCurrent] = useState(null)
  const canChangeDefaultCurrency = defaultCurrencyCurrent !== currencyPreference

  useEffect(() => {
    resetTransactionState()
    setDefaultCurrencyCurrent(currencyPreference)
    }, [currencyPreference])

  function toggleDefaultCurrencyCurrent () {
    const toggle = defaultCurrencyCurrent === ethers.constants.AddressZero ? DAI.address : ethers.constants.AddressZero
    setDefaultCurrencyCurrent(toggle)
  }

  const transactionHash = log && log[0] && log[0].transactionHash

  const [transactionState, setTransactionState] = useState('unsent')

  async function getSignedPermission (transactionBytes) {
    const nonce = await snowflake.functions.signatureNonce(ein)

    const allowAndCallMessage = ethers.utils.arrayify(ethers.utils.solidityKeccak256(
      ['bytes1', 'bytes1', 'address', 'string', 'uint256', 'address', 'uint256', 'bytes', 'uint256'],
      [
        '0x19', '0x00', snowflake.address, 'I authorize this allow and call.',
        ein, snowMoResolver.address, 0, transactionBytes, nonce.toString()
      ]
    ))

    return wallet.signMessage(allowAndCallMessage)
      .then(signature => ethers.utils.splitSignature(signature))
  }

  // const [transactionState, setTransactionState] = useState('unsent')

  async function sendTransaction () {
    setTransactionState('waiting')

    // encode snowMoResolver.functions.changeTokenPreference
    const functionSelector = ethers.utils.hexDataSlice(
      ethers.utils.id('changeTokenPreference(uint256,address)'), 0, 4
    )
    const abiEncodedArguments = ethers.utils.defaultAbiCoder.encode(
      ['uint256', 'address'],
      [ein, defaultCurrencyCurrent]
    )
    const transactionBytes = `${functionSelector}${abiEncodedArguments.substring(2)}`

    const permission = await getSignedPermission(transactionBytes)

    const to = snowflake.address
    const transactionData = snowflake.interface.functions.allowAndCallDelegated.encode([
      snowMoResolver.address, 0, transactionBytes, wallet.address,
      permission.v, permission.r, permission.s
    ])

    // TODO make this more robust
    fetch('/.netlify/functions/provider', { method: 'POST', body: JSON.stringify({ to, transactionData }) })
      .then(async response => {
        const json = await response.json()
        if (response.status !== 200) throw Error(json.message)
        return json
      })
      .then(json => console.log(json.transactionHash))
      .catch(error => {
        console.error(error)
        setTransactionState('error')
      })
  }

  function resetTransactionState () {
    setTransactionState('unsent')
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth='md'>
      <DialogTitle align='center'>Settings</DialogTitle>
      <div className={classes.centered}>
        <div className={classes.spacer}>
          <Button color='secondary' variant='contained' onClick={() => setShowPrivateKey(v => !v)}>
            Show Private Key
          </Button>

          {showPrivateKey && (
            <Typography variant='body1' align='center' paragraph={true}>
              {wallet.privateKey}
            </Typography>
          )}
        </div>

        <div className={classes.spacer}>
          <Button
            component='a' href={getEtherscanLink(context.networkId, 'transaction', transactionHash)} target='_blank'
            color='secondary' variant='contained'
          >
            View Creation Transaction
          </Button>
        </div>

        <div className={classes.spacer}>
          <FormGroup row>
            <FormControlLabel
              control={
                <Switch
                  disabled={defaultCurrencyCurrent === null || transactionState === 'waiting'}
                  checked={defaultCurrencyCurrent === ethers.constants.AddressZero}
                  onChange={toggleDefaultCurrencyCurrent}
                  classes={{switchBase: classes.DAI, checked: classes.HYDRO}} color="default"
                />
              }
              label={`Default Currency: ${currencyPreference === ethers.constants.AddressZero ? 'HYDRO' : 'DAI'}`}
              labelPlacement="top"
            />
          </FormGroup>
          {canChangeDefaultCurrency &&
            <Button disabled={transactionState === 'waiting'} color='secondary' variant='contained'
              onClick={transactionState === 'unsent' ? sendTransaction : resetTransactionState}
            >
              {transactionState === 'error' && 'Error. Try Again?'}
              {transactionState === 'unsent' &&
                `Change Default Currency to ${currencyPreference === ethers.constants.AddressZero ? 'DAI' : 'HYDRO'}?`
              }
              {transactionState === 'waiting' && 'Waiting on Confirmation...'}
            </Button>
          }
      </div>

      <div className={classes.spacer}>
        <Button
          component='a' href='https://github.com/NoahHydro/snowflake-demo-frontend' target='_blank'
          color='secondary' variant='contained'
        >
          View Code on Github
        </Button>
      </div>

        <div className={classes.spacer}>
          <Button color='secondary' variant='contained' onClick={removePrivateKey}>Reset Demo</Button>
        </div>
      </div>
    </Dialog>
  )
}

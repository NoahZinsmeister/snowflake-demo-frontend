import React, { useState, useMemo, useRef, useEffect } from 'react'
import Typography from '@material-ui/core/Typography';
import { ethers } from 'ethers'
import Button from '@material-ui/core/Button';
import RefreshIcon from '@material-ui/icons/Refresh';
import { makeStyles } from '@material-ui/styles';

import CreateIdentity from '../CreateIdentity'
import { useWallet } from '../../hooks/localStorage'

// TODO fix flickering ref setting
const useStyles = makeStyles({
  section: {
    marginTop: '1em',
  },
  centered: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column'
  },
  rightIcon: {
    marginLeft: '.5em',
  },
  flexMargin: {
    display: 'flex',
    height: '150px',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    marginTop: '1em',
  },
  noDecoration: {
    color: 'inherit'
  },
  identicon: {
    height: 150,
    margin: '1em',
  }
})

// TODO add currency preference to the create identity
export default function SelectIdentity ({ stepCompleted, proceed, setPrivateKey, setTransactionHash }) {
  const classes = useStyles()

  const [currentWalletCandidate, setCurrentWalletCandidate] = useState({})

  const wallet = useWallet(currentWalletCandidate.privateKey)

  function generateNewWallet () {
    setCurrentWalletCandidate(ethers.Wallet.createRandom())
  }

  const identiconRef = useRef()

  const identicon = useMemo(() => {
    if (stepCompleted)
      return window.hydroIdenticon.create({
        seed: wallet.address,
        size: 150
      })
    else if (currentWalletCandidate.address)
      return window.hydroIdenticon.create({
        seed: currentWalletCandidate.address,
        size: 150
      })
  }, [currentWalletCandidate.address, stepCompleted])

  useEffect(() => {
    if (identiconRef.current && (currentWalletCandidate.address || stepCompleted)) {
      identiconRef.current.innerHTML = ''
      identiconRef.current.appendChild(identicon)
    }
  }, [currentWalletCandidate.address, stepCompleted])

  const [transactionState, setTransactionState] = useState('unsent')

  function apiCallMade () {
    setTransactionState('waiting')
  }

  function finalizeIdentity (transactionHash) {
    setPrivateKey(currentWalletCandidate.privateKey)
    setTransactionHash(transactionHash)
    proceed()
  }

  return stepCompleted ? (
    <>
      <Typography variant='body2' align='center'>
        Your avatar:
      </Typography>

      <div className={classes.centered}>
        <div className={classes.identicon} ref={identiconRef} />
        <Button variant='contained' color='secondary' onClick={proceed}>
          Next
        </Button>
      </div>
    </>
  ) : (
    <>
      <Typography variant='body1' paragraph={true}>
        Let's get started by creating a unique blockchain avatar, or{' '}
        <a
          className={classes.noDecoration}
          href='https://github.com/HydroBlockchain/smart-contracts/tree/master/snowflake'
          target='_blank' rel="noopener noreferrer"
        >
          Snowflake
        </a>
        , to represent your account!
      </Typography>

      <div className={classes.centered}>
        <Button
          variant='contained'
          color={currentWalletCandidate.address ? 'default' : 'secondary'} onClick={generateNewWallet}
          disabled={transactionState === 'waiting'}
        >
          Generate Avatar
          <RefreshIcon className={classes.rightIcon} />
        </Button>

        <div className={classes.identicon} ref={identiconRef} />

        <CreateIdentity
          wallet={currentWalletCandidate}
          onClick={apiCallMade}
          setTransactionHash={finalizeIdentity}
        >
          {sendTransaction => (
            <Button
              disabled={!(!!currentWalletCandidate.address) || transactionState === 'waiting'}
              variant='contained' color='secondary'
              onClick={sendTransaction}
            >
              {transactionState === 'waiting' ? 'Confirming Your Choice...' : 'Finalize Your Choice'}
            </Button>
          )
          }
        </CreateIdentity>
      </div>
    </>
  )
}

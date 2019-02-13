import React, { useState, useMemo, useRef, useEffect } from 'react'
import Typography from '@material-ui/core/Typography';
import { ethers } from 'ethers'
import Button from '@material-ui/core/Button';
import RefreshIcon from '@material-ui/icons/Refresh';
import { makeStyles } from '@material-ui/styles';

import CreateIdentity from './CreateIdentity'

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
export default function SelectIdentity ({ stepCompleted, wallet, proceed }) {
  const classes = useStyles()

  const [currentWalletCandidate, setCurrentWalletCandidate] = useState()

  function generateNewWallet () {
    setCurrentWalletCandidate(ethers.Wallet.createRandom())
  }

  const identiconRef = useRef()

  const identicon = useMemo(() => {
    if (!wallet && !currentWalletCandidate) return null

    const seed = (Number.isInteger(stepCompleted) && stepCompleted >= 0) ? wallet.address : currentWalletCandidate.address
    return window.hydroIdenticon.create({
      seed,
      size: 150
    })
  }, [stepCompleted, wallet, currentWalletCandidate])

  useEffect(() => {
    if (identicon) {
      identiconRef.current.innerHTML = ''
      identiconRef.current.appendChild(identicon)
    }
  }, [identicon])

  const [generationDisabled, setGenerationDisabled] = useState(false)

  return (Number.isInteger(stepCompleted) && stepCompleted >= 0) ? (
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
          color={currentWalletCandidate ? 'default' : 'secondary'} onClick={generateNewWallet}
          disabled={generationDisabled}
        >
          Generate Avatar
          <RefreshIcon className={classes.rightIcon} />
        </Button>

        <div className={classes.identicon} ref={identiconRef} />

        <CreateIdentity
          wallet={currentWalletCandidate}
          onClick={() => setGenerationDisabled(true)}
          onTransactionHash={transactionHash => proceed(currentWalletCandidate.privateKey, transactionHash)}
          onReset={() => setGenerationDisabled(false)}
        >
          {(transactionState, transactionControllers) => {
            switch (transactionState) {
              case 'unsent': {
                return (
                  <Button
                    disabled={!currentWalletCandidate}
                    variant='contained' color='secondary'
                    onClick={transactionControllers.sendTransaction}
                  >
                    Finalize Your Choice
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
                    Confirming Your Choice...
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
          }}
        </CreateIdentity>
      </div>
    </>
  )
}

import React, { useState, useEffect } from 'react'
import { withRouter } from 'react-router'
import Stepper from '@material-ui/core/Stepper';
import Step from '@material-ui/core/Step';
import StepLabel from '@material-ui/core/StepLabel';
import { makeStyles } from '@material-ui/styles';
import { useWeb3Context } from 'web3-react';

import SelectIdentity from './0_SelectIdentity'
import Fund from './1_Fund'
import Confirm from './2_Confirm'

const useStyles = makeStyles(theme => ({
  root: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    width: '100%',
    [theme.breakpoints.down('sm')]: {
      minHeight: '100%'
    },
    [theme.breakpoints.up('sm')]: {
      minHeight: '75%'
    }
  },
  wrapper: {
    margin: '2em',
    padding: '2em',
    borderRadius: '2em',
    backgroundColor: theme.palette.grey[200],
    [theme.breakpoints.down('sm')]: {
      width: '80%'
    },
    [theme.breakpoints.up('sm')]: {
      width: '50%'
    }
  },
  centered: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column'
  },
  noDecoration: {
    color: 'inherit'
  },
  transparent: {
    backgroundColor: 'transparent !important'
  }
}))

const stepLabels = ['Select Avatar', 'Add Funds', 'Confirm Identity']

// TODO add currency preference
function Onboarding ({
  activeStep, stepCompleted, setStepCompleted,
  setPrivateKey, wallet, creationTransactionHash, setCreationTransactionHash, reFetchEIN,
  history, location
}) {
  const context = useWeb3Context()
  const classes = useStyles()

  // keep track of whether the transaction has been confirmed
  const [creationTransactionMined, setCreationTransactionMined] = useState(false)

  useEffect(() => {
    if (creationTransactionHash) {
      context.library.once(creationTransactionHash, () => setCreationTransactionMined(true))
      return () => context.library.removeAllListeners(creationTransactionHash)
    }
  }, [creationTransactionHash])

  function completeStep (newStepCompleted) {
    if (!stepCompleted || stepCompleted < newStepCompleted) {
      setStepCompleted(newStepCompleted)
    }
    history.push(location.pathname, { activeStep: Math.min(newStepCompleted + 1, 2) })
  }

  function selectIdentityProceed (privateKey, transactionHash) {
    if (privateKey && transactionHash) {
      setPrivateKey(privateKey)
      setCreationTransactionHash(transactionHash)
    }
    completeStep(0)
  }

  function fundProceed () {
    completeStep(1)
  }

  function confirmProceed () {
    reFetchEIN()
    completeStep(2)
  }

  function getActiveStep () {
    switch (activeStep) {
      case 0:
        return (
          <SelectIdentity
            stepCompleted={stepCompleted}
            wallet={wallet}
            proceed={selectIdentityProceed}
          />
        )
      case 1:
        return (
          <Fund
            stepCompleted={stepCompleted}
            proceed={fundProceed}
          />
        )
      case 2:
        return (
          <Confirm
            wallet={wallet}
            creationTransactionMined={creationTransactionMined}
            proceed={confirmProceed}
          />
        )
      default:
        return null
    }
  }

  return (
    <>
      <Stepper className={classes.transparent} activeStep={activeStep} alternativeLabel>
        {stepLabels.map(label => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>
      {getActiveStep()}
    </>
  )
}

export default withRouter(Onboarding)

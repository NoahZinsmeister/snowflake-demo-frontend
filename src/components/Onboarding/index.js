import React, { useState, useEffect } from 'react'
import { withRouter } from 'react-router'
import Stepper from '@material-ui/core/Stepper';
import Step from '@material-ui/core/Step';
import StepLabel from '@material-ui/core/StepLabel';
import { makeStyles } from '@material-ui/styles';
import { useWeb3Context } from 'web3-react/hooks';

import SelectIdentity from './SelectIdentity'
import Fund from './Fund'
import Confirm from './Confirm'
import { useLocalStorage } from '../../hooks/localStorage'

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

const defaultState = { activeStep: 0 }

const stepCompletedKey = 'SnowMoStepCompleted'
const transactionHashKey = 'SnowMoTransactionHash'


// TODO add currency preference
function Onboarding ({ reFetchEIN, history, location, setPrivateKey }) {
  const context = useWeb3Context()
  const classes = useStyles()

  // use localStorage to store the currently completed step and the transaction hash
  const [stepCompleted, setStepCompleted, removeStepCompleted] = useLocalStorage(stepCompletedKey)
  const [transactionHash, setTransactionHash, removeTransactionHash] = useLocalStorage(transactionHashKey)

  // use history to support 'back' functionality within on-boarding steps
  const { activeStep } = location.state || defaultState

  // keep track of whether the transaction has been confirmed
  const [transactionMined, setTransactionMined] = useState(false)

  useEffect(() => {
    if (transactionHash) {
      context.library.once(transactionHash, () => setTransactionMined(true))
      return () => context.library.removeAllListeners(transactionHash)
    }
  }, [transactionHash])

  function logCompletedStep () {
    if (isNaN(Number(stepCompleted)) || Number(stepCompleted) < activeStep) {
      setStepCompleted(activeStep)
    }
    history.push(location.pathname,  { activeStep: activeStep + 1 })
  }

  function selectIdentityProceed () {
    logCompletedStep()
  }

  function fundProceed () {
    logCompletedStep()
  }

  function confirmProceed () {
    removeStepCompleted()
    removeTransactionHash()
  }

  function getActiveStep () {
    if (!activeStep || activeStep === 0)
      return (
        <SelectIdentity
          stepCompleted={stepCompleted && Number(stepCompleted) >= 0 }
          proceed={selectIdentityProceed}
          setPrivateKey={setPrivateKey}
          setTransactionHash={setTransactionHash}
        />
      )
    else if (Number(activeStep) === 1)
      return (
        <Fund
          stepCompleted={stepCompleted && Number(stepCompleted) >= 1 }
          proceed={fundProceed}
        />
      )
    else if (Number(activeStep) === 2)
      return (
        <Confirm
          reFetchEIN={reFetchEIN} transactionHash={transactionHash} transactionMined={transactionMined}
          proceed={confirmProceed}
        />
      )
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

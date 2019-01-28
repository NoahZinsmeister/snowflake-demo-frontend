import React, { useState, useEffect, useRef } from 'react'
import { useWeb3Context } from 'web3-react/hooks'
import Typography from '@material-ui/core/Typography';
import Stepper from '@material-ui/core/Stepper';
import Step from '@material-ui/core/Step';
import StepLabel from '@material-ui/core/StepLabel';
import Button from '@material-ui/core/Button';
import { makeStyles } from '@material-ui/styles';
import { getEtherscanLink } from 'web3-react/utilities'

// TODO fix flickering ref setting
const useStyles = makeStyles({
  section: {
    marginTop: '1em',
  },
  transparent: {
    backgroundColor: 'transparent !important'
  },
  flex: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column'
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
}, { index: 0 })

// TODO add currency preference to the create identity
export default function Onboarding ({ wallet, transactionHash, reFetchEIN }) {
  const classes = useStyles()
  const context = useWeb3Context()
  const [transactionMined, setTransactionMined] = useState(false)
  const [proceedClicked, setProceedClicked] = useState(false)
  const [activeStep, setActiveStep] = useState(0);

  const identicon = useRef(window.hydroIdenticon.create({
    seed: wallet.address,
    size: 150
  }))

  const identiconRef = useRef()

  useEffect(() => {
    if (identiconRef.current && identiconRef.current.innerHTML === "") {
      identiconRef.current.appendChild(identicon.current)
    }
  })

  useEffect(() => {
    if (transactionHash) {
      context.library.on(transactionHash, () => setTransactionMined(true))
      return () => context.library.removeAllListeners(transactionHash)
    }
  }, [transactionHash])

  useEffect(() => {
    if (transactionMined && proceedClicked)
      reFetchEIN()
  }, [transactionMined, proceedClicked])

  function handleNext() {
    if (activeStep < 3)
      setActiveStep(activeStep + 1)
    else
      setProceedClicked(true)
  }

  const stepLabels = useRef(['Generate Wallet', 'Add Funding', 'Create Identity'])

  const stepCompletedContents = useRef([
    (
      <>
        <Typography variant='body2' align='center' color='secondary'>
          <a
            className={classes.noDecoration}
            href={getEtherscanLink(context.networkId, 'address', wallet.address)}
            target='_blank'
            rel='noopener noreferrer'
          >
            {wallet.address}
          </a>
        </Typography>
      </>
    ),
    (
      <>
        <Typography variant='body2'>
          10,000 HYDRO deposited!
        </Typography>
      </>
    ),
    <div className={classes.flexMargin}>
      <div ref={identiconRef} />
    </div>
  ])

  const stepActiveContents = useRef([
    (
      <>
        <Typography variant='body1'>
          In order to send and receive funds, you'll need an Ethereum address. If you don't know what that means,{' '}
          don't worry! We've securely generated one for you:
        </Typography>
        <br />
        {stepCompletedContents.current[0]}
        <br />
        <Typography variant='body1'>
          You'll be able to back this up later, but for now we've stored it in a cookie in your browser.
        </Typography>
      </>
    ),
    (
      <>
        <Typography variant='body1'>
          The next step is adding some funds to your account. Since we're feeling generous, take 10,000 HYDRO on{' '}
          the house!
        </Typography>
      </>
    ),
    (
      <>
        <Typography variant='body1'>
          Finally, we need to create your user identity, or{' '}
          <a
            className={classes.noDecoration}
            href='https://github.com/HydroBlockchain/smart-contracts/tree/master/snowflake'
            target='_blank' rel="noopener noreferrer"
          >
            Snowflake
          </a>
          . We've already generated a unique profile for{' '}
          you, and your avatar is displayed below!
        </Typography>
        {stepCompletedContents.current[2]}
      </>
    ),
    (
      <>
        <Typography variant='body1'>
          You're ready to go! Finalize your account below.
        </Typography>
      </>
    )
  ])

  return (
    <div className={classes.flex}>
      <div className={classes.section}>
        <Stepper className={classes.transparent} activeStep={activeStep} alternativeLabel>
          {stepLabels.current.map(label => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </div>
      {activeStep > 0 && stepCompletedContents.current.slice(0, activeStep).map((content, i) => (
        <div key={i} className={classes.section}>
          {content}
        </div>
      ))}
      <div className={classes.section}>
        {stepActiveContents.current[activeStep]}
      </div>
      <div className={classes.section}>
        <Button
          variant={activeStep < 3 ? "outlined" : "contained"}
          color="secondary"
          onClick={handleNext}
        >
          {activeStep < 3 ? "Next" : (proceedClicked ? "Loading..." : "Proceed")}
        </Button>
      </div>
    </div>
  )
}

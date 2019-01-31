import React, { useState, useEffect } from 'react'
import Typography from '@material-ui/core/Typography';
import Fab from '@material-ui/core/Fab';
import { makeStyles } from '@material-ui/styles';

import IdentityCard from '../IdentityCard'
import { useLocalEIN } from '../../hooks/general'
import { useLocalWalletManager, useWallet } from '../../hooks/localStorage'

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
    marginBottom: '1em',
  },
  spacer: {
    marginTop: '1em'
  }
})

// TODO add currency preference to the create identity
export default function Confirm ({ reFetchEIN, transactionMined, transactionHash, proceed }) {
  const classes = useStyles()

  const { privateKey } = useLocalWalletManager()
  const wallet = useWallet(privateKey)

  const [enterDashboardClicked, setEnterDashboardClicked] = useState(false)
  const [ein, reFetchEINLocal] = useLocalEIN(wallet)

  useEffect(() => {
    if (transactionMined)
      reFetchEINLocal()
  }, [transactionMined])

  // ensure that the localStorage keys are removed
  useEffect(() => {
    if (enterDashboardClicked)
      return () => proceed()
  }, [enterDashboardClicked])

  function enterDashboard () {
    setEnterDashboardClicked(true)
    reFetchEIN()
  }

  return transactionMined ? (
    <div className={classes.centered}>
      <Typography variant='body1' paragraph={true}>
        Congratulations! You're almost ready to get started, please review your account details below:
      </Typography>

      <IdentityCard showBadge={true} wallet={wallet} ein={ein} snowflakeBalance={10000} daiBalance={0} />

      <div className={classes.spacer} />

      <Fab onClick={enterDashboard} variant="extended" color='secondary' size='large'>
        Enter Dashboard
      </Fab>
    </div>
  ) : (
    <Typography variant='body1' paragraph={true} align='center'>
      Finishing up...
    </Typography>
  )
}

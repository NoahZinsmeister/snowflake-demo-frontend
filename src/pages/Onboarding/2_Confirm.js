import React, { useEffect } from 'react'
import Typography from '@material-ui/core/Typography';
import Fab from '@material-ui/core/Fab';
import { makeStyles } from '@material-ui/styles';

import { ReactComponent as Spinner } from '../../assets/spinner.svg'
import IdentityCard from '../../components/IdentityCard'
import { useEIN } from '../../hooks'

const useStyles = makeStyles(theme => ({
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
  },
  spinnerContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center'
  },
  spinner: {
    fill: theme.palette.secondary.main
  }
}))

// TODO add currency preference to the create identity
export default function Confirm ({ wallet, creationTransactionMined, proceed }) {
  const classes = useStyles()

  const [ein, reFetchEINLocal] = useEIN(wallet)

  useEffect(() => {
    if (creationTransactionMined) {
      reFetchEINLocal()
    }
  }, [creationTransactionMined])

  return creationTransactionMined ? (
    <div className={classes.centered}>
      <Typography variant='body1' paragraph={true}>
        Congratulations! You're almost ready to get started, please review your account details below:
      </Typography>

      <IdentityCard showEINBadge={true} wallet={wallet} ein={ein} snowflakeBalance={10000} />

      <div className={classes.spacer} />

      <Fab onClick={proceed} variant="extended" color='secondary' size='large'>
        Enter Dashboard
      </Fab>
    </div>
  ) : (
    <div className={classes.spinnerContainer}>
      <Spinner className={classes.spinner} />
    </div>
  )
}

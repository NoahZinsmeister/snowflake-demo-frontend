import React, { useState } from 'react'
import Typography from '@material-ui/core/Typography';
import Fab from '@material-ui/core/Fab';
import { makeStyles } from '@material-ui/styles';

import CreateIdentity from '../components/CreateIdentity'
import Onboarding from '../components/Onboarding'

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
  noDecoration: {
    color: 'inherit'
  },
  flex: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: '1em'
  }
}))


// TODO add currency preference
export default function Landing ({ wallet, reFetchEIN }) {
  const classes = useStyles()
  const [demoBegun, setDemoBegun] = useState(false)
  const [transactionHash, setTransactionHash] = useState()

  return (
    <div className={classes.root}>
      <div className={classes.wrapper}>
        <Typography variant='h4' align='center'>
          Welcome to SnowMo
        </Typography>
        <Typography variant='subtitle1' align='center' color='secondary'>
          Peer-to-peer payments. Powered by{' '}
          <a
            className={classes.noDecoration} href='https://www.ethereum.org/' target='_blank' rel="noopener noreferrer"
          >
            Ethereum
          </a>
          .
        </Typography>
        {demoBegun ? <Onboarding wallet={wallet} reFetchEIN={reFetchEIN} transactionHash={transactionHash} /> : (
          <>
            <br />
            <Typography variant='body1'>
              SnowMo is a demo application showcasing the power of{' '}
              <a
                className={classes.noDecoration}
                href='https://github.com/HydroBlockchain/smart-contracts/tree/master/snowflake'
                target='_blank' rel="noopener noreferrer"
              >
                Snowflake
              </a>
              , a new platform for building user-centric blockchain applications.
            </Typography>
            <br/>
            <Typography variant='body1'>
              Ready to get started? Dive in below!
            </Typography>
            <div className={classes.flex}>
              <CreateIdentity wallet={wallet} setDemoBegun={setDemoBegun} setTransactionHash={setTransactionHash}>
                {props =>
                  <Fab variant="extended" color='secondary' size='large' {...props}>
                    Begin Demo
                  </Fab>
                }
              </CreateIdentity>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

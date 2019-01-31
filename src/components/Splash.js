import React from 'react'
import Typography from '@material-ui/core/Typography';
import { makeStyles } from '@material-ui/styles';

const useStyles = makeStyles(theme => ({
  wrapper: {
    margin: 'auto',
    padding: '2em',
    borderRadius: '2em',
    height: 'fit-content',
    backgroundColor: theme.palette.grey[200],
    [theme.breakpoints.down('sm')]: {
      width: '100%',
      height: 'fit-content',
    },
    [theme.breakpoints.up('md')]: {
      width: '50%',
    }
  },
  noDecoration: {
    color: 'inherit'
  }
}))

export default function Splash ({ children }) {
  const classes = useStyles()

  return (
    <div className={classes.wrapper}>
      <Typography variant='h4' align='center'>
        Welcome to SnowMo
      </Typography>
      <Typography variant='subtitle1' align='center' color='secondary' paragraph={true}>
        Peer-to-peer payments. Powered by{' '}
        <a
          className={classes.noDecoration} href='https://www.ethereum.org/' target='_blank' rel="noopener noreferrer"
        >
          Ethereum
        </a>
        .
      </Typography>
      {children}
    </div>
  )
}

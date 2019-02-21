import React from 'react'
import { Link } from 'react-router-dom'
import Typography from '@material-ui/core/Typography';
import Fab from '@material-ui/core/Fab';
import Button from '@material-ui/core/Button';
import { makeStyles } from '@material-ui/styles';

const useStyles = makeStyles(theme => ({
  noDecoration: {
    color: 'inherit'
  },
  centered: {
    display: 'flex',
    alignItems: 'center',
    flexDirection: 'column'
  },
  recover: {
    marginTop: '2em !important',
    marginBottom: '-1em !important',
    fontSize: '.7em !important',
    color: `${theme.palette.grey[700]} !important`
  }
}))

export default function Intro () {
  const classes = useStyles()

  return (
    <>
      <Typography variant='body1' paragraph={true}>
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

      <Typography variant='body1' paragraph={true}>
        Ready to get started?
      </Typography>

      <div className={classes.centered}>
        <Fab
          component={Link} to={{ pathname: '/start', state: { activeStep: 0 } }}
          variant="extended" color='secondary' size='large'
        >
          Begin
        </Fab>
        <Button
          className={classes.recover} component={Link} to='/recover' size="small"
        >
          Recover?
        </Button>
      </div>
    </>
  )
}

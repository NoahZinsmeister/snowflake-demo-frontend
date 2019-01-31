import React from 'react'
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';
import Card from '@material-ui/core/Card';
import { makeStyles } from '@material-ui/styles';

import { Balances } from '../IdentityCard'

// TODO fix flickering ref setting
const useStyles = makeStyles({
  centered: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column'
  },
  proceed: {
    marginTop: '1em'
  }
})

// TODO add currency preference to the create identity
export default function Fund ({ stepCompleted, proceed }) {
  const classes = useStyles()

  return stepCompleted ? (
    <>
      <Typography variant='body2' paragraph={true} align='center'>
        10,000 HYDRO claimed
      </Typography>

      <div className={classes.centered}>
        <Button variant='contained' color='secondary' onClick={proceed}>
          Next
        </Button>
      </div>
    </>
  ) : (
    <>
      <div className={classes.centered}>

      </div>

      <div className={classes.centered}>
        <Typography variant='body1' paragraph={true}>
          Congratulations! As a welcome gift, we've deposited 10,000 HYDRO tokens into your account. Later on,{' '}
          you'll be able to send these to your friends, or swap them for DAI!
        </Typography>

        <Card>
          <Balances snowflakeBalance={10000} daiBalance={0} />
        </Card>

        <div className={classes.proceed}>
          <Button variant='contained' color='secondary' onClick={proceed}>
            Proceed
          </Button>
        </div>
      </div>
    </>
  )
}

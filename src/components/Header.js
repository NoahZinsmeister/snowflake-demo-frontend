import React from 'react'
import { makeStyles } from '@material-ui/styles';

import IdentityCard from './IdentityCard'

const useStyles = makeStyles({
  centered: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    marginBottom: '1em'
  },
  identicon: {
    height: 150,
    marginBottom: '1em',
  },
  settingsIcon: {
    right: '-.75em',
    top: '-.75em',
    padding: '.25em !important',
  },
  settingsWrapper: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginBottom: '-.75em',
  }
})

export default function Header ({ wallet, ein, snowflakeBalance }) {
  const classes = useStyles()

  return (
    <div className={classes.centered}>
      <IdentityCard wallet={wallet} ein={ein} snowflakeBalance={snowflakeBalance} />
    </div>
  )
}

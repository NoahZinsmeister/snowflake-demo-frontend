import React, { useState } from 'react'
import IconButton from '@material-ui/core/IconButton';
import SettingsIcon from '@material-ui/icons/Settings';
import { makeStyles } from '@material-ui/styles';

import SettingsModal from './SettingsModal'
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

export default function Header ({ wallet, ein, snowflakeBalance, daiBalance, log, removePrivateKey }) {
  const classes = useStyles()

  const [settingsModalOpen, setSettingsModalOpen] = useState(false)

  return (
    <>
      <div className={classes.settingsWrapper}>
        <IconButton className={classes.settingsIcon} onClick={() => setSettingsModalOpen(true)}>
          <SettingsIcon />
        </IconButton>
      </div>

      <SettingsModal
        log={log} removePrivateKey={removePrivateKey} open={settingsModalOpen} onClose={() => setSettingsModalOpen(false)}
      />

      <div className={classes.centered}>
        <IdentityCard wallet={wallet} ein={ein} snowflakeBalance={snowflakeBalance} daiBalance={daiBalance} />
      </div>
    </>
  )
}

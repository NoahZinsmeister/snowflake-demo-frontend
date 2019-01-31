import React from 'react'
import DialogTitle from '@material-ui/core/DialogTitle';
import Dialog from '@material-ui/core/Dialog';
import Button from '@material-ui/core/Button';
import { makeStyles } from '@material-ui/styles';
import { getEtherscanLink } from 'web3-react/utilities'
import { useWeb3Context } from 'web3-react/hooks'

const useStyles = makeStyles({
  centered: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    margin: '1em'
  },
  spacer: {
    margin: '1em'
  }
})

export default function SettingsModal ({ log, open, onClose, removePrivateKey }) {
  const classes = useStyles()

  const context = useWeb3Context()

  const transactionHash = log && log[0] && log[0].transactionHash

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth='md'>
      <DialogTitle align='center'>Settings</DialogTitle>
      <div className={classes.centered}>
        <Button
          component='a' href={getEtherscanLink(context.networkId, 'transaction', transactionHash)} target='_blank'
          color='secondary' variant='contained'
        >
          View Creation Transaction
        </Button>
        <div className={classes.spacer} />
        <Button color='secondary' variant='contained' onClick={removePrivateKey}>Reset Demo</Button>
      </div>
    </Dialog>
  )
}

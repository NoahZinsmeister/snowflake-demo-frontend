import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import TextField from '@material-ui/core/TextField'
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';
import { makeStyles } from '@material-ui/styles';
import { ethers } from 'ethers'

import { fromBlock } from '../utilities'
import { useContract } from '../hooks'
import { useWeb3Context } from 'web3-react';

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
  },
  input: {
    marginTop: '1em !important',
    marginBottom: '2em !important'
  }
}))

export default function Recover({ setPrivateKeyAndCreationTransactionHash }) {
  const classes = useStyles()

  const context = useWeb3Context()

  const _1484 = useContract("1484")
  const snowMoResolver = useContract("SnowMoResolver")

  const [privateKey, setPrivateKey] = useState({ value: '', error: null })

  async function updatePrivateKey(event) {
    const input = event.target.value
    setPrivateKey(state => ({ ...state, value: input }))

    if ([64, 66].includes(input.length)) {
      const candidateKey = input.length === 64 ? `0x${input}` : input
      try {
        const wallet = new ethers.Wallet(candidateKey)
        const ein = await _1484.functions.getEIN(wallet.address)
          .then(ein => ein.toString())
          .catch(() => null)

        const filter = snowMoResolver.filters['SnowMoSignup'](Number(ein))
        filter.fromBlock = fromBlock

        const log = await context.library.getLogs(filter)

        if (log && log[0] && log[0].transactionHash) {
          setPrivateKeyAndCreationTransactionHash(input, log[0].transactionHash, 2)
        } else {
          setPrivateKey({ value: input, error: 'Error. Please try again later.' })
        }
      } catch (error) {
        setPrivateKey({ value: input, error: 'Please enter a valid key.' })
      }
    } else {
      setPrivateKey({ value: input, error: 'Please enter a valid key.' })
    }
  }

  return (
    <>
      <Typography variant='body1' paragraph={true}>
        You may recover your SnowMo account if you still have access to your private key.
      </Typography>

      <TextField
        className={classes.input}
        label="Private Key"
        fullWidth
        type="password"
        required
        helperText={privateKey.error ? privateKey.error : "A private key from an existing SnowMo account."}
        error={privateKey.error !== null}
        value={privateKey.value}
        onChange={updatePrivateKey}
      />

      <div className={classes.centered}>
        <Button
          className={classes.recover} component={Link} to='/' size="small"
        >
          Back
        </Button>
      </div>
    </>
  )
}

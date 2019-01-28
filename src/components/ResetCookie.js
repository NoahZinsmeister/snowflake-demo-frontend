import React from 'react'
import Button from '@material-ui/core/Button'

export default function ResetCookie ({ resetWalletCookie }) {
  return (
    <Button onClick={resetWalletCookie}>Reset Demo</Button>
  )
}

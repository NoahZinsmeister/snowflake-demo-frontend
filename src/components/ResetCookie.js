import React, { useContext } from 'react'
import Button from '@material-ui/core/Button'

import { CookieContext } from '../contexts'

export default function ResetCookie () {
  const context = useContext(CookieContext)
  return (
    <Button onClick={context.resetCookie}>Reset Demo</Button>
  )
}

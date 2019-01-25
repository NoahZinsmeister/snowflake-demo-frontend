import React from 'react'

export const cookieName = 'privateKey'

export const CookieContext = React.createContext({
  [cookieName]: undefined,
  resetCookie: () => {}
})

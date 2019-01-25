import React from 'react'

import CreateIdentity from '../components/CreateIdentity'

// TODO add currency preference
export default function Landing ({ reFetchEIN }) {
  return <CreateIdentity reFetchEIN={reFetchEIN} />
}

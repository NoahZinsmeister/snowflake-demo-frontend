const networkDataById = {
  1: {
    etherscanPrefix: ''
  },
  3: {
    etherscanPrefix: 'ropsten.'
  },
  4: {
    etherscanPrefix: 'rinkeby.'
  },
  5: {
    etherscanPrefix: 'goerli.'
  },
  42: {
    etherscanPrefix: 'kovan.'
  }
}

const etherscanTypes = {
  address: 'address',
  token: 'token',
  transaction: 'tx'
}

export const daillarGeneralAddress = '0x1111111111111111111111111111111111111111'

export function getEtherscanLink(networkId, type, data) {  
  const path = etherscanTypes[type]
  const prefix = networkDataById[networkId].etherscanPrefix

  return `https://${prefix}etherscan.io/${path}/${data}`
}
import EthCrypto from 'eth-crypto'
import { ethers, utils } from 'ethers'
import scrypt from 'scrypt-js'

import contracts from '../contracts'

const crypto = require('crypto')

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

async function getSharedSecret(privateKey, publicKey) {
  const sec = crypto.createECDH('secp256k1')
  sec.setPrivateKey(privateKey.substring(2), 'hex')
  const secret = sec.computeSecret(publicKey, 'hex')

  const N = 16384, r = 8, p = 1, dkLen = 32
  return await new Promise((resolve, reject) => {
    scrypt(secret, Buffer.from('801a2bbb220c4bdc8563c32ca60fb79a', 'hex'), N, r, p, dkLen, (error, _, key) => {
      if (error) {
        reject(error)
      }

      if (key) {
        resolve(new Uint8Array(key))
      }
    })
  })
}

async function getCipher(privateKey, publicKey) {
  const algorithm = 'aes-256-cbc'
  const secret = await getSharedSecret(privateKey, publicKey)
  const iv = crypto.randomBytes(16)

  const cipher = crypto.createCipheriv(algorithm, secret, iv)

  return { cipher, iv }
}

async function getDecipher(privateKey, publicKey, iv) {
  const algorithm = 'aes-256-cbc'
  const secret = await getSharedSecret(privateKey, publicKey)
  const decipher = crypto.createDecipheriv(algorithm, secret, iv)
  return decipher
}

export async function encryptMessage(plaintext, privateKey, publicKey) {
  const { cipher, iv } = await getCipher(privateKey, publicKey)
  let encrypted = cipher.update(plaintext, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  const concatenated = `${encrypted}${iv.toString('hex')}`

  return EthCrypto.hex.compress(concatenated, true)
}

export async function decryptMessage(compressedCiphertext, privateKey, publicKey) {
  // decipher compressedCiphertext
  const decompressed = EthCrypto.hex.decompress(compressedCiphertext, true).substring(2)
  const ciphertext = decompressed.substring(0, decompressed.length - 32)
  const iv = Buffer.from(decompressed.substring(decompressed.length - 32), 'hex')

  // get decipherer
  const decipher = await getDecipher(privateKey, publicKey, iv)

  let decrypted = decipher.update(ciphertext, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}

export function getContract(library, contractName) {
  return new ethers.Contract(contracts[contractName].address, contracts[contractName].ABI, library)  
}

export function getContractAddress(contractName) {
  return contracts[contractName].address
}

export async function getEINDetails(library, ein) {
  const snowMoResolver = getContract(library, "SnowMoResolver")
  const _1484 = getContract(library, "1484")
  const snowflakeAddress = getContractAddress("Snowflake")
  const demoHelperAddress = getContractAddress("DemoHelper")

  async function getAddress() {
    return await _1484.functions.getIdentity(ein)
      .then(i => i.associatedAddresses[0])
  }

  async function getSnowMoSignupReceipt() {
    const filter = snowMoResolver.filters['SnowMoSignup'](Number(ein))
    filter.fromBlock = 3749195

    const log = await library.getLogs(filter)

    if (!(log && log[0] && log[0].transactionHash)) {
      return null
    }

    return await library.getTransaction(log[0].transactionHash)
  }

  const { address, publicKey } = await Promise.all([getAddress(), getSnowMoSignupReceipt()])
    .then(async ([address, receipt]) => {
      if (receipt === null) {
        return { address, publicKey: null }
      }

      // decoded args from snow-mo signup
      const decoded = utils.defaultAbiCoder.decode(
        ['address', 'address', 'uint8', 'bytes32', 'bytes32', 'uint256'], `0x${receipt.data.substring(10)}`
      )
      const signature = `${decoded[3]}${decoded[4].substring(2)}${decoded[2] === 27 ? '1b' : '1c'}`
      const hash = utils.solidityKeccak256(
        ['bytes1', 'bytes1', 'address', 'string', 'address', 'address', 'address[]', 'address[]', 'uint256'],
        [
          '0x19', '0x00', _1484.address, 'I authorize the creation of an Identity on my behalf.',
          address, address, [snowflakeAddress, demoHelperAddress], [], decoded[5]
        ]
      )

      const prefixedHash = utils.solidityKeccak256(
        ['string', 'bytes32'],
        ['\x19Ethereum Signed Message:\n32', hash]
      )

      const publicKey = await EthCrypto.recoverPublicKey(signature, prefixedHash)
      return { address, publicKey: `04${publicKey}` }
    })

  return { address, publicKey }
}
